import time
from flask import Flask, request, jsonify, session, send_from_directory
from flask_cors import CORS
import psycopg
from psycopg import OperationalError
from pathlib import Path
from dotenv import load_dotenv
import os

env_path = Path("/Users/alvasi/Desktop/Projects/todolist/react-with-flask/.env")
load_dotenv(dotenv_path=env_path)


def get_db_connection():
    """Establish a connection to the PostgreSQL database"""
    db_url = os.environ.get("DATABASE_URL")
    try:
        conn = psycopg.connect(db_url)
        return conn
    except OperationalError as e:
        print(f"Database connection failed: {e}")
        return None


def create_app():
    app = Flask(__name__)
    # CORS(app)
    CORS(
        app,
        origins=["http://localhost:5173", "http://0.0.0.0:5173"],
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
        allow_headers=["Content-Type", "Authorization"],
    )

    @app.route("/")
    def index():
        return send_from_directory("templates", "index.html")

    @app.route("/register", methods=["POST"])
    def register():
        # Handle both JSON and form data
        if request.is_json:
            data = request.get_json()
            username = data.get("username")
            password = data.get("password")
            alias = data.get("alias")
        else:
            username = request.form.get("username")
            password = request.form.get("password")
            alias = request.form.get("alias")

        # Validate required fields
        if not username or not password:
            return jsonify({"message": "Username and password are required"}), 400

        if username is not None:
            username = str(username)
        if password is not None:
            password = str(password)
        if alias is not None:
            alias = str(alias)

        # Create a new user object
        colour = "#000000"
        new_user = {
            "username": username,
            "password_hash": password,
            "alias": alias,
            "user_colour": colour,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
        }

        db_connection = get_db_connection()
        if db_connection is None:
            return jsonify({"message": "Database connection failed"}), 500

        try:
            with db_connection.cursor() as cursor:
                # Check if username already exists - FIXED: No RETURNING id
                cursor.execute(
                    "SELECT id FROM users WHERE username = %s", (new_user["username"],)
                )
                existing_user = cursor.fetchone()

                if existing_user:
                    # User exists, return 409
                    return jsonify({"message": "Username already taken"}), 409

                # User doesn't exist, create them
                cursor.execute(
                    """
                    INSERT INTO users (username, password_hash, alias, user_colour, created_at)
                    VALUES (%s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        new_user["username"],
                        new_user["password_hash"],
                        new_user["alias"],
                        new_user["user_colour"],
                        new_user["created_at"],
                    ),
                )
                db_connection.commit()
                user_id = cursor.fetchone()[0]

                return (
                    jsonify(
                        {"message": "User registered successfully", "user_id": user_id}
                    ),
                    201,
                )

        except Exception as e:
            print(f"Error in register: {e}")
            return jsonify({"message": "Failed to register user"}), 500
        finally:
            db_connection.close()

    @app.route("/login", methods=["POST"])
    def login():
        if request.is_json:
            data = request.get_json()
            username = data.get("username")
            password = data.get("password")
        else:
            username = request.form.get("username")
            password = request.form.get("password")

        if not username or not password:
            return jsonify({"message": "Username and password are required"}), 400

        if username is not None:
            username = str(username).strip()
        if password is not None:
            password = str(password)

        db_connection = get_db_connection()
        if db_connection is None:
            return jsonify({"message": "Database connection failed"}), 500

        try:
            with db_connection.cursor() as cursor:
                cursor.execute(
                    "SELECT id, username, alias, user_colour, password_hash FROM users WHERE username = %s",
                    (username,),  # Note the comma to make it a tuple
                )
                db_user = cursor.fetchone()

                # Check if user exists
                if not db_user:
                    return jsonify({"message": "Invalid username or password"}), 401

                # Extract user data
                user_id = db_user[0]
                db_username = db_user[1]
                alias = db_user[2]
                user_colour = db_user[3]
                password_hash = db_user[4]

                # Verify password
                # In production, you should hash passwords and use a proper verification method
                # For now, compare directly (but this is insecure!)
                if password != password_hash:
                    return jsonify({"message": "Invalid username or password"}), 401

                # Login successful - return user data (excluding password)
                return (
                    jsonify(
                        {
                            "message": "Login successful",
                            "user": {
                                "id": user_id,
                                "username": db_username,
                                "alias": alias,
                                "colour": user_colour,
                            },
                        }
                    ),
                    200,
                )

        except Exception as e:
            print(f"Error in login: {e}")
            return jsonify({"message": "Login failed"}), 500
        finally:
            db_connection.close()

    @app.route("/static/<path:filename>")
    def serve_static(filename):
        return send_from_directory("static", filename)

    return app
