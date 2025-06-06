from datetime import datetime
from typing import List, Optional

from odmantic import EmbeddedModel, Field, Index, Model, ObjectId


class TimeWindow(EmbeddedModel):
    name: str
    category_id: ObjectId
    start_time: int
    end_time: int
    task_ids: List[ObjectId] = Field(default_factory=list)


class DailyPlan(Model):
    plan_date: datetime
    user_id: ObjectId
    time_windows: List[TimeWindow] = Field(default_factory=list)
    reflection_content: Optional[str] = None
    notes_content: Optional[str] = None
    reviewed: bool = Field(default=False)

    model_config = {
        "collection": "daily_plans",
        "indexes": lambda: [
            Index(DailyPlan.user_id, DailyPlan.plan_date, unique=True),
        ],
    }
