from datetime import datetime
from enum import Enum
from typing import Optional

from odmantic import ObjectId
from pydantic import BaseModel, ConfigDict, Field

from app.api.schemas.category import CategoryResponse


class TaskStatus(str, Enum):
    PENDING = "pending"  # Renamed from TODO
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
    status: TaskStatus = Field(default=TaskStatus.PENDING)  # Updated default
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)
    due_date: Optional[datetime] = None
    category_id: Optional[ObjectId] = None


class TaskCreateRequest(TaskBase):
    pass


class TaskStatisticsSchema(BaseModel):
    was_started_at: Optional[datetime] = None
    was_taken_at: Optional[datetime] = None
    was_stopped_at: Optional[datetime] = None
    lasts_min: Optional[int] = Field(default=0)

    model_config = ConfigDict(from_attributes=True)


class TaskUpdateRequest(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=500)
    status: Optional[TaskStatus] = None
    priority: Optional[TaskPriority] = None
    due_date: Optional[datetime] = None
    category_id: Optional[ObjectId] = None


class TaskResponse(TaskBase):
    id: ObjectId
    user_id: ObjectId
    category: Optional[CategoryResponse] = None
    is_deleted: bool = False
    created_at: datetime
    updated_at: datetime
    statistics: Optional[TaskStatisticsSchema] = None

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True, use_enum_values=True)
