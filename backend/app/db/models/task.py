from datetime import UTC, datetime
from typing import Optional

from odmantic import Field, Index, Model, ObjectId

from app.api.schemas.task import TaskPriority, TaskStatus


class Task(Model):
    title: str
    description: Optional[str] = None
    status: TaskStatus = Field(default=TaskStatus.PENDING)
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)
    due_date: Optional[datetime] = None
    category_id: Optional[ObjectId] = None
    user_id: ObjectId
    is_deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=lambda: datetime.now(UTC))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(UTC))

    model_config = {
        "collection": "tasks",
        "indexes": lambda: [
            Index(Task.user_id, Task.title, Task.is_deleted, name="user_title_deleted_idx", unique=True),
            Index(Task.user_id, Task.status, Task.is_deleted, name="user_status_deleted_idx"),
            Index(Task.user_id, Task.priority, Task.is_deleted, name="user_priority_deleted_idx"),
            Index(Task.user_id, Task.due_date, Task.is_deleted, name="user_due_date_deleted_idx"),
            Index(Task.user_id, Task.category_id, Task.is_deleted, name="user_category_deleted_idx"),
            Index(Task.user_id, Task.is_deleted, name="user_deleted_idx"),
        ],
    }
