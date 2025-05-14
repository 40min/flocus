import uuid

import pytest

from app.core.security import create_access_token
from app.db.models.category import Category
from app.db.models.time_window import TimeWindow
from app.db.models.user import User  # Added import
from app.services.user_service import UserService


@pytest.fixture
async def test_user_one(test_db):
    """Create test user one."""
    user_service = UserService(test_db)
    user_in_data = {
        "username": f"testuser1_{uuid.uuid4()}",
        "email": f"testuser1_email_{uuid.uuid4()}@example.com",
        "password": "password123",
        "first_name": "Test",
        "last_name": "UserOne",
    }
    # Convert dict to UserCreateRequest model
    from app.api.schemas.user import UserCreateRequest

    user_create_request = UserCreateRequest(**user_in_data)
    user = await user_service.register_user(user_create_request)
    return user


@pytest.fixture
async def test_user_two(test_db):
    """Create test user two."""
    user_service = UserService(test_db)
    user_in_data = {
        "username": f"testuser2_{uuid.uuid4()}",
        "email": f"testuser2_email_{uuid.uuid4()}@example.com",
        "password": "password456",
        "first_name": "Test",
        "last_name": "UserTwo",
    }
    # Convert dict to UserCreateRequest model
    from app.api.schemas.user import UserCreateRequest

    user_create_request = UserCreateRequest(**user_in_data)
    user = await user_service.register_user(user_create_request)
    return user


@pytest.fixture
async def auth_headers_user_one(test_user_one: User):  # Added User type hint
    """Get auth headers for test user one."""
    access_token = create_access_token(data={"sub": test_user_one.username})  # Use username for sub
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
async def auth_headers_user_two(test_user_two: User):  # Added User type hint
    """Get auth headers for test user two."""
    access_token = create_access_token(data={"sub": test_user_two.username})  # Use username for sub
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture
async def user_one_category(test_db, test_user_one):
    """Create a category for test user one."""
    category = Category(
        name=f"Category_{uuid.uuid4()}",
        description="Test category for user one",
        color="#FF0000",
        user=test_user_one.id,  # Changed to ObjectId
    )
    await test_db.save(category)
    return category


@pytest.fixture
async def user_one_time_window(test_db, test_user_one, user_one_category):
    """Create a time window for test user one."""
    # Ensure all data is in the correct type for the Model
    time_window_data = {
        "name": f"TW_UserOne_{uuid.uuid4()}",
        "start_time": 9 * 60,  # int
        "end_time": 17 * 60,  # int
        "category": user_one_category.id,  # Changed to ObjectId
        "user": test_user_one.id,  # Changed to ObjectId
    }
    instance_to_save = TimeWindow(**time_window_data)
    await test_db.save(instance_to_save)
    return instance_to_save


@pytest.fixture
async def user_two_category(test_db, test_user_two):
    """Create a category for test user two."""
    category = Category(
        name=f"Category_UserTwo_{uuid.uuid4()}",
        description="Test category for user two",
        color="#00FF00",
        user=test_user_two.id,  # Changed to ObjectId
    )
    await test_db.save(category)
    return category


@pytest.fixture
async def user_two_time_window(test_db, test_user_two, user_two_category):
    """Create a time window for test user two."""
    # Ensure all data is in the correct type for the Model
    time_window_data = {
        "name": f"TW_UserTwo_{uuid.uuid4()}",
        "start_time": 10 * 60,  # int
        "end_time": 18 * 60,  # int
        "category": user_two_category.id,  # Changed to ObjectId
        "user": test_user_two.id,  # Changed to ObjectId
    }
    instance_to_save = TimeWindow(**time_window_data)
    await test_db.save(instance_to_save)
    return instance_to_save
