from datetime import UTC, datetime
from typing import Optional

from odmantic import EmbeddedModel, Field, Index, Model, ObjectId

from app.api.schemas.task import TaskPriority, TaskStatus


class TaskStatistics(EmbeddedModel):
    was_started_at: Optional[datetime] = None
    was_taken_at: Optional[datetime] = None
    was_stopped_at: Optional[datetime] = None
    lasts_min: int = Field(default=0)

    model_config = {"extra": "ignore"}  # Or "forbid" if you want to be strict


class Task(Model):
    title: str
    description: Optional[str] = None
    status: TaskStatus = Field(default=TaskStatus.PENDING)
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)
    due_date: Optional[datetime] = None
    category_id: Optional[ObjectId] = None
    user_id: ObjectId
    is_deleted: bool = Field(default=False)
    statistics: TaskStatistics = Field(default_factory=TaskStatistics)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = {
        "collection": "tasks",
        "indexes": lambda: [
            Index(
                Task.user_id,
                Task.title,
                name="user_title_unique_idx",
                unique=True,
                partialFilterExpression={"is_deleted": False},
            ),
            Index(Task.user_id, Task.status, Task.is_deleted, name="user_status_deleted_idx"),
            Index(Task.user_id, Task.priority, Task.is_deleted, name="user_priority_deleted_idx"),
            Index(Task.user_id, Task.due_date, Task.is_deleted, name="user_due_date_deleted_idx"),
            Index(Task.user_id, Task.category_id, Task.is_deleted, name="user_category_deleted_idx"),
            Index(Task.user_id, Task.is_deleted, name="user_deleted_idx"),
        ],
    }
