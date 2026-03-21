import pytest
from app.api import create_app

@pytest.fixture
def client():
    app = create_app()
    app.config['TESTING'] = True
    
    with app.test_client() as client:
        yield client

def test_index_route(client):
    response = client.get('/')
    assert response.status_code == 200
    assert b'Hello, World!' in response.data

def test_get_current_time(client):
    response = client.get('/api/time')
    assert response.status_code == 200
    data = response.get_json()
    assert 'time' in data
    assert isinstance(data['time'], (int, float))

def test_get_username(client):
    # This test is expected to fail since the /api/username route is not implemented
    response = client.get('/api/username')
    assert response.status_code == 404