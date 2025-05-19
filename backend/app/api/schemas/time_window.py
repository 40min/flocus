import uuid
from typing import Optional

from odmantic import ObjectId
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from .category import CategoryResponse


class TimeWindowBaseModel(BaseModel):
    """
    Base model for common fields and config.
    Input fields (start_time, end_time) are integers representing minutes since midnight (0-1439).
    These will be validated to be within the correct range.
    """

    name: str = Field(default_factory=lambda: f"TimeWindow_{uuid.uuid4()}")
    category: ObjectId
    day_template_id: ObjectId

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

    @model_validator(mode="after")
    def check_end_time_greater_than_start_time(cls, data: "TimeWindowRequestSchema") -> "TimeWindowRequestSchema":
        if data.start_time is not None and data.end_time is not None and data.end_time <= data.start_time:
            raise ValueError("end_time must be greater than start_time")
        return data


class TimeWindowCreateRequest(TimeWindowRequestSchema):
    pass


class TimeWindowUpdateRequest(BaseModel):  # Not inheriting to make all fields optional easily
    name: Optional[str] = None
    start_time: Optional[int] = None  # Expected as minutes since midnight (0-1439)
    end_time: Optional[int] = None  # Expected as minutes since midnight (0-1439)
    category: Optional[ObjectId] = None
    day_template_id: Optional[ObjectId] = None

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_in_minutes_optional(cls, value: Optional[int]) -> Optional[int]:
        if value is None:
            return None
        if not (0 <= value < 24 * 60):
            raise ValueError("Time must be between 0 and 1439 minutes (inclusive).")
        return value

    @model_validator(mode="after")
    def check_end_time_greater_than_start_time_optional(
        cls, data: "TimeWindowUpdateRequest"
    ) -> "TimeWindowUpdateRequest":
        if data.start_time is not None and data.end_time is not None:
            if data.end_time <= data.start_time:
                raise ValueError("end_time must be greater than start_time")
        # If one is None and the other is not, this implies a partial update.
        # If both are None, no time validation is needed.
        # If both are present, the above check applies.
        return data

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)


class TimeWindowResponse(TimeWindowBaseModel):
    id: ObjectId
    start_time: int  # Internally stored as int (minutes)
    end_time: int  # Internally stored as int (minutes)
    category: CategoryResponse
    day_template_id: ObjectId  # Explicitly add day_template_id here as it's not aliased
    user_id: ObjectId = Field(..., alias="user")  # Populate from 'user' attribute of the model/dict
    is_deleted: bool = False

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)
