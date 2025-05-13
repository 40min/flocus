# backend/tests/api/endpoints/test_users.py
import pytest
import pytest_asyncio
from httpx import AsyncClient

from app.api.schemas.user import UserCreateRequest
from app.core.config import settings

pytestmark = pytest.mark.asyncio

USER_DATA_FOR_FIXTURE_SETUP = {
    "email": "fixture_user_setup@example.com",
    "first_name": "FixtureSetup",
    "last_name": "User",
    "username": "fixtureusersetup",
    "password": "fixturepassword123",
}

# This USER_DATA is for the original basic registration and login tests
USER_DATA_BASIC = {
    "email": "testbasic@example.com",  # Changed to avoid collision with fixture user
    "first_name": "TestBasic",
    "last_name": "User",
    "username": "testbasicuser",
    "password": "testbasicpassword123",
}


@pytest_asyncio.fixture(scope="function")
async def setup_user_data_dict():
    """Provides the raw data dictionary for the main setup user."""
    return USER_DATA_FOR_FIXTURE_SETUP


@pytest_asyncio.fixture(scope="function")
async def registered_setup_user(async_client: AsyncClient, test_db, setup_user_data_dict: dict):
    """Registers the main setup user and returns their data. Handles pre-existence."""
    resp = await async_client.post(f"{settings.API_V1_STR}/users/register", json=setup_user_data_dict)
    if resp.status_code == 400 and "already exists" in resp.text:
        # If user already exists, we can proceed, assuming they were created by a previous (failed) run
        # or a similar setup. We'll fetch their details if needed or just use the provided data.
        # For simplicity, we'll assume the setup_user_data_dict is still accurate for login.
        pass
    elif resp.status_code != 201:
        resp.raise_for_status()  # Raise an error for other unexpected issues
    # Return the original data as it's needed for login
    return setup_user_data_dict


@pytest_asyncio.fixture(scope="function")
async def setup_user_auth_token(async_client: AsyncClient, registered_setup_user: dict):
    """Logs in the registered main setup user and returns the access token."""
    login_resp = await async_client.post(
        f"{settings.API_V1_STR}/users/login",
        data={"username": registered_setup_user["username"], "password": registered_setup_user["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    login_resp.raise_for_status()
    return login_resp.json()["access_token"]


@pytest_asyncio.fixture(scope="function")
async def user_and_token(async_client: AsyncClient, setup_user_auth_token: str, setup_user_data_dict: dict):
    """Provides an authenticated main setup user's details and auth headers."""
    token = setup_user_auth_token
    auth = {"Authorization": f"Bearer {token}"}

    user_resp = await async_client.get(f"{settings.API_V1_STR}/users/me", headers=auth)
    user_resp.raise_for_status()
    user = user_resp.json()
    return {"auth": auth, "user": user, "original_data": setup_user_data_dict}


# Tests from former test_api_endpoints.py (now part of test_users.py)


async def test_register_user_basic(async_client: AsyncClient, test_db):  # Added test_db fixture for isolation
    resp = await async_client.post(f"{settings.API_V1_STR}/users/register", json=USER_DATA_BASIC)
    assert resp.status_code == 201
    assert resp.json()["email"] == USER_DATA_BASIC["email"]
    assert resp.json()["username"] == USER_DATA_BASIC["username"]


async def test_login_user_basic(async_client: AsyncClient, test_db):  # Added test_db fixture for isolation
    # Register user first
    await async_client.post(f"{settings.API_V1_STR}/users/register", json=USER_DATA_BASIC)
    # Then attempt login
    resp = await async_client.post(
        f"{settings.API_V1_STR}/users/login",
        data={"username": USER_DATA_BASIC["username"], "password": USER_DATA_BASIC["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert resp.status_code == 200
    assert "access_token" in resp.json()


async def test_get_current_user(async_client: AsyncClient, user_and_token):
    auth = user_and_token["auth"]
    original_data = user_and_token["original_data"]
    resp = await async_client.get(f"{settings.API_V1_STR}/users/me", headers=auth)
    assert resp.status_code == 200
    assert resp.json()["email"] == original_data["email"]


async def test_get_user_by_id(async_client: AsyncClient, user_and_token):
    auth = user_and_token["auth"]
    user = user_and_token["user"]
    original_data = user_and_token["original_data"]
    user_id = user.get("id") or user.get("_id")
    assert user_id is not None, "User ID not found in fixture response"
    resp = await async_client.get(f"{settings.API_V1_STR}/users/{user_id}", headers=auth)
    assert resp.status_code == 200
    assert resp.json()["email"] == original_data["email"]


async def test_update_user(async_client: AsyncClient, user_and_token):
    auth = user_and_token["auth"]
    user = user_and_token["user"]
    user_id = user.get("id") or user.get("_id")
    assert user_id is not None, "User ID not found in fixture response"
    update_data = {"first_name": "UpdatedFirstName"}
    resp = await async_client.put(f"{settings.API_V1_STR}/users/{user_id}", json=update_data, headers=auth)
    assert resp.status_code == 200
    assert resp.json()["first_name"] == update_data["first_name"]


async def test_delete_user(async_client: AsyncClient, user_and_token):
    auth = user_and_token["auth"]
    user = user_and_token["user"]
    user_id = user.get("id") or user.get("_id")
    assert user_id is not None, "User ID not found in fixture response"

    # Create a new user specifically for this delete test to avoid affecting other tests
    # that might rely on the fixture user still existing after their run.
    user_to_delete_data = {
        "email": "delete_me_user@example.com",
        "first_name": "Delete",
        "last_name": "Me",
        "username": "deletemeuser",
        "password": "deletemepassword",
    }
    reg_resp = await async_client.post(f"{settings.API_V1_STR}/users/register", json=user_to_delete_data)
    assert reg_resp.status_code == 201
    user_to_delete_id = reg_resp.json()["id"]

    # Login as the 'deletemeuser' to get their token for self-deletion
    login_del_resp = await async_client.post(
        f"{settings.API_V1_STR}/users/login",
        data={"username": user_to_delete_data["username"], "password": user_to_delete_data["password"]},
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert login_del_resp.status_code == 200, f"Failed to log in as deletemeuser: {login_del_resp.text}"
    del_token = login_del_resp.json()["access_token"]
    del_auth = {"Authorization": f"Bearer {del_token}"}

    resp = await async_client.delete(f"{settings.API_V1_STR}/users/{user_to_delete_id}", headers=del_auth)
    assert resp.status_code == 204

    # Verify user is actually deleted
    get_resp = await async_client.get(
        f"{settings.API_V1_STR}/users/{user_to_delete_id}", headers=auth
    )  # Using fixture user's auth
    assert get_resp.status_code == 404


# Tests from former test_authentication.py (now part of test_users.py)


async def test_register_user_standalone(async_client, test_db):
    user_data_payload = UserCreateRequest(
        username="testuser_reg_standalone",
        email="test_reg_standalone@example.com",
        first_name="TestReg",
        last_name="Standalone",
        password="testpassword_reg",
    ).model_dump()

    response = await async_client.post(f"{settings.API_V1_STR}/users/register", json=user_data_payload)
    assert response.status_code == 201

    response_data = response.json()
    assert "email" in response_data
    assert response_data["email"] == user_data_payload["email"]
    assert "username" in response_data
    assert response_data["username"] == user_data_payload["username"]
    assert "id" in response_data
    assert "password" not in response_data
    assert "hashed_password" not in response_data


async def test_login_user_standalone(async_client, test_db):
    register_payload = UserCreateRequest(
        username="testuser_login_standalone",
        email="test_login_standalone@example.com",
        first_name="TestLogin",
        last_name="Standalone",
        password="testpassword_login",
    ).model_dump()

    register_response = await async_client.post(f"{settings.API_V1_STR}/users/register", json=register_payload)
    assert register_response.status_code == 201

    form_data = {"username": "testuser_login_standalone", "password": "testpassword_login"}
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

    me_response = await async_client.get(
        f"{settings.API_V1_STR}/users/me", headers={"Authorization": f"Bearer {response_data['access_token']}"}
    )
    assert me_response.status_code == 200
    user_data_from_me = me_response.json()
    assert user_data_from_me["username"] == "testuser_login_standalone"
    assert user_data_from_me["email"] == "test_login_standalone@example.com"
    assert "id" in user_data_from_me


async def test_register_user_duplicate_username(async_client, test_db):
    user_data_1 = UserCreateRequest(
        username="testuser_dup_uname",
        email="test_dup_uname1@example.com",
        first_name="Test",
        last_name="User",
        password="testpassword",
    ).model_dump()
    response1 = await async_client.post(f"{settings.API_V1_STR}/users/register", json=user_data_1)
    assert response1.status_code == 201

    user_data_2 = UserCreateRequest(
        username="testuser_dup_uname",
        email="test_dup_uname2@example.com",
        first_name="Test",
        last_name="User",
        password="testpassword",
    ).model_dump()
    response2 = await async_client.post(f"{settings.API_V1_STR}/users/register", json=user_data_2)
    assert response2.status_code == 400
    assert "User with username testuser_dup_uname already exists" in response2.json()["detail"]


async def test_register_user_duplicate_email(async_client, test_db):
    user_data_1 = UserCreateRequest(
        username="testuser_dup_email1",
        email="test_dup_email@example.com",
        first_name="Test",
        last_name="User",
        password="testpassword",
    ).model_dump()
    response1 = await async_client.post(f"{settings.API_V1_STR}/users/register", json=user_data_1)
    assert response1.status_code == 201

    user_data_2 = UserCreateRequest(
        username="testuser_dup_email2",
        email="test_dup_email@example.com",
        first_name="Test",
        last_name="User",
        password="testpassword",
    ).model_dump()
    response2 = await async_client.post(f"{settings.API_V1_STR}/users/register", json=user_data_2)
    assert response2.status_code == 400
    assert "User with email test_dup_email@example.com already exists" in response2.json()["detail"]


async def test_login_user_incorrect_password(async_client, test_db):
    register_payload = UserCreateRequest(
        username="testuser_login_fail_pass",
        email="testloginfail_pass@example.com",
        first_name="Test",
        last_name="User",
        password="correctpassword",
    ).model_dump()
    register_response = await async_client.post(f"{settings.API_V1_STR}/users/register", json=register_payload)
    assert register_response.status_code == 201

    form_data = {"username": "testuser_login_fail_pass", "password": "incorrectpassword"}
    response = await async_client.post(
        f"{settings.API_V1_STR}/users/login",
        data=form_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]


async def test_login_user_nonexistent_username(async_client, test_db):
    form_data = {"username": "nonexistentuser_login", "password": "anypassword"}
    response = await async_client.post(
        f"{settings.API_V1_STR}/users/login",
        data=form_data,
        headers={"Content-Type": "application/x-www-form-urlencoded"},
    )
    assert response.status_code == 401
    assert "Incorrect username or password" in response.json()["detail"]


async def test_access_protected_route_no_token(async_client, test_db):
    response = await async_client.get(f"{settings.API_V1_STR}/users/me")
    assert response.status_code == 401
    assert "Not authenticated" in response.json()["detail"]


async def test_access_protected_route_invalid_token(async_client, test_db):
    response = await async_client.get(
        f"{settings.API_V1_STR}/users/me", headers={"Authorization": "Bearer invalidtoken"}
    )
    assert response.status_code == 401
    assert "Could not validate credentials" in response.json()["detail"]
