from datetime import datetime
from typing import Optional

from odmantic import Field, Index, Model, ObjectId

from app.api.schemas.task import TaskPriority, TaskStatus


class Task(Model):
    title: str
    description: Optional[str] = None
    status: TaskStatus = Field(default=TaskStatus.TODO)
    priority: TaskPriority = Field(default=TaskPriority.MEDIUM)
    due_date: Optional[datetime] = None
    category_id: Optional[ObjectId] = None
    user_id: ObjectId
    is_deleted: bool = Field(default=False)
    created_at: datetime = Field(default_factory=datetime.utcnow)
    updated_at: datetime = Field(default_factory=datetime.utcnow)

    model_config = {
        "collection": "tasks",
        "indexes": lambda: [
            Index(Task.user_id, Task.title, name="user_title_idx"),
            Index(Task.user_id, Task.status, name="user_status_idx"),
            Index(Task.user_id, Task.priority, name="user_priority_idx"),
            Index(Task.user_id, Task.due_date, name="user_due_date_idx"),
            Index(Task.user_id, Task.category_id, name="user_category_idx"),
        ],
    }
