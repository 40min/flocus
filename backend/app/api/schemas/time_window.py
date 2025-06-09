from typing import Optional

from odmantic import ObjectId
from pydantic import BaseModel, ConfigDict, Field, field_validator, model_validator

from app.api.schemas.category import CategoryResponse


class TimeWindowInputSchema(BaseModel):
    """
    Schema for providing TimeWindow data when creating or updating a DayTemplate.
    Input fields (start_time, end_time) are integers representing minutes since midnight (0-1439).
    These will be validated to be within the correct range.
    """

    description: Optional[str] = Field(None, min_length=1, max_length=100)
    category_id: ObjectId
    start_time: int
    end_time: int

    model_config = ConfigDict(populate_by_name=True, arbitrary_types_allowed=True)

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_in_minutes(cls, value: int) -> int:
        if not (0 <= value < 24 * 60):
            raise ValueError("Time must be between 0 and 1439 minutes (inclusive).")
        return value

    @model_validator(mode="after")
    def check_end_time_greater_than_start_time(cls, values: "TimeWindowInputSchema") -> "TimeWindowInputSchema":
        # Pydantic v2: model_validator receives the model instance (or dict if from_attributes=False)
        # For Pydantic v2, it's better to access attributes directly from `values` (which is the model instance here)
        # if values.start_time is not None and values.end_time is not None and values.end_time <= values.start_time:
        # However, the PRD implies this is for Pydantic v1 style `data` argument. Let's try to keep it if it works.
        # Rechecking Pydantic docs, for `mode="after"`, the first arg is the model instance itself.
        # So, `data.start_time` and `data.end_time` should work assuming `data` is the model instance.
        if values.start_time is not None and values.end_time is not None and values.end_time <= values.start_time:
            raise ValueError("end_time must be greater than start_time")
        return values


class TimeWindowResponse(BaseModel):
    """
    Schema for representing a TimeWindow when included in a DayTemplateResponse.
    """

    id: ObjectId  # Added for frontend identification
    description: Optional[str]
    start_time: int
    end_time: int
    category: CategoryResponse

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)
