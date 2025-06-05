from datetime import datetime
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
    task_ids: List[ObjectId] = Field(
        default_factory=list, description="The IDs of the Tasks allocated to the TimeWindow."
    )

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
    time_window: TimeWindowResponse
    tasks: List[TaskResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)


class DailyPlanBase(BaseModel):
    plan_date: datetime = Field(..., description="The specific date and time for this daily plan.")
    reflection_content: Optional[str] = Field(None, description="User's reflection for the day.")
    notes_content: Optional[str] = Field(None, description="User's notes for the day.")


class DailyPlanCreateRequest(DailyPlanBase):
    allocations: List[DailyPlanAllocationCreate] = Field(
        default_factory=list, description="List of time windows and their allocated tasks."
    )
    # reflection_content and notes_content are optional on creation, inherited from DailyPlanBase


class DailyPlanUpdateRequest(BaseModel):
    allocations: Optional[List[DailyPlanAllocationCreate]] = Field(
        None, description="Updated list of time windows and their allocated tasks. Replaces existing allocations."
    )
    reflection_content: Optional[str] = Field(None, description="Updated user's reflection for the day.")
    notes_content: Optional[str] = Field(None, description="Updated user's notes for the day.")
    model_config = ConfigDict(extra="forbid")


class DailyPlanReviewRequest(BaseModel):
    reflection_content: Optional[str] = Field(None, description="User's reflection for the day.")
    notes_content: Optional[str] = Field(None, description="User's notes for the day.")


class DailyPlanResponse(DailyPlanBase):
    id: ObjectId
    user_id: ObjectId
    allocations: List[DailyPlanAllocationResponse] = []
    reviewed: bool

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)
