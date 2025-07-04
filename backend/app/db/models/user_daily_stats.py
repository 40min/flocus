from datetime import datetime

from odmantic import Field, Index, Model, ObjectId


class UserDailyStats(Model):
    user_id: ObjectId
    date: datetime  # Represents the specific day (time part should be zeroed)
    total_seconds_spent: int = Field(default=0)
    pomodoros_completed: int = Field(default=0)

    model_config = {
        "collection": "user_daily_stats",
        "indexes": lambda: [Index(UserDailyStats.user_id, UserDailyStats.date, unique=True)],
    }
