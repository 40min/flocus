from datetime import datetime
from typing import List, Optional

from fastapi import Depends
from odmantic import AIOEngine, ObjectId, query

from app.api.schemas.category import CategoryResponse
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


class TaskService:
    def __init__(self, engine: AIOEngine = Depends(get_database)):
        self.engine = engine

    async def _build_task_response(self, task_model: Task) -> TaskResponse:
        category_response: Optional[CategoryResponse] = None
        if task_model.category_id:
            category_model = await self.engine.find_one(
                Category,
                Category.id == task_model.category_id,
                Category.user == task_model.user_id,
                Category.is_deleted == False,  # noqa: E712
            )
            if category_model:
                category_response = CategoryResponse.model_validate(category_model)

        response_data = {
            "id": task_model.id,
            "title": task_model.title,
            "description": task_model.description,
            "status": task_model.status,
            "priority": task_model.priority,
            "due_date": task_model.due_date,
            "category_id": task_model.category_id,
            "user_id": task_model.user_id,
            "category": category_response,
            "is_deleted": task_model.is_deleted,
            "created_at": task_model.created_at,
            "updated_at": task_model.updated_at,
        }
        return TaskResponse.model_validate(response_data)

    async def create_task(self, task_data: TaskCreateRequest, current_user_id: ObjectId) -> TaskResponse:
        existing_task_title = await self.engine.find_one(
            Task,
            Task.title == task_data.title,
            Task.user_id == current_user_id,
            Task.is_deleted == False,  # noqa: E712
        )
        if existing_task_title:
            raise TaskTitleExistsException(title=task_data.title)

        if task_data.category_id:
            category = await self.engine.find_one(
                Category, Category.id == task_data.category_id, Category.user == current_user_id
            )
            if not category or category.is_deleted:
                raise CategoryNotFoundException(
                    category_id=str(task_data.category_id), detail="Active category not found or not owned by user."
                )

        task_dict = task_data.model_dump()
        task = Task(**task_dict, user_id=current_user_id, created_at=datetime.utcnow(), updated_at=datetime.utcnow())
        await self.engine.save(task)
        return await self._build_task_response(task)

    async def get_task_by_id(self, task_id: ObjectId, current_user_id: ObjectId) -> TaskResponse:
        task = await self.engine.find_one(Task, Task.id == task_id)
        if not task:
            raise TaskNotFoundException(task_id=str(task_id))
        if task.user_id != current_user_id:
            raise NotOwnerException(resource="task", detail_override="Not authorized to access this task")
        return await self._build_task_response(task)

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

        sort_expression = query.desc(sort_field) if sort_order == "desc" else query.asc(sort_field)

        tasks_models = await self.engine.find(Task, *query_conditions, sort=sort_expression)
        return [await self._build_task_response(task) for task in tasks_models]

    async def update_task(
        self, task_id: ObjectId, task_data: TaskUpdateRequest, current_user_id: ObjectId
    ) -> TaskResponse:
        task = await self.engine.find_one(Task, Task.id == task_id, Task.is_deleted == False)  # noqa: E712
        if not task:
            raise TaskNotFoundException(task_id=str(task_id))
        if task.user_id != current_user_id:
            raise NotOwnerException(resource="task", detail_override="Not authorized to update this task")

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

        if "category_id" in update_data and update_data["category_id"] is not None:
            category = await self.engine.find_one(
                Category, Category.id == update_data["category_id"], Category.user == current_user_id
            )
            if not category or category.is_deleted:
                raise CategoryNotFoundException(
                    category_id=str(update_data["category_id"]),
                    detail="Active category not found or not owned by user.",
                )

        for field, value in update_data.items():
            setattr(task, field, value)
        task.updated_at = datetime.utcnow()
        await self.engine.save(task)
        return await self._build_task_response(task)

    async def delete_task(self, task_id: ObjectId, current_user_id: ObjectId) -> bool:
        task = await self.engine.find_one(Task, Task.id == task_id)
        if not task:
            raise TaskNotFoundException(task_id=str(task_id))
        if task.user_id != current_user_id:
            raise NotOwnerException(resource="task", detail_override="Not authorized to delete this task")

        if not task.is_deleted:
            task.is_deleted = True
            task.updated_at = datetime.utcnow()
            await self.engine.save(task)
        return True
