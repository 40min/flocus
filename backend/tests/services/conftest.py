import pytest
from odmantic import AIOEngine

from app.api.schemas.user import UserCreateRequest
from app.db.models.user import User
from app.services.user_service import UserService


@pytest.fixture(scope="function")
async def test_user_one(test_db: AIOEngine) -> User:
    """
    Fixture for a test user, created and deleted per function.
    """
    user_service = UserService(db=test_db)
    user = await user_service.register_user(
        user_data=UserCreateRequest(
            username="testuser_service_one",
            email="test_service_one@example.com",
            password="testpassword",
            first_name="Test",
            last_name="User",
        )
    )
    yield user
    # Clean up the user after the test
    await test_db.delete(user)
