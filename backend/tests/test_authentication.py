import pytest

from app.api.schemas.user import UserCreateRequest
from app.core.config import settings

pytestmark = pytest.mark.asyncio


async def test_register_user(async_client, test_db):
    user_data = UserCreateRequest(
        username="testuser", email="test@example.com", first_name="Test", last_name="User", password="testpassword"
    ).model_dump()

    response = await async_client.post(f"{settings.API_V1_STR}/users/register", json=user_data)
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
        username="testuser", email="test@example.com", first_name="Test", last_name="User", password="testpassword"
    ).model_dump()

    register_response = await async_client.post(f"{settings.API_V1_STR}/users/register", json=register_data)
    assert register_response.status_code == 201

    # Test user login with form data
    form_data = {"username": "testuser", "password": "testpassword"}
    response = await async_client.post(
        f"{settings.API_V1_STR}/users/login",
        data=form_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 200

    response_data = response.json()
    assert "access_token" in response_data
    assert "token_type" in response_data
    assert response_data["token_type"] == "bearer"

    # Verify we can access protected endpoints with the token
    me_response = await async_client.get(
        f"{settings.API_V1_STR}/users/me", headers={"Authorization": f"Bearer {response_data['access_token']}"}
    )
    assert me_response.status_code == 200
    user_data = me_response.json()
    assert user_data["username"] == "testuser"
    assert user_data["email"] == "test@example.com"
    assert "id" in user_data


async def test_register_user_duplicate_username(async_client, test_db):
    # Register the first user
    user_data = UserCreateRequest(
        username="testuser_dup",
        email="test_dup1@example.com",
        first_name="Test",
        last_name="User",
        password="testpassword",
    ).model_dump()
    response = await async_client.post(f"{settings.API_V1_STR}/users/register", json=user_data)
    assert response.status_code == 201

    # Attempt to register another user with the same username
    user_data_dup = UserCreateRequest(
        username="testuser_dup",  # Same username
        email="test_dup2@example.com",
        first_name="Test",
        last_name="User",
        password="testpassword",
    ).model_dump()
    response_dup = await async_client.post(f"{settings.API_V1_STR}/users/register", json=user_data_dup)
    assert response_dup.status_code == 400  # Expecting Bad Request
    assert "Username already registered" in response_dup.json()["detail"]


async def test_register_user_duplicate_email(async_client, test_db):
    # Register the first user
    user_data = UserCreateRequest(
        username="testuser_email1",
        email="test_dup_email@example.com",  # Same email
        first_name="Test",
        last_name="User",
        password="testpassword",
    ).model_dump()
    response = await async_client.post(f"{settings.API_V1_STR}/users/register", json=user_data)
    assert response.status_code == 201

    # Attempt to register another user with the same email
    user_data_dup = UserCreateRequest(
        username="testuser_email2",
        email="test_dup_email@example.com",  # Same email
        first_name="Test",
        last_name="User",
        password="testpassword",
    ).model_dump()
    response_dup = await async_client.post(f"{settings.API_V1_STR}/users/register", json=user_data_dup)
    assert response_dup.status_code == 400  # Expecting Bad Request
    assert "Email already registered" in response_dup.json()["detail"]


async def test_login_user_incorrect_password(async_client, test_db):
    # Register the user first
    register_data = UserCreateRequest(
        username="testuser_login_fail",
        email="testloginfail@example.com",
        first_name="Test",
        last_name="User",
        password="correctpassword",
    ).model_dump()
    register_response = await async_client.post(f"{settings.API_V1_STR}/users/register", json=register_data)
    assert register_response.status_code == 201

    # Attempt login with incorrect password
    form_data = {"username": "testuser_login_fail", "password": "incorrectpassword"}
    response = await async_client.post(
        f"{settings.API_V1_STR}/users/login",
        data=form_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 401  # Expecting Unauthorized
    assert "Incorrect username or password" in response.json()["detail"]


async def test_login_user_nonexistent_username(async_client, test_db):
    # Attempt login with a username that doesn't exist
    form_data = {"username": "nonexistentuser", "password": "anypassword"}
    response = await async_client.post(
        f"{settings.API_V1_STR}/users/login",
        data=form_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 401  # Expecting Unauthorized
    assert "Incorrect username or password" in response.json()["detail"]


async def test_access_protected_route_no_token(async_client, test_db):
    # Attempt to access /users/me without providing a token
    response = await async_client.get(f"{settings.API_V1_STR}/users/me")
    assert response.status_code == 401  # Expecting Unauthorized
    assert "Not authenticated" in response.json()["detail"]


async def test_access_protected_route_invalid_token(async_client, test_db):
    # Attempt to access /users/me with an invalid token
    response = await async_client.get(
        f"{settings.API_V1_STR}/users/me", headers={"Authorization": "Bearer invalidtoken"}
    )
    assert response.status_code == 401  # Expecting Unauthorized
    assert "Could not validate credentials" in response.json()["detail"]
