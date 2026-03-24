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
        mock_cursor.fetchone.side_effect = [
            (task_id,),    # Task created
            None           # Collaborator inserted (if fetchone is called)
        ]
        
        response = client.post(
            "/todos",
            json=task_data,
            headers={"Authorization": "Bearer fake-token"}
        )
        
        data = response.get_json()
        
        assert response.status_code == 201
        assert data["message"] == "Task created successfully"
        assert data["task_id"] == task_id
    
    def test_create_task_adds_creator_as_collaborator(self, authenticated_client, mock_db_connection):
        """Test creating a new task adds creator as owner collaborator"""
        client, user_id = authenticated_client
        
        task_data = {
            "title": "Complete project",
            "team_id": "123e4567-e89b-12d3-a456-426614174002"
        }
        
        task_id = "123e4567-e89b-12d3-a456-426614174000"
        
        mock_cursor = self._setup_mock_cursor(mock_db_connection)
        mock_cursor.fetchone.side_effect = [
            (task_id,),    # Task created
            None           # Collaborator inserted (no return needed)
        ]
        
        response = client.post("/todos", json=task_data)
        
        assert response.status_code == 201
        
        # Verify task was inserted
        task_insert_call = mock_cursor.execute.call_args_list[0]
        assert "INSERT INTO tasks" in task_insert_call[0][0]
        
        # Verify collaborator was added
        collaborator_insert_call = mock_cursor.execute.call_args_list[1]
        assert "INSERT INTO task_collaborators" in collaborator_insert_call[0][0]
        params = collaborator_insert_call[0][1]
        assert params[0] == task_id  # task_id
        assert params[1] == user_id  # user_id
        assert params[2] == 'owner'  # permission
        assert params[3] == user_id  # added_by_id

    def test_get_task_returns_tasks_where_user_is_collaborator(self, authenticated_client, mock_db_connection):
        """Test retrieving all tasks where user is a collaborator"""
        client, user_id = authenticated_client
        friend_id = "123e9843-e89b-12d3-a456-426614174002"
        # Mock tasks with collaborator data
        mock_tasks = [
            (
                "123e4567-e89b-12d3-a456-426614174000",
                "Task 1",
                "Description 1",
                date(2026, 3, 30),
                "in_progress",
                "high",
                False,
                user_id,
                user_id,
                "123e999-e89b-12d3-a456-426614174001",
                datetime(2026, 3, 25, tzinfo=timezone.utc),
                datetime(2026, 3, 25, tzinfo=timezone.utc),
                "owner"
            ),
            (
                "123e4567-e89b-12d3-a456-426614174001",
                "Task 2",
                "Description 2",
                date(2026, 4, 1),
                "not_started",
                "medium",
                True,
                friend_id,
                user_id,
                "123e999-e89b-12d3-a456-426614174001",
                datetime(2026, 3, 26, tzinfo=timezone.utc),
                datetime(2026, 3, 25, tzinfo=timezone.utc),
                "edit"
            )
        ]
        
        mock_cursor = self._setup_mock_cursor(mock_db_connection)
        mock_cursor.fetchall.return_value = mock_tasks
        
        # get all task_id where user_id is client user_id
        # retrieve tasks from for list of task_id
        response = client.get("/todos")
        data = response.get_json()
        
        assert response.status_code == 200
        assert len(data["tasks"]) == 2
        assert data["tasks"][0]["title"] == "Task 1"
        assert data["tasks"][0]["permission"] == "owner"
        assert data["tasks"][1]["title"] == "Task 2"
        assert data["tasks"][1]["permission"] == "edit"
        
        # Verify query joins with task_collaborators
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        assert "INNER JOIN task_collaborators" in query
        assert "WHERE tc.user_id = %s" in query
    
    def test_filter_by_task_status(self, authenticated_client, mock_db_connection):
        """Test filtering tasks by status"""
        client, user_id = authenticated_client
        
        # Mock tasks with different statuses
        mock_joined_results = [
            (
                "123e4567-e89b-12d3-a456-426614174000",  # id
                "Task 1",                                 # title
                "Description 1",                          # description
                date(2026, 3, 30),                        # due_date
                "in_progress",                            # status
                "high",                                   # priority
                False,                                    # is_private
                user_id,
                user_id,
                "team-1",                                 # team_id
                datetime(2026, 3, 25, tzinfo=timezone.utc),  # created_at
                datetime(2026, 3, 25, tzinfo=timezone.utc),  # updated_at
                "owner"                                   # permission
            ),
            (
                "123e4567-e89b-12d3-a456-426614174001",  # id
                "Task 2",                                 # title
                "Description 2",                          # description
                date(2026, 4, 1),                         # due_date
                "not_started",                            # status
                "medium",                                 # priority
                False,                                    # is_private
                user_id,
                user_id,
                "team-1",                                 # team_id
                datetime(2026, 3, 26, tzinfo=timezone.utc),  # created_at
                datetime(2026, 3, 26, tzinfo=timezone.utc),  # updated_at
                "owner"                                    # permission
            ),
            (
                "123e4567-e89b-12d3-a456-426614174002",  # id
                "Task 3",                                 # title
                "Description 3",                          # description
                date(2026, 4, 15),                        # due_date
                "completed",                              # status
                "low",                                    # priority
                True,                                     # is_private
                user_id,
                user_id,
                "team-1",                                 # team_id
                datetime(2026, 3, 27, tzinfo=timezone.utc),  # created_at
                datetime(2026, 3, 27, tzinfo=timezone.utc),  # updated_at
                "owner"                                    # permission
            )
        ]
        
        mock_cursor = self._setup_mock_cursor(mock_db_connection)
        
        response = client.get("/todos?status=in_progress")
        
        # Verify the query includes status filter
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]
        
        assert "AND t.task_status = %s" in query
        assert "in_progress" in params
        
        # Set the mock return value after verifying the query
        # Filter the mock results to only return tasks with the requested status
        filtered_results = [task for task in mock_joined_results if task[4] == "in_progress"]
        mock_cursor.fetchall.return_value = filtered_results
        
        # Make the actual request (or re-execute if needed)
        response = client.get("/todos?status=in_progress")
        data = response.get_json()
        
        assert response.status_code == 200
        assert len(data["tasks"]) == 1
        assert data["tasks"][0]["title"] == "Task 1"
        assert data["tasks"][0]["task_status"] == "in_progress"

    def test_filter_by_task_priority(self, authenticated_client, mock_db_connection):
        """Testing filtering tasks by priority"""
        client, user_id = authenticated_client
        mock_joined_results = [
            (
                "123e4567-e89b-12d3-a456-426614174000",  # id
                "Task 1",                                 # title
                "Description 1",                          # description
                date(2026, 3, 30),                        # due_date
                "in_progress",                            # status
                "high",                                   # priority
                False,                                    # is_private
                user_id,
                user_id,
                "team-1",                                 # team_id
                datetime(2026, 3, 25, tzinfo=timezone.utc),  # created_at
                datetime(2026, 3, 25, tzinfo=timezone.utc),  # updated_at
                "owner"                                   # permission
            ),
            (
                "123e4567-e89b-12d3-a456-426614174001",  # id
                "Task 2",                                 # title
                "Description 2",                          # description
                date(2026, 4, 1),                         # due_date
                "not_started",                            # status
                "medium",                                 # priority
                False,                                    # is_private
                user_id,
                user_id,
                "team-1",                                 # team_id
                datetime(2026, 3, 26, tzinfo=timezone.utc),  # created_at
                datetime(2026, 3, 26, tzinfo=timezone.utc),  # updated_at
                "owner"                                    # permission
            ),
            (
                "123e4567-e89b-12d3-a456-426614174002",  # id
                "Task 3",                                 # title
                "Description 3",                          # description
                date(2026, 4, 15),                        # due_date
                "completed",                              # status
                "low",                                    # priority
                True,                                     # is_private
                user_id,
                user_id,
                "team-1",                                 # team_id
                datetime(2026, 3, 27, tzinfo=timezone.utc),  # created_at
                datetime(2026, 3, 27, tzinfo=timezone.utc),  # updated_at
                "owner"                                    # permission
            )
        ]
        mock_cursor = self._setup_mock_cursor(mock_db_connection)
        
        response = client.get("/todos?priority=medium")
        
        # Verify the query includes status filter
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]
        
        assert "AND t.task_priority = %s" in query
        assert "medium" in params
        
        # Set the mock return value after verifying the query
        # Filter the mock results to only return tasks with the requested status
        filtered_results = [task for task in mock_joined_results if task[5] == "medium"]
        mock_cursor.fetchall.return_value = filtered_results
        
        # Make the actual request (or re-execute if needed)
        response = client.get("/todos?priority=medium")
        data = response.get_json()
        
        assert response.status_code == 200
        assert len(data["tasks"]) == 1
        assert data["tasks"][0]["title"] == "Task 2"
        assert data["tasks"][0]["task_priority"] == "medium"

    def test_filter_by_team(self, authenticated_client, mock_db_connection):
        """Testing filtering tasks by team"""
        client, user_id = authenticated_client
        mock_joined_results = [
            (
                "123e4567-e89b-12d3-a456-426614174000",  # id
                "Task 1",                                 # title
                "Description 1",                          # description
                date(2026, 3, 30),                        # due_date
                "in_progress",                            # status
                "high",                                   # priority
                False,                                    # is_private
                user_id,
                user_id,
                "team-1",                                 # team_id
                datetime(2026, 3, 25, tzinfo=timezone.utc),  # created_at
                datetime(2026, 3, 25, tzinfo=timezone.utc),  # updated_at
                "owner"                                   # permission
            ),
            (
                "123e4567-e89b-12d3-a456-426614174001",  # id
                "Task 2",                                 # title
                "Description 2",                          # description
                date(2026, 4, 1),                         # due_date
                "not_started",                            # status
                "medium",                                 # priority
                False,                                    # is_private
                user_id,
                user_id,
                "team-3",                                 # team_id
                datetime(2026, 3, 26, tzinfo=timezone.utc),  # created_at
                datetime(2026, 3, 26, tzinfo=timezone.utc),  # updated_at
                "owner"                                    # permission
            ),
            (
                "123e4567-e89b-12d3-a456-426614174002",  # id
                "Task 3",                                 # title
                "Description 3",                          # description
                date(2026, 4, 15),                        # due_date
                "completed",                              # status
                "low",                                    # priority
                True,                                     # is_private
                user_id,
                user_id,
                "team-2",                                 # team_id
                datetime(2026, 3, 27, tzinfo=timezone.utc),  # created_at
                datetime(2026, 3, 27, tzinfo=timezone.utc),  # updated_at
                "owner"                                    # permission
            )
        ]
        mock_cursor = self._setup_mock_cursor(mock_db_connection)
        
        response = client.get("/todos?team_id=team-2")
        
        # Verify the query includes status filter
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]
        
        assert "AND t.team_id = %s" in query
        assert "team-2" in params
        
        # Set the mock return value after verifying the query
        # Filter the mock results to only return tasks with the requested status
        filtered_results = [task for task in mock_joined_results if task[9] == "team-2"]
        mock_cursor.fetchall.return_value = filtered_results
        
        # Make the actual request (or re-execute if needed)
        response = client.get("/todos?team_id=team-2")
        data = response.get_json()
        
        assert response.status_code == 200
        assert len(data["tasks"]) == 1
        assert data["tasks"][0]["title"] == "Task 3"
        assert data["tasks"][0]["team_id"] == "team-2"

                