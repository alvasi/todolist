import pytest
import json
from unittest.mock import MagicMock, patch
from datetime import date, datetime, timezone
from flask import Flask, session
from app.api import create_app

@pytest.fixture
def client():
    """Create test client with mocked database and session support"""
    app = create_app()
    app.config["TESTING"] = True
    app.config["SECRET_KEY"] = "test-secret-key"  # Required for sessions
    
    with app.test_client() as client:
        with app.app_context():  # Required for session access
            yield client


@pytest.fixture
def mock_db_connection():
    """Fixture to mock database connection"""
    with patch("app.api.get_db_connection") as mock_db:
        yield mock_db


@pytest.fixture
def authenticated_client(client, mock_db_connection):
    """Create an authenticated client with a logged-in user"""
    user_id = "123e4567-e89b-12d3-a456-426614174001"
    user_data = {
        "id": user_id,
        "username": "testuser",
        "alias": "Test User",
        "colour": "#000000"
    }
    
    # Mock the database query for login
    mock_conn = MagicMock()
    mock_cursor = MagicMock()
    mock_db_connection.return_value = mock_conn
    mock_conn.__enter__.return_value = mock_conn
    mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
    
    # Mock user record with password
    mock_cursor.fetchone.return_value = (
        user_id,  # id
        "testuser",  # username
        "Test User",  # alias
        "#000000",  # user_colour
        "password123"  # password_hash
    )
    
    # Perform login to set session
    login_data = {
        "username": "testuser",
        "password": "password123"
    }
    client.post("/login", json=login_data)
    
    # Reset mocks for the test
    mock_db_connection.reset_mock()
    
    return client, user_id


class TestTodoTask:
    """Test todo task endpoints"""

    # Helper methods
    def _setup_mock_cursor(self, mock_db_connection, fetchone_return=None, fetchall_return=None):
        """Helper to setup mock cursor"""
        mock_conn = MagicMock()
        mock_cursor = MagicMock()
        
        mock_db_connection.return_value = mock_conn
        mock_conn.__enter__.return_value = mock_conn
        mock_conn.cursor.return_value.__enter__.return_value = mock_cursor
        
        if fetchone_return is not None:
            mock_cursor.fetchone.return_value = fetchone_return
        if fetchall_return is not None:
            mock_cursor.fetchall.return_value = fetchall_return
            
        return mock_cursor

    # def _get_mock_task_record(self, task_id="123e4567-e89b-12d3-a456-426614174000", 
    #                           user_id="123e4567-e89b-12d3-a456-426614174001",
    #                           team_id="123e4567-e89b-12d3-a456-426614174002"):
    #     """Helper to create a mock task record"""
    #     return (
    #         task_id,  # id
    #         "Test Task",  # title
    #         "Task description",  # task_description
    #         date(2024, 12, 31),  # due_date
    #         "not_started",  # task_status
    #         "medium",  # task_priority
    #         False,  # is_private
    #         user_id,  # created_by_id
    #         user_id,  # updated_by_id
    #         team_id,  # team_id
    #         datetime(2024, 1, 1, tzinfo=timezone.utc),  # created_at
    #         datetime(2024, 1, 1, tzinfo=timezone.utc),  # updated_at
    #     )

    def test_create_task_adds_to_db_task_table(self, authenticated_client, mock_db_connection):
        """Test creating a new todo task adds to database"""
        client, user_id = authenticated_client

        task_data = {
            "title": "Complete sleekflow project",
            "task_description": "Finish the todo app project",
            "due_date": "2026-03-25",
            "task_status": "in_progress",
            "task_priority": "high",
            "is_private": False,
            "team_id": "123e4567-e89b-12d3-a456-426614174002"
        }

        task_id = "123e4567-e89b-12d3-a456-426614174000"
        
        mock_cursor = self._setup_mock_cursor(mock_db_connection)
        
        # Mock fetchone for INSERT RETURNING id
        mock_cursor.fetchone.return_value = (task_id,)
        
        response = client.post(
            "/todos",
            json=task_data,
            headers={"Authorization": "Bearer fake-token"}
        )
        
        data = response.get_json()
        
        assert response.status_code == 201
        assert data["message"] == "Task created successfully"
        assert data["task_id"] == task_id
        
        # Verify the INSERT query was executed correctly
        mock_cursor.execute.assert_called_once()
        call_args = mock_cursor.execute.call_args[0]
        query = call_args[0]
        params = call_args[1]
        
        assert "INSERT INTO tasks" in query
        assert params[0] == task_data["title"]
        assert params[1] == task_data["task_description"]
        assert params[2] == task_data["due_date"]
        assert params[3] == task_data["task_status"]
        assert params[4] == task_data["task_priority"]
        assert params[5] == task_data["is_private"]
        assert params[6] == user_id  # created_by_id
        assert params[7] == user_id  # updated_by_id
        assert params[8] == task_data["team_id"]