# backend/tests/db/models/test_user.py
import pytest

from app.db.models.user import User

pytestmark = pytest.mark.asyncio


async def test_create_user(test_db):
    # Test user creation
    email = "model_test_create@example.com"
    first_name = "ModelTestCreate"
    last_name = "User"
    username = "modeltestcreateuser"
    hashed_password = "hashedpass_model_create"

    user = User(
        email=email, first_name=first_name, last_name=last_name, username=username, hashed_password=hashed_password
    )
    await test_db.save(user)

    retrieved_user = await test_db.find_one(User, User.email == email)

    assert retrieved_user is not None
    assert retrieved_user.email == email
    assert retrieved_user.first_name == first_name
    assert retrieved_user.last_name == last_name
    assert retrieved_user.username == username
    assert retrieved_user.id is not None  # Ensure an ID was assigned


async def test_read_user(test_db):
    # Test reading a user
    email = "model_test_read@example.com"
    first_name = "ModelTestRead"
    last_name = "User"
    username = "modeltestreaduser"
    hashed_password = "hashedpass_model_read"

    user = User(
        email=email, first_name=first_name, last_name=last_name, username=username, hashed_password=hashed_password
    )
    await test_db.save(user)

    retrieved_user = await test_db.find_one(User, User.email == email)

    assert retrieved_user is not None
    assert retrieved_user.email == email
    assert retrieved_user.first_name == first_name
    assert retrieved_user.last_name == last_name
    assert retrieved_user.username == username


async def test_update_user(test_db):
    # Test updating a user
    email = "model_test_update@example.com"
    first_name = "ModelTestUpdate"
    last_name = "User"
    username = "modeltestupdateuser"
    hashed_password = "hashedpass_model_update"

    user = User(
        email=email, first_name=first_name, last_name=last_name, username=username, hashed_password=hashed_password
    )
    await test_db.save(user)

    # Retrieve the user to get its ID for update
    user_to_update = await test_db.find_one(User, User.email == email)
    assert user_to_update is not None

    user_to_update.first_name = "UpdatedModelTest"
    await test_db.save(user_to_update)

    retrieved_user = await test_db.find_one(User, User.email == email)

    assert retrieved_user is not None
    assert retrieved_user.email == email
    assert retrieved_user.first_name == "UpdatedModelTest"
    assert retrieved_user.last_name == last_name
    assert retrieved_user.username == username


async def test_delete_user(test_db):
    # Test deleting a user
    email = "model_test_delete@example.com"
    first_name = "ModelTestDelete"
    last_name = "User"
    username = "modeltestdeleteuser"
    hashed_password = "hashedpass_model_delete"

    user = User(
        email=email, first_name=first_name, last_name=last_name, username=username, hashed_password=hashed_password
    )
    await test_db.save(user)

    # Retrieve the user to ensure it exists before deletion
    user_to_delete = await test_db.find_one(User, User.email == email)
    assert user_to_delete is not None

    await test_db.delete(user_to_delete)

    retrieved_user_after_delete = await test_db.find_one(User, User.email == email)

    assert retrieved_user_after_delete is None
