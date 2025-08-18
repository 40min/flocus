from datetime import UTC, datetime
from typing import Optional

from odmantic import ObjectId

from app.api.schemas.category import CategoryResponse
from app.api.schemas.task import TaskCreateRequest, TaskResponse, TaskStatisticsSchema, TaskUpdateRequest
from app.db.models.category import Category
from app.db.models.task import Task, TaskStatistics
from app.mappers.base_mapper import BaseMapper


class TaskMapper(BaseMapper):
    _model_class = Task

    @staticmethod
    def to_response(task: Task, category_model: Optional[Category]) -> TaskResponse:
        category_response: Optional[CategoryResponse] = None
        if category_model:
            category_response = CategoryResponse.model_validate(category_model)

        statistics_response: Optional[TaskStatisticsSchema] = None
        if task.statistics:  # Should always be true due to default_factory
            statistics_response = TaskStatisticsSchema.model_validate(task.statistics.model_dump())

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
            statistics=statistics_response,
        )

    @staticmethod
    def to_model_for_create(schema: TaskCreateRequest, user_id: ObjectId) -> Task:
        now_utc = datetime.now(UTC)
        task_data = schema.model_dump()
        return Task(
            **task_data,
            user_id=user_id,
            is_deleted=False,
            created_at=now_utc,
            updated_at=now_utc,
            statistics=TaskStatistics(),
        )

    @classmethod
    def to_model_for_update(cls, task: Task, schema: TaskUpdateRequest) -> Task:
        """Updates a Task model with data from an update request schema.

        Args:
            task: The existing Task model to update
            schema: The update request containing new values

        Returns:
            The updated Task model
        """
        update_data = schema.model_dump(exclude_unset=True)

        # Exclude add_lasts_minutes as it's handled separately in the service
        update_data.pop("add_lasts_minutes", None)

        for field, value in update_data.items():
            if field in cls._nullable_fields or (field in cls._non_nullable_fields and value is not None):
                setattr(task, field, value)

        return task
