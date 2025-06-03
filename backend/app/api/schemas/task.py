from datetime import datetime, timezone
from enum import Enum
from typing import Optional

from odmantic import ObjectId
from pydantic import BaseModel, ConfigDict, Field

from app.api.schemas.category import CategoryResponse


# Module-level helper function for consistent datetime serialization
def _serialize_datetime_to_iso_z(dt: datetime) -> str:
    # Odmantic provides naive datetimes from DB (representing UTC).
    # We explicitly treat them as UTC and format with 'Z'.
    if dt.tzinfo is not None:
        # If somehow it's already aware, ensure it's UTC then format
        dt_utc = dt.astimezone(timezone.utc)
    else:
        # If naive, assume it's UTC and make it aware
        dt_utc = dt.replace(tzinfo=timezone.utc)

    # Format to ISO string with 'Z' for UTC, keeping milliseconds
    return dt_utc.strftime("%Y-%m-%dT%H:%M:%S.%f")[:-3] + "Z"


class TaskStatus(str, Enum):
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    DONE = "done"
    BLOCKED = "blocked"


class TaskPriority(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    URGENT = "urgent"


class TaskBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    status: TaskStatus = Field(default=TaskStatus.PENDING)
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)
    due_date: Optional[datetime] = None  # This will also use the encoder
    category_id: Optional[ObjectId] = None


class TaskCreateRequest(TaskBase):
    pass


class TaskStatisticsSchema(BaseModel):
    was_started_at: Optional[datetime] = None
    was_taken_at: Optional[datetime] = None
    was_stopped_at: Optional[datetime] = None
    lasts_min: Optional[int] = Field(default=0)

    model_config = ConfigDict(from_attributes=True, json_encoders={datetime: _serialize_datetime_to_iso_z})


class TaskUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None  # This will also use the encoder
    category_id: Optional[ObjectId] = None


class TaskResponse(TaskBase):
    id: ObjectId
    user_id: ObjectId
    category: Optional[CategoryResponse] = None
    is_deleted: bool = False
    created_at: datetime  # This will also use the encoder
    updated_at: datetime  # This will also use the encoder
    statistics: Optional[TaskStatisticsSchema] = None

    model_config = ConfigDict(
        from_attributes=True,
        arbitrary_types_allowed=True,
        use_enum_values=True,
        json_encoders={datetime: _serialize_datetime_to_iso_z},
    )
