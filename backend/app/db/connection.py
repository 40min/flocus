from typing import Optional

from fastapi import Request  # Added
from odmantic import AIOEngine

_test_engine: Optional[AIOEngine] = None


def set_test_engine(engine: Optional[AIOEngine]) -> None:
    global _test_engine
    _test_engine = engine


async def get_database(request: Request) -> AIOEngine:
    global _test_engine

    if _test_engine is not None:
        return _test_engine

    return request.app.state.engine
