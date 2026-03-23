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

    def test_get_current_time(self, client):
        """Test time endpoint returns valid timestamp"""
        response = client.get("/api/time")
        assert response.status_code == 200
        data = response.get_json()
        assert "time" in data
        assert isinstance(data["time"], (int, float))


class TestUserRegistration:
    """Test user registration endpoint with mocked database"""
    
    @patch('app.api.db.session')
    @patch('app.api.user')
    def test_register_creates_new_user(self, mock_user_class, mock_db_session, client):
        """Test that register creates a new user"""
        # Mock user instance
        mock_user = Mock()
        mock_user.id = 1
        mock_user.username = "alva020201"
        mock_user.password = "password_hash"
        mock_user.alias = "Alva"
        mock_user.colour = "#000000"
        mock_user.personal_team_id = 2
        mock_user.created_at = "2026-01-01T00:00:00Z"
        mock_user_class.return_value = mock_user
        
        # Mock db.session methods
        mock_db_session.add = Mock()
        mock_db_session.commit = Mock()
        
        user_data = {
            "id": 1,
            "username": "alva020201",
            "password": "password_hash",
            "alias": "Alva",
            "colour": "#000000",
            "personal_team_id": 2,
            "created_at": "2026-01-01T00:00:00Z"
        }
        
        response = client.post("/api/register", json=user_data)
        data = response.get_json()
        
        assert response.status_code == 201
        assert "message" in data
        assert "user_id" in data
        assert data["message"] == "User created successfully"
        
        # Verify user was created with correct data
        mock_user_class.assert_called_once()
        mock_db_session.add.assert_called_once_with(mock_user)
        mock_db_session.commit.assert_called_once()

# register creates a new user if username is not taken
# register returns error message if username is already taken
# post request fails if required fields are missing
# password is hashed in the database
# post request fails if incorrect data types are provided

