from datetime import UTC, datetime
from typing import Optional

from odmantic import ObjectId

from app.api.schemas.category import CategoryResponse
from app.api.schemas.task import TaskCreateRequest, TaskResponse
from app.db.models.category import Category
from app.db.models.task import Task


class TaskMapper:
    @staticmethod
    def to_response(task: Task, category_model: Optional[Category]) -> TaskResponse:
        category_response: Optional[CategoryResponse] = None
        if category_model:
            category_response = CategoryResponse.model_validate(category_model)

        return TaskResponse(
            id=task.id,
            title=task.title,
            description=task.description,
            status=task.status,
            priority=task.priority,
            due_date=task.due_date,
            category_id=task.category_id,
            user_id=task.user_id,
            category=category_response,
            is_deleted=task.is_deleted,
            created_at=task.created_at,
            updated_at=task.updated_at,
        )

    @staticmethod
    def to_model_for_create(schema: TaskCreateRequest, user_id: ObjectId) -> Task:
        now_utc = datetime.now(UTC)
        task_data = schema.model_dump()
        return Task(**task_data, user_id=user_id, is_deleted=False, created_at=now_utc, updated_at=now_utc)
