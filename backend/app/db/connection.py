import asyncio
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient
from odmantic import AIOEngine

from app.core.config import settings

_test_engine: Optional[AIOEngine] = None
_default_engine: Optional[AIOEngine] = None


def get_or_create_event_loop():
    try:
        return asyncio.get_running_loop()
    except RuntimeError:
        return asyncio.new_event_loop()


def set_test_engine(engine: Optional[AIOEngine]) -> None:
    global _test_engine
    _test_engine = engine


async def get_database() -> AIOEngine:
    global _default_engine, _test_engine

    if _test_engine is not None:
        return _test_engine

    if _default_engine is None:
        loop = get_or_create_event_loop()

        client = AsyncIOMotorClient(settings.MONGODB_URL, io_loop=loop)
        _default_engine = AIOEngine(client=client, database=settings.MONGODB_DATABASE_NAME)

    return _default_engine
