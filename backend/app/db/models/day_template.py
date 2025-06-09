from typing import List, Optional

from odmantic import EmbeddedModel, Field, Model, ObjectId  # Changed import
from pydantic import field_validator, model_validator  # Removed PydanticBaseModel import


class EmbeddedTimeWindowSchema(EmbeddedModel):  # Changed base class
    id: ObjectId = Field(default_factory=ObjectId)
    description: Optional[str] = Field(None, max_length=100)
    start_time: int  # minutes since midnight
    end_time: int  # minutes since midnight
    category_id: ObjectId

    @field_validator("start_time", "end_time")
    @classmethod
    def validate_time_in_minutes(cls, value: int) -> int:
        if not (0 <= value < 24 * 60):
            raise ValueError("Time must be between 0 and 1439 minutes (inclusive).")
        return value

    @model_validator(mode="after")
    def check_end_time_greater_than_start_time(cls, values: "EmbeddedTimeWindowSchema") -> "EmbeddedTimeWindowSchema":
        if values.start_time is not None and values.end_time is not None and values.end_time <= values.start_time:
            raise ValueError("end_time must be greater than start_time")
        return values


class DayTemplate(Model):
    name: str
    description: Optional[str] = None
    user_id: ObjectId  # Owner of the template
    time_windows: List[EmbeddedTimeWindowSchema] = Field(default_factory=list)

    model_config = {
        "collection": "day_templates",
    }
