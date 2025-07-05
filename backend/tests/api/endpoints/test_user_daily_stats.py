import pytest
from httpx import AsyncClient

from app.core.config import settings
from app.db.models.user import User
from app.db.models.user_daily_stats import UserDailyStats

API_V1_STR = settings.API_V1_STR
STATS_ENDPOINT = f"{API_V1_STR}/daily-stats"

pytestmark = pytest.mark.asyncio


@pytest.fixture(autouse=True)
async def clean_stats_collection(test_db):
    """Cleans the user_daily_stats collection before each test in this module."""
    await test_db.get_collection(UserDailyStats).delete_many({})
    yield


async def test_get_today_stats_success(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_user_one: User
):
    response = await async_client.get(f"{STATS_ENDPOINT}/", headers=auth_headers_user_one)
    assert response.status_code == 200
    data = response.json()
    assert "date" in data
    assert data["total_seconds_spent"] == 0
    assert data["pomodoros_completed"] == 0


async def test_increment_time_spent(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_user_one: User
):
    # First increment
    response1 = await async_client.post(
        f"{STATS_ENDPOINT}/increment-time", headers=auth_headers_user_one, json={"seconds": 120}
    )
    assert response1.status_code == 204

    # Second increment
    response2 = await async_client.post(
        f"{STATS_ENDPOINT}/increment-time", headers=auth_headers_user_one, json={"seconds": 60}
    )
    assert response2.status_code == 204

    # Verify total
    response_get = await async_client.get(f"{STATS_ENDPOINT}/", headers=auth_headers_user_one)
    assert response_get.status_code == 200
    assert response_get.json()["total_seconds_spent"] == 180


async def test_increment_pomodoros_completed(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_user_one: User
):
    # First increment
    response1 = await async_client.post(f"{STATS_ENDPOINT}/increment-pomodoro", headers=auth_headers_user_one)
    assert response1.status_code == 204

    # Second increment
    response2 = await async_client.post(f"{STATS_ENDPOINT}/increment-pomodoro", headers=auth_headers_user_one)
    assert response2.status_code == 204

    # Verify total
    response_get = await async_client.get(f"{STATS_ENDPOINT}/", headers=auth_headers_user_one)
    assert response_get.status_code == 200
    assert response_get.json()["pomodoros_completed"] == 2


async def test_increment_time_with_invalid_payload(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    response = await async_client.post(f"{STATS_ENDPOINT}/increment-time", headers=auth_headers_user_one, json={})
    assert response.status_code == 422
    response = await async_client.post(
        f"{STATS_ENDPOINT}/increment-time", headers=auth_headers_user_one, json={"seconds": 0}
    )
    assert response.status_code == 422


async def test_unauthenticated_access_fails(async_client: AsyncClient):
    response = await async_client.get(f"{STATS_ENDPOINT}/")
    assert response.status_code == 401
