from datetime import datetime
from typing import List, Optional

from odmantic import EmbeddedModel, Field, Index, Model, ObjectId


class TimeWindow(EmbeddedModel):
    description: Optional[str] = None
    category_id: ObjectId
    start_time: int
    end_time: int
    task_ids: List[ObjectId] = Field(default_factory=list)


class SelfReflection(EmbeddedModel):
    positive: Optional[str] = Field(None, max_length=1000)
    negative: Optional[str] = Field(None, max_length=1000)
    follow_up_notes: Optional[str] = Field(None, max_length=1000)


class DailyPlan(Model):
    plan_date: datetime
    user_id: ObjectId
    time_windows: List[TimeWindow] = Field(default_factory=list)
    self_reflection: SelfReflection = Field(
        default_factory=lambda: SelfReflection(positive=None, negative=None, follow_up_notes=None)
    )

    model_config = {
        "collection": "daily_plans",
        "indexes": lambda: [
            Index(DailyPlan.user_id, DailyPlan.plan_date, unique=True),
        ],
    }
