import asyncio

import pytest
from httpx import ASGITransport, AsyncClient
from motor.motor_asyncio import AsyncIOMotorClient
from odmantic import AIOEngine

from app.core.config import settings
from app.db.connection import set_test_engine
from app.db.models.category import Category
from app.db.models.day_template import DayTemplate
from app.db.models.task import Task
from app.db.models.time_window import TimeWindow
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
async def test_db(db_engine: AIOEngine):
    """Session-scoped test database fixture. Clears User collection at session start/end."""
    await db_engine.get_collection(User).delete_many({})
    yield db_engine
    await db_engine.get_collection(User).delete_many({})


@pytest.fixture(scope="function")
async def clean_db(db_engine: AIOEngine):
    """Function-scoped fixture to clear all relevant collections before each test."""
    collections_to_clear = [User, Category, Task, TimeWindow, DayTemplate]
    for model_cls in collections_to_clear:
        await db_engine.get_collection(model_cls).delete_many({})
    yield db_engine


@pytest.fixture
def app_test():
    """Get test app"""
    return app


@pytest.fixture
async def async_client(app_test, clean_db):  # Depends on clean_db for per-test cleanup
    """Get async test client"""
    async with AsyncClient(transport=ASGITransport(app=app_test), base_url="http://test") as client:
        yield client
