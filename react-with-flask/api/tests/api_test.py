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


class TestBasicRoutes:
    """Test basic application routes"""

    def test_index_route(self, client):
        """Test root endpoint returns Hello World"""
        response = client.get("/")
        assert response.status_code == 200
        assert b"Hello, World!" in response.data

class TestUserRegistration:
    """Test user registration endpoint"""

    def test_register_creates_new_user(self, client):
        user_data = {
            "username": "alva020201",
            "password_hash": "password123",
            "alias": "Alva",
            "user_colour": "#000000",
            "created_at": "2026-01-01T00:00:00Z",
        }

        response = client.post("/register", json=user_data)
        data = response.get_json()

        assert response.status_code == 201
        assert "message" in data
        assert "user_id" in data
        assert data["message"] == "User registered successfully"

# register creates a new user if username is not taken
# register returns error message if username is already taken
# post request fails if required fields are missing
# password is hashed in the database
# post request fails if incorrect data types are provided
