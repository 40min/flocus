from datetime import UTC, datetime
from typing import Dict, List, Optional

from fastapi import Depends
from odmantic import AIOEngine, ObjectId, query

from app.api.schemas.task import TaskCreateRequest, TaskPriority, TaskResponse, TaskStatus, TaskUpdateRequest
from app.core.exceptions import (
    CategoryNotFoundException,
    NotOwnerException,
    TaskNotFoundException,
    TaskTitleExistsException,
)
from app.db.connection import get_database
from app.db.models.category import Category
from app.db.models.task import Task
from app.mappers.task_mapper import TaskMapper


class TaskService:
    def __init__(self, engine: AIOEngine = Depends(get_database)):
        self.engine = engine

    async def create_task(self, task_data: TaskCreateRequest, current_user_id: ObjectId) -> TaskResponse:
        existing_task_title = await self.engine.find_one(
            Task,
            Task.title == task_data.title,
            Task.user_id == current_user_id,
            Task.is_deleted == False,  # noqa: E712
        )
        if existing_task_title:
            raise TaskTitleExistsException(title=task_data.title)

        category_model: Optional[Category] = None
        if task_data.category_id:
            category_model = await self.engine.find_one(
                Category, Category.id == task_data.category_id, Category.user == current_user_id
            )
            if not category_model or category_model.is_deleted:
                raise CategoryNotFoundException(
                    category_id=str(task_data.category_id), detail="Active category not found or not owned by user."
                )

        task = TaskMapper.to_model_for_create(schema=task_data, user_id=current_user_id)
        await self.engine.save(task)
        # The category_model was fetched above if category_id was provided
        return TaskMapper.to_response(task, category_model)

    async def get_task_by_id(self, task_id: ObjectId, current_user_id: ObjectId) -> TaskResponse:
        task = await self.engine.find_one(Task, Task.id == task_id)
        if not task:
            raise TaskNotFoundException(task_id=str(task_id))
        if task.user_id != current_user_id:
            raise NotOwnerException(resource="task", detail_override="Not authorized to access this task")

        category_model: Optional[Category] = None
        if task.category_id:
            category_model = await self.engine.find_one(
                Category,
                Category.id == task.category_id,
                Category.user == task.user_id,
                Category.is_deleted == False,  # noqa: E712
            )
            # If category_model is None here, it implies a data integrity issue or
            # the category was deleted after task assignment. TaskMapper handles Optional[Category].

        return TaskMapper.to_response(task, category_model)

    def _sort_tasks_by_due_date(self, tasks: List[TaskResponse], sort_order: str) -> List[TaskResponse]:
        is_desc = sort_order == "desc"

        def due_date_key(t: TaskResponse):
            if t.due_date is None:
                return datetime.max.replace(tzinfo=UTC) if not is_desc else datetime.min.replace(tzinfo=UTC)
            return t.due_date.replace(tzinfo=UTC) if t.due_date.tzinfo is None else t.due_date

        tasks.sort(key=due_date_key, reverse=is_desc)
        return tasks

    def _sort_tasks_by_priority(self, tasks: List[TaskResponse], sort_order: str) -> List[TaskResponse]:
        if sort_order == "desc":
            priority_map = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
            default_value = 100  # Unknowns last
        else:  # asc
            priority_map = {"low": 0, "medium": 1, "high": 2, "urgent": 3}
            default_value = -1  # Unknowns first

        tasks.sort(key=lambda t: (priority_map.get(t.priority, default_value), str(t.id)))
        return tasks

    async def get_all_tasks(
        self,
        current_user_id: ObjectId,
        status_filter: Optional[TaskStatus] = None,
        priority_filter: Optional[TaskPriority] = None,
        category_id_filter: Optional[ObjectId] = None,
        sort_by: Optional[str] = "due_date",
        sort_order: Optional[str] = "asc",
    ) -> List[TaskResponse]:
        query_conditions = [Task.user_id == current_user_id, Task.is_deleted == False]  # noqa: E712
        if status_filter:
            query_conditions.append(Task.status == status_filter)
        if priority_filter:
            query_conditions.append(Task.priority == priority_filter)
        if category_id_filter:
            query_conditions.append(Task.category_id == category_id_filter)

        sort_field_map = {
            "due_date": Task.due_date,
            "priority": Task.priority,
            "created_at": Task.created_at,
            "title": Task.title,
        }
        sort_field = sort_field_map.get(sort_by, Task.due_date)

        if sort_by not in ["due_date", "priority"]:
            sort_expression = query.desc(sort_field) if sort_order == "desc" else query.asc(sort_field)
            tasks_models = await self.engine.find(Task, *query_conditions, sort=sort_expression)
        else:
            tasks_models = await self.engine.find(Task, *query_conditions)

        # Batch fetch categories
        category_ids = {task.category_id for task in tasks_models if task.category_id}
        categories_model_map: Dict[ObjectId, Category] = {}
        if category_ids:
            category_models = await self.engine.find(
                Category,
                Category.id.in_(list(category_ids)),  # Corrected: query.In to Model.field.in_
                Category.user == current_user_id,  # Reverted: Category.user_id to Category.user
                Category.is_deleted == False,  # noqa: E712
            )
            categories_model_map = {cat.id: cat for cat in category_models}

        task_responses = []
        for task_model in tasks_models:
            category_model_for_task = (
                categories_model_map.get(task_model.category_id) if task_model.category_id else None
            )
            task_responses.append(TaskMapper.to_response(task_model, category_model_for_task))

        if sort_by == "due_date":
            task_responses = self._sort_tasks_by_due_date(task_responses, sort_order)  # type: ignore
        elif sort_by == "priority":
            task_responses = self._sort_tasks_by_priority(task_responses, sort_order)

        return task_responses

    async def update_task(
        self, task_id: ObjectId, task_data: TaskUpdateRequest, current_user_id: ObjectId
    ) -> TaskResponse:
        task = await self.engine.find_one(Task, Task.id == task_id, Task.is_deleted == False)  # noqa: E712
        if not task:
            raise TaskNotFoundException(task_id=str(task_id))
        if task.user_id != current_user_id:
            raise NotOwnerException(resource="task", detail_override="Not authorized to update this task")

        # Check if title is being updated and verify it's unique
        update_data = task_data.model_dump(exclude_unset=True)
        if "title" in update_data and update_data["title"] != task.title:
            existing_task_title = await self.engine.find_one(
                Task,
                Task.title == update_data["title"],
                Task.user_id == current_user_id,
                Task.id != task_id,
                Task.is_deleted == False,  # noqa: E712
            )
            if existing_task_title:
                raise TaskTitleExistsException(title=update_data["title"])

        # Validate category if it's being updated
        category_model_for_response: Optional[Category] = None
        if "category_id" in update_data and update_data["category_id"] is not None:
            category_model_for_response = await self.engine.find_one(
                Category, Category.id == update_data["category_id"], Category.user == current_user_id
            )
            if not category_model_for_response or category_model_for_response.is_deleted:
                raise CategoryNotFoundException(
                    category_id=str(update_data["category_id"]),
                    detail="Active category not found or not owned by user.",
                )

        # Update task using mapper
        task = TaskMapper.to_model_for_update(task, task_data)
        await self.engine.save(task)

        # If category wasn't updated but task has one, fetch it for response
        if not category_model_for_response and task.category_id:
            category_model_for_response = await self.engine.find_one(
                Category,
                Category.id == task.category_id,
                Category.user == current_user_id,
                Category.is_deleted == False,  # noqa: E712
            )

        return TaskMapper.to_response(task, category_model_for_response)

    async def delete_task(self, task_id: ObjectId, current_user_id: ObjectId) -> bool:
        task = await self.engine.find_one(Task, Task.id == task_id)
        if not task:
            raise TaskNotFoundException(task_id=str(task_id))
        if task.user_id != current_user_id:
            raise NotOwnerException(resource="task", detail_override="Not authorized to delete this task")

        if not task.is_deleted:
            task.is_deleted = True
            task.updated_at = datetime.now(UTC)
            await self.engine.save(task)
        return True
