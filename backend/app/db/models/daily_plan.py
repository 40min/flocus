from datetime import datetime
from typing import List

from odmantic import EmbeddedModel, Field, Index, Model, ObjectId


class DailyPlanAllocation(EmbeddedModel):
    time_window_id: ObjectId
    task_id: ObjectId


class DailyPlan(Model):
    user_id: ObjectId
    plan_date: datetime
    allocations: List[DailyPlanAllocation] = Field(default_factory=list)

    model_config = {
        "collection": "daily_plans",
        "indexes": lambda: [
            Index(DailyPlan.user_id, DailyPlan.plan_date, unique=True),
        ],
    }
