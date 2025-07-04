from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class UserDailyStatsResponse(BaseModel):
    date: datetime
    total_seconds_spent: int
    pomodoros_completed: int

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)


class IncrementTimeRequest(BaseModel):
    seconds: int = Field(..., gt=0, description="Number of seconds to add to the daily total.")
