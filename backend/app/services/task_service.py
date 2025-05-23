from datetime import UTC, datetime
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
        task = Task(**task_dict, user_id=current_user_id, created_at=datetime.now(UTC), updated_at=datetime.now(UTC))
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
        sort_field = sort_field_map.get(sort_by, Task.due_date)  # Default to Task.due_date if sort_by is not in map

        # Initial fetch from DB - for due_date and priority, we might re-sort in Python
        # For other fields, DB sort is fine.
        if sort_by not in ["due_date", "priority"]:
            sort_expression = query.desc(sort_field) if sort_order == "desc" else query.asc(sort_field)
            tasks_models = await self.engine.find(Task, *query_conditions, sort=sort_expression)
        else:
            # Fetch without DB sort if we're going to sort in Python
            tasks_models = await self.engine.find(Task, *query_conditions)

        task_responses = [await self._build_task_response(task) for task in tasks_models]

        if sort_by == "due_date":
            is_desc = sort_order == "desc"

            def due_date_key(t: TaskResponse):
                if t.due_date is None:
                    # For asc, None is max (last); for desc, None is min (last after reverse)
                    return datetime.max.replace(tzinfo=UTC) if not is_desc else datetime.min.replace(tzinfo=UTC)
                # Ensure dates are aware for comparison
                return t.due_date.replace(tzinfo=UTC) if t.due_date.tzinfo is None else t.due_date

            task_responses.sort(key=due_date_key, reverse=is_desc)
        elif sort_by == "priority":
            if sort_order == "desc":
                # For descending: urgent (0) > high (1) > medium (2) > low (3)
                # Unknowns (100) will be last
                desc_priority_map = {"urgent": 0, "high": 1, "medium": 2, "low": 3}
                task_responses.sort(key=lambda t: (desc_priority_map.get(t.priority, 100), str(t.id)))
            else:  # asc
                # For ascending: low (0) < medium (1) < high (2) < urgent (3)
                # Unknowns (-1) will be first
                asc_priority_map = {"low": 0, "medium": 1, "high": 2, "urgent": 3}
                task_responses.sort(key=lambda t: (asc_priority_map.get(t.priority, -1), str(t.id)))
        # For other sort_by fields, if not sorted by DB, they remain in fetched order or need explicit sort here.
        # Current test cases only cover due_date, priority, created_at, title.
        # created_at and title are fine with DB sort.

        return task_responses

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

        # Explicitly update fields to avoid potential issues with setattr and Pydantic/Odmantic defaults
        if "title" in update_data:
            task.title = update_data["title"]
        if "description" in update_data:  # Allows setting description to None if explicitly passed
            task.description = update_data["description"]
        if (
            "status" in update_data and update_data["status"] is not None
        ):  # Ensure not to set to None if None was in update_data
            task.status = update_data["status"]
        if "priority" in update_data and update_data["priority"] is not None:  # Ensure not to set to None
            task.priority = update_data["priority"]
        if "due_date" in update_data:  # Allows setting due_date to None
            task.due_date = update_data["due_date"]
        if "category_id" in update_data:  # Allows setting category_id to None
            task.category_id = update_data["category_id"]
        # is_deleted is handled by a separate delete endpoint

        task.updated_at = datetime.now(UTC)
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
            task.updated_at = datetime.now(UTC)
            await self.engine.save(task)
        return True
