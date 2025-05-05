import pytest
from httpx import AsyncClient
from app.core.config import settings

@pytest.mark.asyncio
async def test_error_handling():
    async with AsyncClient(base_url=settings.API_V1_STR) as client:
        # Test error handling middleware
        pass