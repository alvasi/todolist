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
    
    # Session configuration
    app.config['SECRET_KEY'] = os.environ.get('SECRET_KEY', 'dev-secret-key-change-in-production')
    app.config['SESSION_COOKIE_SECURE'] = False  # Set to True in production with HTTPS
    app.config['SESSION_COOKIE_HTTPONLY'] = True
    app.config['SESSION_COOKIE_SAMESITE'] = 'Lax'
    app.config['PERMANENT_SESSION_LIFETIME'] = 86400  # 24 hours in seconds

    CORS(
        app,
        origins=["http://localhost:5173", "http://0.0.0.0:5173"],
        supports_credentials=True,
        methods=["GET", "POST", "PUT", "DELETE", "PATCH"],
        allow_headers=["Content-Type", "Authorization"],
    )

    def get_current_user_id():
        """Get current user ID from session"""
        return session.get('user_id')
    
    def create_personal_team(user_id):
        db_connection = get_db_connection()
        if db_connection is None:
            return jsonify({"message": "Database connection failed"}), 500
        new_team = {
            "team_name": "Personal",
            "team_description": "For your eyes only",
            "is_personal": True,
            "created_by_id": user_id,
            "created_at": time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        }
        try:
            with db_connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO teams (team_name, team_description, is_personal, created_by_id, created_at)
                    VALUES(%s,%s,%s,%s,%s)
                    RETURNING id
                    """
                    (
                        new_team["team_name"],
                        new_team["team_description"],
                        new_team["is_personal"],
                        new_team["created_by_id"],
                        new_team["created_at"]
                    ),
                )
                db_connection.commit()
                team_id = cursor.fetchone()[0]
                return team_id

        except Exception as e:
            print(f"Error in register: {e}")
            return jsonify({"message": "Failed to register user"}), 500
        finally:
            db_connection.close()

    def set_current_user(user_id, username, alias, user_colour):
        """Set current user in session"""
        session['user_id'] = user_id
        session['username'] = username
        session['alias'] = alias
        session['user_colour'] = user_colour
        session.permanent = True  # Make session permanent

    def clear_current_user():
        """Clear current user from session"""
        session.clear()

    def login_required(f):
        """Decorator to require login for routes"""
        from functools import wraps
        
        @wraps(f)
        def decorated_function(*args, **kwargs):
            if not get_current_user_id():
                return jsonify({"message": "Authentication required"}), 401
            return f(*args, **kwargs)
        return decorated_function

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
                team_id = create_personal_team(user_id)

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
                if password != password_hash:
                    return jsonify({"message": "Invalid username or password"}), 401

                set_current_user(user_id=user_id, username=db_username,alias=alias,user_colour=user_colour)
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
    
    @app.route("/todos", methods=["GET"])
    def get_all_tasks():
        """Get all tasks where user is creator OR collaborator"""
        user_id = get_current_user_id()
        db_connection = get_db_connection()
        
        try:
            with db_connection.cursor() as cursor:
                cursor.execute(
                    """
                    SELECT DISTINCT t.id, t.title, t.task_description, t.due_date, 
                        t.task_status, t.task_priority, t.is_private, 
                        t.created_at, t.updated_at, tc.permission
                    FROM tasks t
                    INNER JOIN task_collaborators tc ON t.id = tc.task_id
                    WHERE tc.user_id = %s
                    ORDER BY t.created_at DESC
                    """,
                    (user_id,)
                )
                tasks = cursor.fetchall()
                
                return jsonify({
                    "tasks": [
                        {
                            "id": task[0],
                            "title": task[1],
                            "description": task[2],
                            "due_date": task[3].isoformat() if task[3] else None,
                            "task_status": task[4],
                            "task_priority": task[5],
                            "is_private": task[6],
                            "created_by_id": task[7],
                            "updated_by_id": task[8],
                            "team_id": task[9],
                            "created_at": task[10].isoformat() if task[10] else None,
                            "updated_at": task[11].isoformat() if task[8] else None,
                            "permission": task[12]  # Add permission from collaborator table
                        }
                        for task in tasks
                    ]
                }), 200
        except Exception as e:
            return jsonify({"message": "Failed to fetch tasks"}), 500
        finally:
            db_connection.close()

    @app.route("/todos", methods=["POST"])
    @login_required
    def create_task():
        """Create a new task"""
        data = request.get_json()
        title = data.get("title")
        task_description = data.get("task_description")
        due_date = data.get("due_date")
        task_status = data.get("task_status")
        task_priority = data.get("task_priority")
        is_private = data.get("is_private")
        team_id = data.get("team_id")
        
        user_id = get_current_user_id()
        created_by_id = user_id
        updated_by_id = user_id
        created_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        updated_at = time.strftime("%Y-%m-%dT%H:%M:%SZ", time.gmtime())
        db_connection = get_db_connection()
        
        try:
            with db_connection.cursor() as cursor:
                cursor.execute(
                    """
                    INSERT INTO tasks (title, task_description, due_date, task_status, task_priority, 
                                    is_private, created_by_id, updated_by_id, team_id, created_at, updated_at)
                    VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                    RETURNING id
                    """,
                    (
                        title,
                        task_description,
                        due_date,
                        task_status,
                        task_priority,
                        is_private,
                        created_by_id,
                        updated_by_id,
                        team_id,
                        created_at,
                        updated_at
                    )
                )
                db_connection.commit()
                task_id = cursor.fetchone()[0]

                # Add creator as owner collaborator
                cursor.execute(
                    """
                    INSERT INTO task_collaborators (task_id, user_id, permission, added_by_id)
                    VALUES (%s, %s, %s, %s)
                    """,
                    (task_id, user_id, 'owner', user_id)
                )
                
                return jsonify({
                    "message": "Task created successfully",
                    "task_id": task_id
                }), 201
        except Exception as e:
            return jsonify({"message": "Failed to create task"}), 500
        finally:
            db_connection.close()

    @app.route("/static/<path:filename>")
    def serve_static(filename):
        return send_from_directory("static", filename)

    return app
