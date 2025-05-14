import uuid
from typing import Any, Optional

from odmantic import ObjectId
from pydantic import BaseModel, ConfigDict, Field, field_serializer, field_validator

from .category import CategoryResponse


# Helper to convert "HH:MM" string to minutes since start of day
def hhmm_to_minutes(hhmm_str: str) -> int:
    try:
        h, m = map(int, hhmm_str.split(":"))
        if not (0 <= h <= 23 and 0 <= m <= 59):
            raise ValueError("Hour must be 0-23 and Minute must be 0-59")
        return h * 60 + m
    except ValueError:  # Catches both split errors and int conversion errors
        raise ValueError(f"Invalid time format '{hhmm_str}', must be HH:MM.")


# Helper to convert minutes since start of day to "HH:MM" string
def minutes_to_hhmm(minutes: int) -> str:
    if not (0 <= minutes < 24 * 60):
        raise ValueError("Minutes must be between 0 and 1439 (inclusive).")
    h = minutes // 60
    m = minutes % 60
    return f"{h:02d}:{m:02d}"


class TimeWindowBaseModel(BaseModel):
    """
    Base model for common fields and config.
    Input fields (start_time, end_time) are strings "HH:MM".
    These will be validated but not converted to int here.
    Conversion to int for the DB model should happen in the service layer
    or when constructing the DB model instance.
    """

    name: str = Field(default_factory=lambda: f"TimeWindow_{uuid.uuid4()}")
    category: ObjectId
    user: ObjectId  # Added

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)


class TimeWindowRequestSchema(TimeWindowBaseModel):
    start_time: str  # Expected as "HH:MM"
    end_time: str  # Expected as "HH:MM"

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_string_format(cls, value: str) -> str:
        # This validator just checks the format "HH:MM"
        # It does not convert to int. The service layer will handle that.
        try:
            h, m = map(int, value.split(":"))
            if not (0 <= h <= 23 and 0 <= m <= 59):
                raise ValueError("Hour must be 0-23 and Minute must be 0-59.")
        except ValueError:
            raise ValueError(f"Invalid time format: '{value}'. Must be HH:MM.")
        return value


class TimeWindowCreateRequest(TimeWindowRequestSchema):
    pass


class TimeWindowUpdateRequest(BaseModel):  # Not inheriting to make all fields optional easily
    name: Optional[str] = None
    start_time: Optional[str] = None  # Expected as "HH:MM"
    end_time: Optional[str] = None  # Expected as "HH:MM"
    category: Optional[ObjectId] = None
    user: Optional[ObjectId] = None  # Added

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_optional_time_string_format(cls, value: Optional[str]) -> Optional[str]:
        if value is None:
            return None
        # Reuse the validation logic from TimeWindowRequestSchema
        try:
            h, m = map(int, value.split(":"))
            if not (0 <= h <= 23 and 0 <= m <= 59):
                raise ValueError("Hour must be 0-23 and Minute must be 0-59.")
        except ValueError:
            raise ValueError(f"Invalid time format: '{value}'. Must be HH:MM.")
        return value

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)


class TimeWindowResponse(TimeWindowBaseModel):
    id: ObjectId
    start_time: int  # Internally stored as int (minutes)
    end_time: int  # Internally stored as int (minutes)
    category: CategoryResponse
    user_id: ObjectId = Field(..., alias="user")  # Populate from 'user' attribute of the model/dict

    @field_validator("start_time", "end_time", mode="before")  # mode='before' to catch input before type validation
    @classmethod
    def time_to_int(cls, value: Any) -> int:
        if isinstance(value, str):
            try:
                return hhmm_to_minutes(value)
            except ValueError as e:
                raise ValueError(f"Invalid time string: {e}")
        elif isinstance(value, int):
            return value  # Already an int, pass through
        raise TypeError("Invalid type for time field, must be int or HH:MM string")

    @field_serializer("start_time", "end_time")
    def serialize_time_to_hhmm(self, v: int, _info) -> str:
        # Serializes the internal integer minutes to "HH:MM" string for the JSON response
        return minutes_to_hhmm(v)

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)
