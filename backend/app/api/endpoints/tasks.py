from typing import List, Optional

from fastapi import APIRouter, Depends, Path, Query, status
from odmantic import AIOEngine  # For direct task fetching
from odmantic import ObjectId

from app.api.schemas.task import (
    LLMSuggestionResponse,
    TaskCreateRequest,
    TaskPriority,
    TaskResponse,
    TaskStatus,
    TaskUpdateRequest,
)
from app.core.dependencies import (  # get_current_active_user_id for other endpoints
    get_current_active_user_id,
    get_current_user,
)
from app.core.enums import LLMActionType  # Added
from app.core.exceptions import NotOwnerException, TaskNotFoundException  # For direct task fetching
from app.db.connection import get_database  # For direct task fetching
from app.db.models.task import Task as TaskModel  # Added Task model import
from app.db.models.user import User
from app.services.task_service import TaskService

router = APIRouter()


@router.post(
    "",
    response_model=TaskResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Task",
)
async def create_task(
    task_data: TaskCreateRequest,
    service: TaskService = Depends(TaskService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.create_task(task_data=task_data, current_user_id=current_user_id)


@router.get(
    "",
    response_model=List[TaskResponse],
    summary="Get all Tasks for the current user",
)
async def get_all_tasks(
    status_filter: Optional[TaskStatus] = Query(None, alias="status", description="Filter tasks by status"),
    priority_filter: Optional[TaskPriority] = Query(None, alias="priority", description="Filter tasks by priority"),
    category_id_filter: Optional[ObjectId] = Query(None, alias="categoryId", description="Filter tasks by category ID"),
    sort_by: Optional[str] = Query(
        "due_date", description="Field to sort by (e.g., 'due_date', 'priority', 'created_at')"
    ),
    sort_order: Optional[str] = Query("asc", description="Sort order ('asc' or 'desc')"),
    service: TaskService = Depends(TaskService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.get_all_tasks(
        current_user_id=current_user_id,
        status_filter=status_filter,
        priority_filter=priority_filter,
        category_id_filter=category_id_filter,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Get a specific Task by ID",
)
async def get_task_by_id(
    task_id: ObjectId = Path(..., description="The ID of the task to retrieve"),
    service: TaskService = Depends(TaskService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.get_task_by_id(task_id=task_id, current_user_id=current_user_id)


@router.get(
    "/{task_id}/llm-suggestions",
    response_model=LLMSuggestionResponse,
    summary="Get LLM suggestions for a task field",
)
async def get_llm_suggestion_for_task(
    action: LLMActionType,
    task_id: ObjectId = Path(..., description="The ID of the task"),
    current_user: User = Depends(get_current_user),
    task_service: TaskService = Depends(TaskService),
    engine: AIOEngine = Depends(get_database),  # Inject engine for direct Task model fetching
):
    # Fetch the Task model directly, not TaskResponse schema
    task_model = await engine.find_one(TaskModel, TaskModel.id == task_id)

    if not task_model:
        raise TaskNotFoundException(task_id=str(task_id))
    if task_model.user_id != current_user.id:
        raise NotOwnerException(resource="task")
    if task_model.is_deleted:
        raise TaskNotFoundException(task_id=str(task_id), detail="Task has been deleted.")

    suggestion_response = await task_service.prepare_llm_suggestion(task=task_model, action=action)
    return suggestion_response


@router.get(
    "/batch/",
    response_model=List[TaskResponse],
    summary="Get multiple Tasks by a list of IDs",
)
async def get_tasks_by_ids(
    task_ids: List[ObjectId] = Query(..., alias="ids", description="List of task IDs to retrieve"),
    service: TaskService = Depends(TaskService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.get_tasks_by_ids(task_ids=task_ids, current_user_id=current_user_id)


@router.patch(
    "/{task_id}",
    response_model=TaskResponse,
    summary="Update a Task",
)
async def update_task(
    task_data: TaskUpdateRequest,
    task_id: ObjectId = Path(..., description="The ID of the task to update"),
    service: TaskService = Depends(TaskService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.update_task(task_id=task_id, task_data=task_data, current_user_id=current_user_id)


@router.delete(
    "/{task_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a Task",
)
async def delete_task(
    task_id: ObjectId = Path(..., description="The ID of the task to delete"),
    service: TaskService = Depends(TaskService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    await service.delete_task(task_id=task_id, current_user_id=current_user_id)
    return None
