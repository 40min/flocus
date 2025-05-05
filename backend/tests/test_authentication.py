import pytest
from app.api.schemas.user import UserCreateRequest, UserResponse
from app.core.config import settings

pytestmark = pytest.mark.asyncio

async def test_register_user(async_client, test_db):
    user_data = UserCreateRequest(
        username="testuser",
        email="test@example.com",
        first_name="Test",
        last_name="User",
        password="testpassword"
    ).model_dump()

    response = await async_client.post("/users/register", json=user_data)
    assert response.status_code == 201
    
    response_data = response.json()
    assert "email" in response_data
    assert response_data["email"] == user_data["email"]
    assert "username" in response_data
    assert response_data["username"] == user_data["username"]
    assert "id" in response_data
    # Password should not be in response
    assert "password" not in response_data
    assert "hashed_password" not in response_data

async def test_login_user(async_client, test_db):
    # First register the user
    register_data = UserCreateRequest(
        username="testuser",
        email="test@example.com",
        first_name="Test",
        last_name="User",
        password="testpassword"
    ).model_dump()
    
    register_response = await async_client.post("/users/register", json=register_data)
    assert register_response.status_code == 201
    
    # Test user login with form data
    form_data = {
        "username": "testuser",
        "password": "testpassword"
    }
    response = await async_client.post(
        "/users/login",
        data=form_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"}
    )
    assert response.status_code == 200
    
    response_data = response.json()
    assert "access_token" in response_data
    assert "token_type" in response_data
    assert response_data["token_type"] == "bearer"

    # Verify we can access protected endpoints with the token
    me_response = await async_client.get(
        "/users/me",
        headers={"Authorization": f"Bearer {response_data['access_token']}"}
    )
    assert me_response.status_code == 200
    user_data = me_response.json()
    assert user_data["username"] == "testuser"
    assert user_data["email"] == "test@example.com"
    assert "id" in user_data