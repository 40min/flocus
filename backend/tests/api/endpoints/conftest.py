import datetime
import uuid

import pytest

from app.core.security import create_access_token
from app.db.models.category import Category
from app.db.models.day_template import DayTemplate

# TimeWindow model is removed, its data is embedded in DayTemplate
from app.db.models.task import Task as TaskModel
from app.db.models.user import User
from app.services.user_service import UserService


@pytest.fixture(scope="module")
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


@pytest.fixture(scope="module")
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


@pytest.fixture(scope="module")
async def auth_headers_user_one(test_user_one: User):  # Added User type hint
    """Get auth headers for test user one."""
    access_token = create_access_token(data={"sub": test_user_one.username})  # Use username for sub
    return {"Authorization": f"Bearer {access_token}"}


@pytest.fixture(scope="module")
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


# user_one_time_window fixture is removed as TimeWindow model is gone.
# Time windows are now embedded in DayTemplate.
# The user_one_day_template_model fixture will be updated to include embedded time windows.


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


# user_two_time_window fixture is removed.


@pytest.fixture
async def user_one_day_template_model(test_db, test_user_one: User, user_one_category: Category):
    """
    Create a DayTemplate model instance for test user one,
    with one embedded time window.
    """
    embedded_tw_data = {
        # "id": uuid.uuid4(), # Let default_factory in EmbeddedTimeWindowSchema handle this
        "name": "Fixture Morning Routine",
        "start_time": 9 * 60,
        "end_time": 10 * 60,
        "category_id": user_one_category.id,
        # user_id for embedded TW might be implicit from parent DayTemplate
    }
    day_template = DayTemplate(
        name=f"DT_With_Embedded_TW_{uuid.uuid4()}",
        user_id=test_user_one.id,  # Changed from 'user' to 'user_id'
        description="Day Template with an embedded Time Window",
        time_windows=[embedded_tw_data],  # Store as a list of dicts
    )
    await test_db.save(day_template)
    return day_template


@pytest.fixture
async def user_one_task_model(test_db, test_user_one: User, user_one_category: Category) -> TaskModel:
    """Create a Task model instance for test user one, associated with their category."""
    task = TaskModel(
        title=f"UserOne_Task_{uuid.uuid4()}",
        description="Test task for user one",
        user_id=test_user_one.id,
        category_id=user_one_category.id,
        due_date=datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=1),
        priority="medium",
        status="pending",  # Changed from "todo"
    )
    await test_db.save(task)
    return task


@pytest.fixture
async def user_two_task_model(test_db, test_user_two: User, user_two_category: Category) -> TaskModel:
    """Create a Task model instance for test user two, associated with their category."""
    task = TaskModel(
        title=f"UserTwo_Task_{uuid.uuid4()}",
        description="Test task for user two",
        user_id=test_user_two.id,
        category_id=user_two_category.id,
        due_date=datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=2),
        status="pending",  # Added default status
        priority="medium",  # Added default priority
    )
    await test_db.save(task)
    return task


@pytest.fixture
async def user_two_day_template_model(test_db, test_user_two: User, user_two_category: Category):
    """
    Create a DayTemplate model instance for test user two,
    with one embedded time window.
    """
    embedded_tw_data = {
        # "id": uuid.uuid4(), # Let default_factory in EmbeddedTimeWindowSchema handle this
        "name": "Fixture UserTwo TW",
        "start_time": 14 * 60,
        "end_time": 15 * 60,
        "category_id": user_two_category.id,
    }
    day_template = DayTemplate(
        name=f"DT_UserTwo_With_Embedded_TW_{uuid.uuid4()}",
        user_id=test_user_two.id,  # Changed from 'user' to 'user_id'
        description="Day Template for Time Window tests (User Two)",
        time_windows=[embedded_tw_data],
    )
    await test_db.save(day_template)
    return day_template
