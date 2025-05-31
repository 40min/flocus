from datetime import date
from typing import List, Optional

from odmantic import ObjectId
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.api.schemas.task import TaskResponse
from app.api.schemas.time_window import TimeWindowResponse

# DailyPlanAllocationBase is removed as its fields are now directly in DailyPlanAllocationCreate


class DailyPlanAllocationCreate(BaseModel):  # Inherits directly from BaseModel
    # Fields from TimeWindowInputSchema
    name: str = Field(..., min_length=1, max_length=100, description="Name of the time window.")
    category_id: ObjectId = Field(..., description="Category ID for the time window.")
    start_time: int = Field(..., description="Start time in minutes since midnight.")
    end_time: int = Field(..., description="End time in minutes since midnight.")
    # Original field
    task_id: ObjectId = Field(..., description="The ID of the Task allocated to the TimeWindow.")

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_in_minutes(cls, value: int) -> int:
        if not (0 <= value < 24 * 60):
            raise ValueError("Time must be between 0 and 1439 minutes (inclusive).")
        return value

    @model_validator(mode="after")
    def check_end_time_greater_than_start_time(cls, values: "DailyPlanAllocationCreate") -> "DailyPlanAllocationCreate":
        if values.start_time is not None and values.end_time is not None and values.end_time <= values.start_time:
            raise ValueError("end_time must be greater than start_time")
        return values


class DailyPlanAllocationResponse(BaseModel):
    time_window: TimeWindowResponse  # This structure remains, but data source changes
    task: TaskResponse

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)


class DailyPlanBase(BaseModel):
    plan_date: date = Field(..., description="The specific date for this daily plan.")


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
