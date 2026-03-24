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
        """Test that the SQL query correctly joins with task_collaborators"""
        client, user_id = authenticated_client
        
        # Setup mock - we don't care about the actual data
        mock_cursor = self._setup_mock_cursor(mock_db_connection)
        mock_cursor.fetchall.return_value = []  # Empty return, we don't test data here
        
        response = client.get("/todos")
        
        # We're testing the QUERY, not the data
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]
        
        # Verify the SQL structure
        assert "INNER JOIN task_collaborators" in query
        assert "WHERE tc.user_id = %s" in query
        assert params[0] == user_id
        
        # Verify response structure
        assert response.status_code == 200
        assert "tasks" in response.get_json()

    def test_filter_by_task_status(self, authenticated_client, mock_db_connection):
        """Test that status filter is correctly added to SQL query"""
        client, user_id = authenticated_client
        
        mock_cursor = self._setup_mock_cursor(mock_db_connection)
        mock_cursor.fetchall.return_value = []  # Empty return
        
        response = client.get("/todos?status=in_progress")
        
        # Verify the query includes the status filter
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]
        
        assert "AND t.task_status = %s" in query
        assert "in_progress" in params
        assert len(params) >= 2  # user_id + status
        assert params[0] == user_id
        assert params[1] == "in_progress"
        
        assert response.status_code == 200

    def test_filter_by_task_priority(self, authenticated_client, mock_db_connection):
        """Test that priority filter is correctly added to SQL query"""
        client, user_id = authenticated_client
        
        mock_cursor = self._setup_mock_cursor(mock_db_connection)
        mock_cursor.fetchall.return_value = []
        
        response = client.get("/todos?priority=high")
        
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]
        
        assert "AND t.task_priority = %s" in query
        assert "high" in params
        assert response.status_code == 200

    def test_filter_by_team(self, authenticated_client, mock_db_connection):
        """Test that team filter is correctly added to SQL query"""
        client, user_id = authenticated_client
        team_id = "team-2"
        
        mock_cursor = self._setup_mock_cursor(mock_db_connection)
        mock_cursor.fetchall.return_value = []
        
        response = client.get(f"/todos?team_id={team_id}")
        
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]
        
        assert "AND t.team_id = %s" in query
        assert team_id in params
        assert response.status_code == 200

    def test_filter_by_due_date_from(self, authenticated_client, mock_db_connection):
        """Test that due_date_from filter is correctly added to SQL query"""
        client, user_id = authenticated_client
        
        mock_cursor = self._setup_mock_cursor(mock_db_connection)
        mock_cursor.fetchall.return_value = []
        
        response = client.get("/todos?due_date_from=2026-03-01")
        
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]
        
        assert "AND t.due_date >= %s" in query
        assert "2026-03-01" in params
        assert response.status_code == 200

    def test_filter_by_due_date_to(self, authenticated_client, mock_db_connection):
        """Test that due_date_to filter is correctly added to SQL query"""
        client, user_id = authenticated_client
        
        mock_cursor = self._setup_mock_cursor(mock_db_connection)
        mock_cursor.fetchall.return_value = []
        
        response = client.get("/todos?due_date_to=2026-06-01")
        
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]
        
        assert "AND t.due_date <= %s" in query
        assert "2026-06-01" in params
        assert response.status_code == 200

    def test_filter_by_due_date_range(self, authenticated_client, mock_db_connection):
        """Test that both due_date filters are correctly added to SQL query"""
        client, user_id = authenticated_client
        
        mock_cursor = self._setup_mock_cursor(mock_db_connection)
        mock_cursor.fetchall.return_value = []
        
        response = client.get("/todos?due_date_from=2026-03-01&due_date_to=2026-09-01")
        
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]
        
        assert "AND t.due_date >= %s" in query
        assert "AND t.due_date <= %s" in query
        assert "2026-03-01" in params
        assert "2026-09-01" in params
        assert response.status_code == 200

    def test_multiple_filters_combined(self, authenticated_client, mock_db_connection):
        """Test that multiple filters are correctly combined in SQL query"""
        client, user_id = authenticated_client
        
        mock_cursor = self._setup_mock_cursor(mock_db_connection)
        mock_cursor.fetchall.return_value = []
        
        response = client.get("/todos?status=in_progress&priority=high&team_id=team-2&due_date_from=2026-03-01")
        
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]
        
        assert "AND t.task_status = %s" in query
        assert "AND t.task_priority = %s" in query
        assert "AND t.team_id = %s" in query
        assert "AND t.due_date >= %s" in query
        
        assert "in_progress" in params
        assert "high" in params
        assert "team-2" in params
        assert "2026-03-01" in params
        assert response.status_code == 200

    def test_sort_task_by_descending_creation_date_on_default(self, authenticated_client, mock_db_connection):
        """Test that the endpoint includes the correct ORDER BY clause in the SQL query"""
        client, user_id = authenticated_client
        
        # Setup mock cursor
        mock_cursor = self._setup_mock_cursor(mock_db_connection)
        mock_cursor.fetchall.return_value = []  # Return empty list, we don't care about data
        
        response = client.get("/todos")
        
        # The real test: Verify the SQL query has the correct ORDER BY
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        
        # Testing the SQL generation
        assert "ORDER BY t.created_at DESC" in query
        assert "DESC" in query  # Default is descending

    def test_sort_task_by_task_title_alpabetically(self, authenticated_client, mock_db_connection):
        """ Testing sorting tasks based on task name"""
        client, user_id = authenticated_client

        mock_cursor = self._setup_mock_cursor(mock_db_connection)
        mock_cursor.fetchall.return_value = []

        response = client.get("/todos?sort_by=title&sort_order=asc")
        
        # Verify the SQL query contains the correct ORDER BY clause
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]
        
        # Check that ORDER BY title ASC is in the query
        assert "ORDER BY t.title ASC" in query
        assert response.status_code == 200

        response = client.get("/todos?sort_by=title&sort_order=desc")
        
        # Verify the SQL query contains the correct ORDER BY clause
        query = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]
        
        # Check that ORDER BY title DESC is in the query
        assert "ORDER BY t.title DESC" in query
        assert response.status_code == 200
    
    
    def test_sort_task_by_task_status(self, authenticated_client, mock_db_connection):
        client, user_id = authenticated_client

        mock_cursor = self._setup_mock_cursor(mock_db_connection)
        mock_cursor.fetchall.return_value = []

        # archived, completed, in progress, not started
        response = client.get("/todos?sort_by=task_status&sort_order=asc")
        
        # Verify the SQL query contains the correct ORDER BY clause
        mock_cursor.execute.assert_called_once()
        query = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]
        
        # Check that ORDER BY title ASC is in the query
        assert "ORDER BY t.task_status ASC" in query
        assert response.status_code == 200

        response = client.get("/todos?sort_by=task_status&sort_order=desc")
        
        # Verify the SQL query contains the correct ORDER BY clause
        query = mock_cursor.execute.call_args[0][0]
        params = mock_cursor.execute.call_args[0][1]
        
        # Check that ORDER BY title DESC is in the query
        assert "ORDER BY t.task_status DESC" in query
        assert response.status_code == 200

    def test_sort_task_by_task_priority(self, authenticated_client, mock_db_connection):
        pass

    def test_sort_task_by_due_date(self,authenticated_client, mock_db_connection):
        pass
                