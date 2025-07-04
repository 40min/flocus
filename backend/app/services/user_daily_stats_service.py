from datetime import datetime, timezone

from fastapi import Depends
from odmantic import AIOEngine, ObjectId

from app.db.connection import get_database
from app.db.models.user_daily_stats import UserDailyStats


def get_utc_today_start() -> datetime:
    """Returns the start of today in UTC."""
    now_utc = datetime.now(timezone.utc)
    return datetime(now_utc.year, now_utc.month, now_utc.day, tzinfo=timezone.utc)


class UserDailyStatsService:
    def __init__(self, engine: AIOEngine = Depends(get_database)):
        self.engine = engine

    async def get_or_create_today(self, user_id: ObjectId) -> UserDailyStats:
        """
        Retrieves today's stats document for a user, creating it if it doesn't exist.
        This is an "upsert" like operation.
        """
        today_start_utc = get_utc_today_start()
        stats = await self.engine.find_one(
            UserDailyStats,
            (UserDailyStats.user_id == user_id) & (UserDailyStats.date == today_start_utc),
        )

        if stats is None:
            stats = UserDailyStats(user_id=user_id, date=today_start_utc)
            await self.engine.save(stats)

        return stats

    async def increment_time(self, user_id: ObjectId, seconds: int):
        """Increments the total time spent for a user for the current day."""
        stats = await self.get_or_create_today(user_id)
        stats.total_seconds_spent += seconds
        await self.engine.save(stats)

    async def increment_pomodoro(self, user_id: ObjectId):
        """Increments the pomodoros completed for a user for the current day."""
        stats = await self.get_or_create_today(user_id)
        stats.pomodoros_completed += 1
        await self.engine.save(stats)

    async def get_today_stats(self, user_id: ObjectId) -> UserDailyStats:
        """Retrieves today's statistics for a user, creating it if it doesn't exist."""
        return await self.get_or_create_today(user_id)
