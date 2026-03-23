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

    def test_index_route(self, client):
        """Test root endpoint returns Hello World"""
        response = client.get("/")
        assert response.status_code == 200
        assert b"Hello, World!" in response.data

class TestUserRegistration:
    """Test user registration endpoint"""

    def test_register_creates_new_user(self, client, mock_db_connection):
        user_data = {
            "username": "alva020201",
            "password_hash": "password123",
            "alias": "Alva",
            "user_colour": "#000000",
            "created_at": "2026-01-01T00:00:00Z",
        }

        # Create mock connection and cursor
        mock_conn = MagicMock()
        mock_cursor = MagicMock()

        # Set up the mock connection
        mock_db_connection.return_value = mock_conn
        mock_conn.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor

        # Mock fetchone to return a tuple with the new user's id (cursor.fetchone()[0])
        mock_cursor.fetchone.return_value = (1,)
        
        response = client.post("/register", json=user_data)
        data = response.get_json()
        
        assert response.status_code == 201
        assert "message" in data
        assert "user_id" in data
        assert data["message"] == "User registered successfully"

# register returns error message if username is already taken
# post request fails if required fields are missing
# password is hashed in the database
# post request fails if incorrect data types are provided
