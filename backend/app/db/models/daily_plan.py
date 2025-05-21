from datetime import date
from typing import List

from odmantic import EmbeddedModel, Field, Index, Model, ObjectId


class DailyPlanAllocation(EmbeddedModel):
    time_window_id: ObjectId
    task_id: ObjectId


class DailyPlan(Model):
    user_id: ObjectId
    date: date
    allocations: List[DailyPlanAllocation] = Field(default_factory=list)

    model_config = {
        "collection": "daily_plans",
        "indexes": lambda: [
            Index(DailyPlan.user_id, DailyPlan.date, unique=True),
        ],
    }
