import asyncio

import pytest
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient
from odmantic import AIOEngine

from app.core.config import settings
from app.db.connection import set_test_engine
from app.db.models.user import User
from app.main import app


@pytest.fixture(scope="session")
def event_loop():
    """Create an instance of the default event loop for each test case."""
    loop = asyncio.get_event_loop_policy().new_event_loop()
    yield loop
    loop.close()


@pytest.fixture(scope="session")
def db_client():
    """Create database client at session level."""
    client = AsyncIOMotorClient(settings.MONGODB_URL)
    yield client
    client.close()


@pytest.fixture(scope="session")
def db_engine(db_client):
    """Create database engine at session level."""
    engine = AIOEngine(client=db_client, database=f"{settings.MONGODB_DATABASE_NAME}_test")
    set_test_engine(engine)  # Set the test engine at session start
    yield engine
    set_test_engine(None)  # Reset the test engine at session end


@pytest.fixture(scope="session")
async def test_db(db_engine):
    """Session-scoped test database fixture."""
    # Clear database at session start
    await db_engine.get_collection(User).delete_many({})
    yield db_engine
    # Clear database at session end
    await db_engine.get_collection(User).delete_many({})


@pytest.fixture
def app_test():
    """Get test app"""
    return app


@pytest.fixture
async def async_client(app_test, test_db):  # Add test_db dependency
    """Get async test client"""
    async with AsyncClient(transport=ASGITransport(app=app_test), base_url="http://test") as client:
        yield client
