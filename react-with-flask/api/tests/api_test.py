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

# post request fails if required fields are missing
# password is hashed in the database
# post request fails if incorrect data types are provided
