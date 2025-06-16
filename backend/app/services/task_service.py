from datetime import datetime, timezone
from typing import Dict, List, Optional

from fastapi import Depends
from odmantic import AIOEngine, ObjectId, query

from app.api.schemas.task import (
    LLMSuggestionResponse,
    TaskCreateRequest,
    TaskPriority,
    TaskResponse,
    TaskStatus,
    TaskUpdateRequest,
)
from app.core.enums import LLMActionType
from app.core.exceptions import (
    CategoryNotFoundException,
    NotOwnerException,
    TaskDataMissingError,
    TaskNotFoundException,
    TaskTitleExistsException,
)
from app.db.connection import get_database
from app.db.models.category import Category
from app.db.models.task import Task, TaskStatistics
from app.mappers.task_mapper import TaskMapper
from app.services.llm_service import LLMService

UTC = timezone.utc


class TaskService:
    def __init__(self, engine: AIOEngine = Depends(get_database), llm_service: LLMService = Depends(LLMService)):
        self.engine = engine
        self.llm_service = llm_service

    async def create_task(self, task_data: TaskCreateRequest, current_user_id: ObjectId) -> TaskResponse:
        existing_task_title = await self.engine.find_one(
            Task,
            Task.title == task_data.title,
            Task.user_id == current_user_id,
            Task.is_deleted == False,  # noqa: E712
        )
        if existing_task_title:
            raise TaskTitleExistsException(title=task_data.title)

        category_for_task_creation: Optional[Category] = None
        if task_data.category_id:
            category_for_task_creation = await self.engine.find_one(
                Category,
                Category.id == task_data.category_id,
                Category.user == current_user_id,
                Category.is_deleted == False,  # noqa: E712
            )
            if not category_for_task_creation:
                raise CategoryNotFoundException(
                    category_id=str(task_data.category_id), detail="Active category not found or not owned by user."
                )

        task = TaskMapper.to_model_for_create(schema=task_data, user_id=current_user_id)

        if task.status == TaskStatus.IN_PROGRESS:
            now = datetime.now(UTC)
            task.statistics.was_started_at = now
            task.statistics.was_taken_at = now

        await self.engine.save(task)

        # category_for_task_creation was fetched if task_data.category_id was provided
        return TaskMapper.to_response(task, category_for_task_creation)

    async def get_task_by_id(self, task_id: ObjectId, current_user_id: ObjectId) -> TaskResponse:
        task = await self.engine.find_one(Task, Task.id == task_id)
        if not task:
            raise TaskNotFoundException(task_id=str(task_id))
        if task.user_id != current_user_id:
            raise NotOwnerException(resource="task", detail_override="Not authorized to access this task")
        if task.is_deleted:  # Soft-deleted tasks are not accessible by default
            raise TaskNotFoundException(task_id=str(task_id), detail="Task has been deleted.")

        category_model: Optional[Category] = None
        if task.category_id:
            category_model = await self.engine.find_one(
                Category,
                Category.id == task.category_id,
                Category.user == current_user_id,
                Category.is_deleted == False,  # noqa: E712
            )
            # If category_model is None here, it implies a data integrity issue or
            # the category was deleted after task assignment.

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

        sort_expression = None
        sort_field = {
            "created_at": Task.created_at,
            "title": Task.title,
        }.get(sort_by)

        if sort_field:
            # Apply sorting directly in the database query for certain cases
            sort_expression = query.desc(sort_field) if sort_order == "desc" else query.asc(sort_field)

        tasks_models = await self.engine.find(Task, *query_conditions, sort=sort_expression)

        # Batch fetch categories
        category_ids = {task.category_id for task in tasks_models if task.category_id}
        categories_model_map: Dict[ObjectId, Category] = {}
        if category_ids:
            category_models = await self.engine.find(
                Category,
                Category.id.in_(list(category_ids)),
                Category.user == current_user_id,
                Category.is_deleted == False,  # noqa: E712
            )
            categories_model_map = {cat.id: cat for cat in category_models}

        task_responses = []
        for task_model in tasks_models:
            category_model_for_task = (
                categories_model_map.get(task_model.category_id) if task_model.category_id else None
            )
            task_responses.append(TaskMapper.to_response(task_model, category_model_for_task))

        # Apply Python-side sorting for due_date and priority to match test expectations
        if sort_by == "due_date":
            task_responses = self._sort_tasks_by_due_date(task_responses, sort_order)
        elif sort_by == "priority":
            task_responses = self._sort_tasks_by_priority(task_responses, sort_order)

        return task_responses

    async def get_tasks_by_ids(self, task_ids: List[ObjectId], current_user_id: ObjectId) -> List[TaskResponse]:
        if not task_ids:
            return []

        query_conditions = [
            Task.id.in_(task_ids),
            Task.user_id == current_user_id,
            Task.is_deleted == False,  # noqa: E712
        ]
        tasks_models = await self.engine.find(Task, *query_conditions)

        # Batch fetch categories for these tasks
        category_ids = {task.category_id for task in tasks_models if task.category_id}
        categories_model_map: Dict[ObjectId, Category] = {}
        if category_ids:
            category_models = await self.engine.find(
                Category,
                Category.id.in_(list(category_ids)),
                Category.user == current_user_id,  # Assuming Category.user stores the user_id
                Category.is_deleted == False,  # noqa: E712
            )
            categories_model_map = {cat.id: cat for cat in category_models}

        task_responses = []
        for task_model in tasks_models:
            category_model_for_task = (
                categories_model_map.get(task_model.category_id) if task_model.category_id else None
            )
            task_responses.append(TaskMapper.to_response(task_model, category_model_for_task))

        return task_responses

    async def update_task(
        self, task_id: ObjectId, task_data: TaskUpdateRequest, current_user_id: ObjectId
    ) -> TaskResponse:
        task = await self.engine.find_one(Task, Task.id == task_id)
        if not task:
            raise TaskNotFoundException(task_id=str(task_id))
        if task.user_id != current_user_id:
            raise NotOwnerException(resource="task", detail_override="Not authorized to update this task")
        if task.is_deleted:
            raise TaskNotFoundException(task_id=str(task_id), detail="Cannot update a deleted task.")

        update_payload = task_data.model_dump(exclude_unset=True)

        # Check if title is being updated and verify it's unique
        if "title" in update_payload and update_payload["title"] != task.title:
            existing_task_title = await self.engine.find_one(
                Task,
                Task.title == update_payload["title"],
                Task.user_id == current_user_id,
                Task.id != task_id,
                Task.is_deleted == False,  # noqa: E712
            )
            if existing_task_title:
                raise TaskTitleExistsException(title=update_payload["title"])

        # Validate category if it's being updated
        category_model_for_response: Optional[Category] = None
        if "category_id" in update_payload and update_payload["category_id"] is not None:
            category_model_for_response = await self.engine.find_one(
                Category, Category.id == update_payload["category_id"], Category.user == current_user_id
            )
            if not category_model_for_response or category_model_for_response.is_deleted:
                raise CategoryNotFoundException(
                    category_id=str(update_payload["category_id"]),
                    detail="Active category not found or not owned by user.",
                )

        # Statistics logic needs the status before update
        old_status = task.status

        # Update task using mapper
        task = TaskMapper.to_model_for_update(task, task_data)

        # Statistics logic
        if task.statistics is None:  # Should not happen with default_factory
            task.statistics = TaskStatistics()

        new_status = task_data.status  # From original task_data, not exclude_unset payload

        if new_status is not None and new_status != old_status:
            now = datetime.now(UTC)  # Use timezone-aware datetime
            if new_status == TaskStatus.IN_PROGRESS:
                if task.statistics.was_started_at is None:
                    task.statistics.was_started_at = now
                task.statistics.was_taken_at = now
            elif old_status == TaskStatus.IN_PROGRESS and new_status != TaskStatus.IN_PROGRESS:  # Task was stopped
                task.statistics.was_stopped_at = now
                if task.statistics.was_taken_at:
                    # Ensure was_taken_at is timezone-aware for correct calculation
                    was_taken_at_aware = task.statistics.was_taken_at
                    if was_taken_at_aware and was_taken_at_aware.tzinfo is None:
                        was_taken_at_aware = was_taken_at_aware.replace(tzinfo=UTC)

                    if was_taken_at_aware:  # Recalculate duration with aware times
                        duration = task.statistics.was_stopped_at - was_taken_at_aware
                        task.statistics.lasts_min += int(duration.total_seconds() / 60)

        task.updated_at = datetime.now(UTC)

        await self.engine.save(task)

        # Fetch category for response if not already fetched or if it changed
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

    async def prepare_llm_suggestion(
        self,
        task: Task,  # Takes the Task model instance
        action: LLMActionType,
    ) -> LLMSuggestionResponse:
        original_text: Optional[str] = None
        text_for_llm: str = ""
        field_to_update: str = ""  # Will hold 'title' or 'description'
        base_prompt_override: Optional[str] = None

        match action:
            case LLMActionType.IMPROVE_TITLE:
                if not task.title:  # Check directly on the model
                    raise TaskDataMissingError(detail="Task title is missing for 'improve_title' action.")
                original_text = task.title
                text_for_llm = task.title
                field_to_update = "title"
                base_prompt_override = "Improve the following task title to make it more concise and informative:"
            case LLMActionType.IMPROVE_DESCRIPTION:
                original_text = task.description
                text_for_llm = task.description or ""
                field_to_update = "description"
                base_prompt_override = "Improve the following task description to make it more concise and informative:"
            case LLMActionType.GENERATE_DESCRIPTION_FROM_TITLE:
                if not task.title:  # Check directly on the model
                    raise TaskDataMissingError(
                        detail="Task title is missing for 'generate_description_from_title' action."
                    )
                # original_text remains None as we are generating new content
                text_for_llm = f"Task Title: {task.title}"  # Context for the LLM
                base_prompt_override = (
                    "Based on the following task title, generate a concise and informative task description:"
                )
                field_to_update = "description"
            # No default case needed if LLMActionType enum is exhaustive and validated at API layer
            # However, defensively, one could raise ValueError for an unexpected action.

        suggestion = await self.llm_service.improve_text(
            text_to_process=text_for_llm,
            base_prompt_override=base_prompt_override,
        )

        return LLMSuggestionResponse(
            suggestion=suggestion, original_text=original_text, field_to_update=field_to_update
        )
