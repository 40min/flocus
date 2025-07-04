import pytest

from app.db.models.user import User
from app.db.models.user_daily_stats import UserDailyStats
from app.services.user_daily_stats_service import UserDailyStatsService, get_utc_today_start

pytestmark = pytest.mark.asyncio


class TestUserDailyStatsService:
    @pytest.fixture(autouse=True)
    async def clean_stats_collection(self, test_db):
        """Cleans the user_daily_stats collection before each test in this class."""
        await test_db.get_collection(UserDailyStats).delete_many({})
        yield

    async def test_get_or_create_today_creates_new_doc(self, test_db, test_user_one: User):
        service = UserDailyStatsService(engine=test_db)
        today = get_utc_today_start()

        # Ensure no doc exists
        await test_db.get_collection(UserDailyStats).delete_many({"user_id": test_user_one.id, "date": today})

        stats = await service.get_or_create_today(test_user_one.id)

        assert stats is not None
        assert stats.user_id == test_user_one.id
        assert stats.date == today
        assert stats.total_seconds_spent == 0
        assert stats.pomodoros_completed == 0

        # Verify it was saved to the db
        saved_stats = await test_db.find_one(
            UserDailyStats,
            (UserDailyStats.user_id == test_user_one.id) & (UserDailyStats.date == today),
        )
        assert saved_stats is not None
        assert saved_stats.id == stats.id

    async def test_get_or_create_today_retrieves_existing_doc(self, test_db, test_user_one: User):
        service = UserDailyStatsService(engine=test_db)
        today = get_utc_today_start()

        # Create a doc to be found
        existing_stats = UserDailyStats(
            user_id=test_user_one.id,
            date=today,
            total_seconds_spent=100,
            pomodoros_completed=2,
        )
        await test_db.save(existing_stats)

        stats = await service.get_or_create_today(test_user_one.id)

        assert stats.id == existing_stats.id
        assert stats.total_seconds_spent == 100
        assert stats.pomodoros_completed == 2

    async def test_get_today_stats(self, test_db, test_user_one: User):
        service = UserDailyStatsService(engine=test_db)
        stats = await service.get_today_stats(test_user_one.id)
        assert stats is not None
        assert stats.user_id == test_user_one.id

    async def test_increment_time(self, test_db, test_user_one: User):
        service = UserDailyStatsService(engine=test_db)
        await service.increment_time(test_user_one.id, 60)
        stats = await service.get_today_stats(test_user_one.id)
        assert stats.total_seconds_spent == 60
        await service.increment_time(test_user_one.id, 30)
        stats = await service.get_today_stats(test_user_one.id)
        assert stats.total_seconds_spent == 90

    async def test_increment_pomodoro(self, test_db, test_user_one: User):
        service = UserDailyStatsService(engine=test_db)
        await service.increment_pomodoro(test_user_one.id)
        stats = await service.get_today_stats(test_user_one.id)
        assert stats.pomodoros_completed == 1
        await service.increment_pomodoro(test_user_one.id)
        stats = await service.get_today_stats(test_user_one.id)
        assert stats.pomodoros_completed == 2
