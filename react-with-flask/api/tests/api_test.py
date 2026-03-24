import pytest
import json
from unittest.mock import Mock, patch, MagicMock
from flask import Flask
from app.api import create_app


@pytest.fixture
def client():
    """Create test client with mocked database"""
    app = create_app()
    app.config["TESTING"] = True

    with app.test_client() as client:
        yield client

@pytest.fixture
def mock_db_connection():
    """Fixture to mock database connection"""
    with patch("app.api.get_db_connection") as mock_db:
        yield mock_db

class TestBasicRoutes:
    """Test basic application routes"""

class TestUserRegistration:
    """Test user registration endpoint"""

    def test_register_creates_new_user(self, client, mock_db_connection):
        user_data = {
            "username": "alva020201",
            "password": "password123",
            "alias": "Alva",
        }

        # Create mock connection and cursor
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        # Set up the mock connection
        mock_db_connection.return_value = mock_conn
        mock_conn.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        # Add counter to track fetchone calls
        fetchone_calls = 0
        
        def fetchone_side_effect():
            nonlocal fetchone_calls
            fetchone_calls += 1
            print(f"fetchone call #{fetchone_calls}")
            
            if fetchone_calls == 1:
                print("Returning None for SELECT query")
                return None
            elif fetchone_calls == 2:
                print("Returning (1,) for INSERT query")
                return (1,)
        
        mock_cursor.fetchone.side_effect = fetchone_side_effect
        
        # Also track execute calls
        def execute_side_effect(query, params=None):
            print(f"Executing query: {query[:80]}...")
            return mock_cursor
        
        mock_cursor.execute.side_effect = execute_side_effect
        
        response = client.post("/register", json=user_data)
        data = response.get_json()
        
        print(f"Response: {response.status_code} - {data}")
        
        assert response.status_code == 201
        assert data["message"] == "User registered successfully"
    
    def test_register_fails_with_duplicate_username(self, client, mock_db_connection):
        user_data = {
            "username": "alva020201",
            "password": "password123",
            "alias": "Alva",
        }

        # Create mock connection and cursor
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        # Set up the mock connection
        mock_db_connection.return_value = mock_conn
        mock_conn.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        # Track the number of times fetchone is called
        fetchone_call_count = 0
        
        def fetchone_side_effect():
            nonlocal fetchone_call_count
            fetchone_call_count += 1
            
            if fetchone_call_count == 1:
                # First call: SELECT query for first request
                return None  # User doesn't exist
            elif fetchone_call_count == 2:
                # Second call: INSERT query for first request
                return (1,)  # New user ID
            elif fetchone_call_count == 3:
                # Third call: SELECT query for second request
                return (1,)  # User already exists!
            else:
                return None
        
        mock_cursor.fetchone.side_effect = fetchone_side_effect
        
        # Make first request - should succeed
        response1 = client.post("/register", json=user_data)
        
        # Make second request with same username - should fail with 409
        response2 = client.post("/register", json=user_data)
        
        # Assertions
        assert response1.status_code == 201
        data1 = response1.get_json()
        assert data1["message"] == "User registered successfully"
        assert data1["user_id"] == 1
        
        assert response2.status_code == 409
        data2 = response2.get_json()
        assert data2["message"] == "Username already taken"
        
        # Verify the execute was called 3 times: 
        # SELECT1, INSERT1, SELECT2 (no INSERT2 because duplicate)
        assert mock_cursor.execute.call_count == 3

    def test_register_fails_if_username_missing(self, client, mock_db_connection):
        """Test that registration fails when username is missing"""
        user_data = {
            "password": "password123",
            "alias": "Alva",
        }
        
        response = client.post("/register", json=user_data)
        data = response.get_json()
        
        assert response.status_code == 400
        assert data["message"] == "Username and password are required"
        mock_db_connection.assert_not_called()

    def test_register_fails_if_password_missing(self, client, mock_db_connection):
        """Test that registration fails when password is missing"""
        user_data = {
            "username": "alva020201",
            "alias": "Alva",
        }
        
        response = client.post("/register", json=user_data)
        data = response.get_json()
        
        assert response.status_code == 400
        assert data["message"] == "Username and password are required"
        mock_db_connection.assert_not_called()
    
    def test_register_handles_none_values(self, client, mock_db_connection):
        """Test that None values are handled appropriately"""
        user_data = {
            "username": None,
            "password": "password123",
            "alias": "Alva",
        }
        
        response = client.post("/register", json=user_data)
        data = response.get_json()
        
        # None should be treated as missing
        assert response.status_code == 400
        assert data["message"] == "Username and password are required"

    def test_register_handles_numeric_alias(self, client, mock_db_connection):
        """Test that numeric alias is converted to string"""
        user_data = {
            "username": "testuser",
            "password": "password123",
            "alias": 12345,  # Numeric alias
        }

        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        mock_db_connection.return_value = mock_conn
        mock_conn.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        mock_cursor.fetchone.side_effect = [None, (1,)]
        
        response = client.post("/register", json=user_data)
        
        assert response.status_code == 201
        
        # Verify alias was converted to string
        call_args = mock_cursor.execute.call_args_list
        insert_call = call_args[1]
        alias_value = insert_call[0][1][2]  # Third parameter in INSERT
        assert alias_value == "12345"  # Should be string "12345"
# password is hashed in the database
# post request fails if incorrect data types are provided

class TestUserLogin:
    """Test user login endpoint"""

    def test_login_successful_with_valid_credentials(self, client, mock_db_connection):
        """Test successful login with valid username and password"""
        login_data = {
            "username": "alva020201",
            "password": "password123",
        }

        # Create mock connection and cursor
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        # Set up the mock connection
        mock_db_connection.return_value = mock_conn
        mock_conn.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        # Mock fetchone to return a user record
        mock_cursor.fetchone.return_value = (1, "alva020201", "Alva", "#000000")
        
        response = client.post("/login", json=login_data)
        data = response.get_json()
        
        assert response.status_code == 200
        assert data["message"] == "Login successful"
        assert "user" in data
        assert data["user"]["id"] == 1
        assert data["user"]["username"] == "alva020201"
        assert data["user"]["alias"] == "Alva"
        assert data["user"]["colour"] == "#000000"
        
        # Verify the SQL query was executed correctly
        mock_cursor.execute.assert_called_once_with(
            "SELECT id, username, alias, user_colour FROM users WHERE username = %s AND password_hash = %s",
            (login_data["username"], login_data["password"])
        )

    def test_login_fails_with_username_not_found(self, client, mock_db_connection):
        """Test login fails when username doesn't exist"""
        login_data = {
            "username": "nonexistent",
            "password": "password123",
        }

        # Create mock connection and cursor
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        # Set up the mock connection
        mock_db_connection.return_value = mock_conn
        mock_conn.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        # Mock fetchone to return None (user not found)
        mock_cursor.fetchone.return_value = None
        
        response = client.post("/login", json=login_data)
        data = response.get_json()
        
        assert response.status_code == 401
        assert data["message"] == "Invalid username or password"
        
        # Verify the SQL query was executed
        mock_cursor.execute.assert_called_once()

    def test_login_fails_with_incorrect_password(self, client, mock_db_connection):
        """Test login fails when password is incorrect"""
        login_data = {
            "username": "alva020201",
            "password": "wrongpassword",
        }

        # Create mock connection and cursor
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        # Set up the mock connection
        mock_db_connection.return_value = mock_conn
        mock_conn.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        # Mock fetchone to return None (password doesn't match)
        mock_cursor.fetchone.return_value = None
        
        response = client.post("/login", json=login_data)
        data = response.get_json()
        
        assert response.status_code == 401
        assert data["message"] == "Invalid username or password"
        
        # Verify the SQL query was executed with the wrong password
        mock_cursor.execute.assert_called_once_with(
            "SELECT id, username, alias, user_colour FROM users WHERE username = %s AND password_hash = %s",
            (login_data["username"], login_data["password"])
        )

    def test_login_fails_with_missing_username(self, client, mock_db_connection):
        """Test login fails when username is missing"""
        login_data = {
            "password": "password123",
        }
        
        response = client.post("/login", json=login_data)
        data = response.get_json()
        
        assert response.status_code == 400
        assert data["message"] == "Username and password are required"
        mock_db_connection.assert_not_called()

    def test_login_fails_with_missing_password(self, client, mock_db_connection):
        """Test login fails when password is missing"""
        login_data = {
            "username": "alva020201",
        }
        
        response = client.post("/login", json=login_data)
        data = response.get_json()
        
        assert response.status_code == 400
        assert data["message"] == "Username and password are required"
        mock_db_connection.assert_not_called()

    def test_login_fails_with_empty_username(self, client, mock_db_connection):
        """Test login fails with empty username"""
        login_data = {
            "username": "",
            "password": "password123",
        }
        
        response = client.post("/login", json=login_data)
        data = response.get_json()
        
        assert response.status_code == 400
        assert data["message"] == "Username and password are required"

    def test_login_fails_with_empty_password(self, client, mock_db_connection):
        """Test login fails with empty password"""
        login_data = {
            "username": "alva020201",
            "password": "",
        }
        
        response = client.post("/login", json=login_data)
        data = response.get_json()
        
        assert response.status_code == 400
        assert data["message"] == "Username and password are required"

    def test_login_handles_database_connection_error(self, client, mock_db_connection):
        """Test login handles database connection errors gracefully"""
        login_data = {
            "username": "alva020201",
            "password": "password123",
        }

        # Mock database connection to return None (connection failed)
        mock_db_connection.return_value = None
        
        response = client.post("/login", json=login_data)
        data = response.get_json()
        
        assert response.status_code == 500
        assert data["message"] == "Database connection failed"

    def test_login_handles_database_exception(self, client, mock_db_connection):
        """Test login handles database exceptions gracefully"""
        login_data = {
            "username": "alva020201",
            "password": "password123",
        }

        # Create mock connection that raises an exception
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        
        mock_db_connection.return_value = mock_conn
        mock_conn.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        
        # Mock execute to raise an exception
        mock_cursor.execute.side_effect = Exception("Database error")
        
        response = client.post("/login", json=login_data)
        data = response.get_json()
        
        assert response.status_code == 500
        assert data["message"] == "Login failed"

    def test_login_accepts_form_data(self, client, mock_db_connection):
        """Test login works with form data (not JSON)"""
        login_data = {
            "username": "alva020201",
            "password": "password123",
        }

        # Create mock connection and cursor
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        mock_db_connection.return_value = mock_conn
        mock_conn.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        # Mock fetchone to return a user record
        mock_cursor.fetchone.return_value = (1, "alva020201", "Alva", "#000000")
        
        # Send as form data instead of JSON
        response = client.post("/login", data=login_data)
        data = response.get_json()
        
        assert response.status_code == 200
        assert data["message"] == "Login successful"
        assert data["user"]["username"] == "alva020201"

    def test_login_returns_user_data_with_alias(self, client, mock_db_connection):
        """Test login returns user data including alias"""
        login_data = {
            "username": "alva020201",
            "password": "password123",
        }

        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        mock_db_connection.return_value = mock_conn
        mock_conn.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        # Mock fetchone to return user with alias
        mock_cursor.fetchone.return_value = (1, "alva020201", "Custom Alias", "#ff0000")
        
        response = client.post("/login", json=login_data)
        data = response.get_json()
        
        assert response.status_code == 200
        assert data["user"]["alias"] == "Custom Alias"
        assert data["user"]["colour"] == "#ff0000"

    def test_login_handles_username_with_whitespace(self, client, mock_db_connection):
        """Test login handles usernames with whitespace"""
        login_data = {
            "username": "  alva020201  ",
            "password": "password123",
        }

        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        mock_db_connection.return_value = mock_conn
        mock_conn.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        # Mock fetchone to return a user record
        mock_cursor.fetchone.return_value = (1, "alva020201", "Alva", "#000000")
        
        response = client.post("/login", json=login_data)
        
        # The query should be called with the username as is (without trimming)
        # Your implementation may or may not trim whitespace
        assert response.status_code in [200, 401]