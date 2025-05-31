from datetime import datetime
from typing import List

from odmantic import EmbeddedModel, Field, Index, Model, ObjectId


class DailyPlanAllocation(EmbeddedModel):
    name: str
    category_id: ObjectId
    start_time: int
    end_time: int
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
