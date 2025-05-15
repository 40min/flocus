import uuid
from typing import Optional

from odmantic import ObjectId
from pydantic import BaseModel, ConfigDict, Field, field_validator

from .category import CategoryResponse


class TimeWindowBaseModel(BaseModel):
    """
    Base model for common fields and config.
    Input fields (start_time, end_time) are integers representing minutes since midnight (0-1439).
    These will be validated to be within the correct range.
    """

    name: str = Field(default_factory=lambda: f"TimeWindow_{uuid.uuid4()}")
    category: ObjectId
    user: ObjectId

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)


class TimeWindowRequestSchema(TimeWindowBaseModel):
    start_time: int  # Expected as minutes since midnight (0-1439)
    end_time: int  # Expected as minutes since midnight (0-1439)

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_in_minutes_required(cls, value: int) -> int:
        if not (0 <= value < 24 * 60):
            raise ValueError("Time must be between 0 and 1439 minutes (inclusive).")
        return value


class TimeWindowCreateRequest(TimeWindowRequestSchema):
    pass


class TimeWindowUpdateRequest(BaseModel):  # Not inheriting to make all fields optional easily
    name: Optional[str] = None
    start_time: Optional[int] = None  # Expected as minutes since midnight (0-1439)
    end_time: Optional[int] = None  # Expected as minutes since midnight (0-1439)
    category: Optional[ObjectId] = None
    user: Optional[ObjectId] = None  # Added

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_in_minutes_optional(cls, value: Optional[int]) -> Optional[int]:
        if value is None:
            return None
        if not (0 <= value < 24 * 60):
            raise ValueError("Time must be between 0 and 1439 minutes (inclusive).")
        return value

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)


class TimeWindowResponse(TimeWindowBaseModel):
    id: ObjectId
    start_time: int  # Internally stored as int (minutes)
    end_time: int  # Internally stored as int (minutes)
    category: CategoryResponse
    user_id: ObjectId = Field(..., alias="user")  # Populate from 'user' attribute of the model/dict

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)
