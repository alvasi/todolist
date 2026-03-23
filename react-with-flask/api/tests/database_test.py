# backend/tests/test_database_connection.py
import pytest
import psycopg
from psycopg import OperationalError
from pathlib import Path
from dotenv import load_dotenv
import os

env_path = Path("/Users/alvasi/Desktop/Projects/todolist/react-with-flask/.env")
load_dotenv(dotenv_path=env_path)


class TestDatabaseConnection:
    """Test PostgreSQL database connection with psycopg3"""

    def test_connection_success(self):
        # Get database URL from environment
        db_url = os.environ.get(
            "DATABASE_URL",
        )

        try:
            # Attempt to connect
            conn = psycopg.connect(db_url)

            # Test the connection
            with conn.cursor() as cursor:
                cursor.execute("SELECT 1")
                result = cursor.fetchone()
                assert result[0] == 1

            conn.close()

        except OperationalError as e:
            pytest.fail(f"Failed to connect to database: {e}")

    def test_tables_exist(self):
        """Test that all required tables exist"""
        db_url = os.environ.get(
            "DATABASE_URL",
        )

        conn = psycopg.connect(db_url)
        with conn.cursor() as cursor:
            cursor.execute("""
                SELECT tablename
                FROM pg_tables
                WHERE schemaname = 'public'
                AND tablename NOT LIKE 'alembic%'
                ORDER BY tablename
            """)
            tables = [row[0] for row in cursor.fetchall()]

            expected_tables = {
                "users",
                "teams",
                "team_members",
                "tasks",
                "task_collaborators",
            }

            for table in expected_tables:
                assert table in tables, f"Table '{table}' not found"

            print(f"✓ All tables exist: {expected_tables}")

        conn.close()
