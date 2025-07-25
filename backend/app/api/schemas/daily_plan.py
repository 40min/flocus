from datetime import datetime, timezone
from typing import List, Optional

from odmantic import ObjectId
from pydantic import BaseModel, ConfigDict, Field, ValidationInfo, field_validator, model_validator

from app.api.schemas.task import TaskResponse

# Import the TimeWindowResponse from the other module and alias it to avoid name collision
from app.api.schemas.time_window import TimeWindowResponse as ImportedTimeWindowResponse
from app.api.schemas.utils import HasTimeWindow, ensure_time_windows_do_not_overlap


class SelfReflection(BaseModel):
    positive: Optional[str] = Field(None, max_length=1000)
    negative: Optional[str] = Field(None, max_length=1000)
    follow_up_notes: Optional[str] = Field(None, max_length=1000)

    model_config = ConfigDict(from_attributes=True)


# Schema for creating a time window, typically used in request bodies
class TimeWindowCreateRequest(HasTimeWindow):
    description: Optional[str] = Field(None, max_length=100, description="Description of the time window.")
    category_id: ObjectId = Field(..., description="Category ID for the time window.")
    start_time: int = Field(..., description="Start time in minutes since midnight.")
    end_time: int = Field(..., description="End time in minutes since midnight.")
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
    def check_end_time_greater_than_start_time(self, info: ValidationInfo) -> "TimeWindowCreateRequest":
        if self.start_time is not None and self.end_time is not None and self.end_time <= self.start_time:
            raise ValueError("end_time must be greater than start_time")
        return self


# Wrapper schema for responses, including the detailed time window and associated tasks
class PopulatedTimeWindowResponse(BaseModel):
    time_window: ImportedTimeWindowResponse  # Uses the imported schema
    tasks: List[TaskResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)


class DailyPlanBase(BaseModel):
    plan_date: datetime = Field(
        default_factory=lambda: datetime.now(timezone.utc),
        description="The specific date and time for this daily plan.",
    )

    @field_validator("plan_date")
    @classmethod
    def validate_and_convert_plan_date(cls, value: datetime) -> datetime:
        if value.tzinfo is None or value.tzinfo.utcoffset(value) is None:
            raise ValueError("plan_date must be timezone-aware.")
        return value.astimezone(timezone.utc)


class DailyPlanCreateRequest(DailyPlanBase):
    time_windows: List[TimeWindowCreateRequest] = Field(
        default_factory=list, description="List of time windows and their allocated tasks."
    )
    self_reflection: Optional[SelfReflection] = Field(None, description="User's reflection for the day.")


class DailyPlanUpdateRequest(BaseModel):
    time_windows: Optional[List[TimeWindowCreateRequest]] = Field(
        None, description="Updated list of time windows and their allocated tasks. Replaces existing time windows."
    )
    self_reflection: Optional[SelfReflection] = Field(None, description="Updated user's reflection for the day.")

    model_config = ConfigDict(extra="forbid")

    @model_validator(mode="after")
    def check_time_windows_overlap(self) -> "DailyPlanUpdateRequest":
        if self.time_windows is not None:
            ensure_time_windows_do_not_overlap(self.time_windows)
        return self


class DailyPlanResponse(DailyPlanBase):
    id: ObjectId
    user_id: ObjectId
    self_reflection: SelfReflection
    time_windows: List[PopulatedTimeWindowResponse] = []

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)
