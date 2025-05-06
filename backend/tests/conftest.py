import pytest
import asyncio
from async_generator import asynccontextmanager
from motor.motor_asyncio import AsyncIOMotorClient
from odmantic import AIOEngine
from httpx import AsyncClient, ASGITransport
from app.core.config import settings
from app.db.models.user import User
from app.main import app
from app.db.connection import set_test_engine
import pytest_asyncio

@asynccontextmanager
async def get_test_db():
    """Get test database."""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    engine = AIOEngine(client=client, database=f"{settings.MONGODB_DATABASE_NAME}_test")
    
    # Set the test engine globally
    set_test_engine(engine)
    
    # Clear database before each test
    await engine.get_collection(User).delete_many({})
    
    try:
        yield engine
    finally:
        # Cleanup after test
        await engine.get_collection(User).delete_many({})
        set_test_engine(None)  # Reset the test engine
        client.close()

@pytest.fixture
def app_test():
    """Get test app"""
    return app

@pytest.fixture
async def async_client(app_test):
    """Get async test client"""
    async with AsyncClient(
        transport=ASGITransport(app=app_test),
        base_url="http://test"
    ) as client:
        yield client

@pytest.fixture
async def test_db():
    async with get_test_db() as db:
        yield db