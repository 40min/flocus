from datetime import date
from typing import List, Optional

from odmantic import ObjectId
from pydantic import BaseModel, ConfigDict, Field

from app.api.schemas.task import TaskResponse
from app.api.schemas.time_window import TimeWindowResponse


class DailyPlanAllocationBase(BaseModel):
    time_window_id: ObjectId = Field(..., description="The ID of the TimeWindow for this allocation.")
    task_id: ObjectId = Field(..., description="The ID of the Task allocated to the TimeWindow.")


class DailyPlanAllocationCreate(DailyPlanAllocationBase):
    pass


class DailyPlanAllocationResponse(BaseModel):
    time_window: TimeWindowResponse
    task: TaskResponse

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)


class DailyPlanBase(BaseModel):
    date: date = Field(..., description="The specific date for this daily plan.")


class DailyPlanCreateRequest(DailyPlanBase):
    allocations: List[DailyPlanAllocationCreate] = Field(
        default_factory=list, description="List of time windows and their allocated tasks."
    )


class DailyPlanUpdateRequest(BaseModel):
    allocations: Optional[List[DailyPlanAllocationCreate]] = Field(
        None, description="Updated list of time windows and their allocated tasks. Replaces existing allocations."
    )
    model_config = ConfigDict(extra="forbid")


class DailyPlanResponse(DailyPlanBase):
    id: ObjectId
    user_id: ObjectId
    allocations: List[DailyPlanAllocationResponse] = []

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)
