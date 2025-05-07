import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.core.config import settings

USER_DATA = {
    "email": "test@example.com",
    "first_name": "Test",
    "last_name": "User",
    "username": "testuser",
    "password": "testpassword123",
}


# Use the async_client fixture provided by conftest.py
@pytest.mark.asyncio
async def register_user(async_client: AsyncClient):
    resp = await async_client.post(f"{settings.API_V1_STR}/users/register", json=USER_DATA)
    return resp


@pytest.mark.asyncio
async def login_user(async_client: AsyncClient):
    resp = await async_client.post(
        f"{settings.API_V1_STR}/users/login",
        data={"username": USER_DATA["username"], "password": USER_DATA["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    return resp


@pytest_asyncio.fixture(scope="function")
async def user_and_token(async_client: AsyncClient, test_db):
    """Fixture to create a user and get the token for authentication."""
    # Ensure user exists for login
    await async_client.post(f"{settings.API_V1_STR}/users/register", json=USER_DATA)
    # Login to get token
    login_resp = await async_client.post(
        f"{settings.API_V1_STR}/users/login",
        data={"username": USER_DATA["username"], "password": USER_DATA["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    token = login_resp.json()["access_token"]
    auth = {"Authorization": f"Bearer {token}"}
    # Get user details using the token
    user_resp = await async_client.get(f"{settings.API_V1_STR}/users/me", headers=auth)
    user = user_resp.json()
    return {"auth": auth, "user": user}


@pytest.mark.asyncio
async def test_register_user(async_client: AsyncClient, test_db):  # Added test_db fixture for isolation
    resp = await async_client.post(f"{settings.API_V1_STR}/users/register", json=USER_DATA)
    assert resp.status_code == 201
    assert resp.json()["email"] == USER_DATA["email"]


@pytest.mark.asyncio
async def test_login_user(async_client: AsyncClient, test_db):  # Added test_db fixture for isolation
    # Register user first
    await async_client.post(f"{settings.API_V1_STR}/users/register", json=USER_DATA)
    # Then attempt login
    resp = await async_client.post(
        f"{settings.API_V1_STR}/users/login",
        data={"username": USER_DATA["username"], "password": USER_DATA["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


@pytest.mark.asyncio
async def test_get_current_user(async_client: AsyncClient, user_and_token):
    auth = user_and_token["auth"]
    resp = await async_client.get(f"{settings.API_V1_STR}/users/me", headers=auth)
    assert resp.status_code == 200
    assert resp.json()["email"] == USER_DATA["email"]


@pytest.mark.asyncio
async def test_get_user_by_id(async_client: AsyncClient, user_and_token):
    auth = user_and_token["auth"]
    user = user_and_token["user"]
    user_id = user.get("id") or user.get("_id")  # Handle potential _id from MongoDB
    if user_id:
        resp = await async_client.get(f"{settings.API_V1_STR}/users/{user_id}", headers=auth)
        assert resp.status_code == 200
        assert resp.json()["email"] == USER_DATA["email"]


@pytest.mark.asyncio
async def test_update_user(async_client: AsyncClient, user_and_token):
    auth = user_and_token["auth"]
    user = user_and_token["user"]
    user_id = user.get("id") or user.get("_id")
    update = {"first_name": "Updated"}
    if user_id:
        resp = await async_client.put(f"{settings.API_V1_STR}/users/{user_id}", json=update, headers=auth)
        assert resp.status_code == 200
        assert resp.json()["first_name"] == "Updated"


@pytest.mark.asyncio
async def test_delete_user(async_client: AsyncClient, user_and_token):
    auth = user_and_token["auth"]
    user = user_and_token["user"]
    user_id = user.get("id") or user.get("_id")
    if user_id:
        resp = await async_client.delete(f"{settings.API_V1_STR}/users/{user_id}", headers=auth)
        assert resp.status_code == 204

        # Verify user is actually deleted
        get_resp = await async_client.get(f"{settings.API_V1_STR}/users/{user_id}", headers=auth)
        assert get_resp.status_code == 404  # Should not find the user anymore
