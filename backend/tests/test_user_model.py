import pytest
from app.db.models.user import User

@pytest.mark.asyncio
async def test_create_user(test_db):
    # Test user creation
    email = "test@example.com"
    first_name = "Test"
    last_name = "User"
    username = "testuser"
    hashed_password = "hashedpass123"  # In real tests, use proper password hashing
    
    user = User(
        email=email,
        first_name=first_name,
        last_name=last_name,
        username=username,
        hashed_password=hashed_password
    )
    await test_db.save(user)
    
    retrieved_user = await test_db.find_one(User, User.email == email)
    
    assert retrieved_user is not None
    assert retrieved_user.email == email
    assert retrieved_user.first_name == first_name
    assert retrieved_user.last_name == last_name
    assert retrieved_user.username == username

@pytest.mark.asyncio
async def test_read_user(test_db):
    # Test reading a user
    email = "test2@example.com"
    first_name = "Test2"
    last_name = "User2"
    username = "testuser2"
    hashed_password = "hashedpass123"
    
    user = User(
        email=email,
        first_name=first_name,
        last_name=last_name,
        username=username,
        hashed_password=hashed_password
    )
    await test_db.save(user)
    
    retrieved_user = await test_db.find_one(User, User.email == email)
    
    assert retrieved_user is not None
    assert retrieved_user.email == email
    assert retrieved_user.first_name == first_name
    assert retrieved_user.last_name == last_name
    assert retrieved_user.username == username

@pytest.mark.asyncio
async def test_update_user(test_db):
    # Test updating a user
    email = "test3@example.com"
    first_name = "Test3"
    last_name = "User3"
    username = "testuser3"
    hashed_password = "hashedpass123"
    
    user = User(
        email=email,
        first_name=first_name,
        last_name=last_name,
        username=username,
        hashed_password=hashed_password
    )
    await test_db.save(user)
    
    user.first_name = "UpdatedTest3"
    await test_db.save(user)
    
    retrieved_user = await test_db.find_one(User, User.email == email)
    
    assert retrieved_user is not None
    assert retrieved_user.email == email
    assert retrieved_user.first_name == "UpdatedTest3"
    assert retrieved_user.last_name == last_name
    assert retrieved_user.username == username

@pytest.mark.asyncio
async def test_delete_user(test_db):
    # Test deleting a user
    email = "test4@example.com"
    first_name = "Test4"
    last_name = "User4"
    username = "testuser4"
    hashed_password = "hashedpass123"
    
    user = User(
        email=email,
        first_name=first_name,
        last_name=last_name,
        username=username,
        hashed_password=hashed_password
    )
    await test_db.save(user)
    
    await test_db.delete(user)
    
    retrieved_user = await test_db.find_one(User, User.email == email)
    
    assert retrieved_user is None