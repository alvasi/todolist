import time
from flask import Flask, request, jsonify, session
import psycopg
from psycopg import OperationalError
import os

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

    @app.route("/")
    def index():
        return "Hello, World!"

    @app.route("/register", methods=["POST"])
    def register():
        if request.method == "POST":

            # Extract user registration data from form
            username = request.form.get("username")
            password = request.form.get("password")
            alias = request.form.get("alias")
            colour = request.form.get("colour")

            # Create a new user object
            new_user = {
                "username": username,
                "password_hash": password,
                "alias": alias,
                "user_colour": colour,
                "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime()),
            }

            # Save the new user to the database
            db_connection = get_db_connection()
            if db_connection is None:
                return {"message": "Database connection failed"}, 500
            try:
                with db_connection.cursor() as cursor:
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
            except Exception as e:
                print(f"Error saving user to database: {e}")
                return {"message": "Failed to register user"}, 500

        return {"message": "User registered successfully"}, 201

    return app
