from typing import List, Optional, Literal # Added Literal

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from odmantic import ObjectId

from app.api.schemas.task import (
    TaskCreateRequest,
    # TaskImproveRequest, # Commented out old schema
    LLMSuggestionResponse,    # Added import
    # TaskApplySuggestionRequest, # Commented out as the endpoint is being removed
    TaskPriority,
    TaskResponse,
    TaskStatus,
    TaskUpdateRequest,
)
from app.core.dependencies import get_current_user, get_current_active_user_id # get_current_active_user_id for other endpoints
from app.core.enums import LLMActionType # Added
from app.db.models.user import User
from app.db.models.task import Task as TaskModel # Added Task model import
from app.services.llm_service import LLMService
from app.services.task_service import TaskService
from app.core.exceptions import NotOwnerException, TaskNotFoundException # For direct task fetching
from odmantic import AIOEngine # For direct task fetching
from app.db.connection import get_database # For direct task fetching


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
    current_user_id: ObjectId = Depends(get_current_active_user_id), # Original: Uses get_current_active_user_id
):
    return await service.get_task_by_id(task_id=task_id, current_user_id=current_user_id)


# Old endpoint - to be removed or commented out
# @router.post(
#     "/{task_id}/improve-text",
#     response_model=TaskResponse,
#     summary="Improve Task Title or Description using LLM",
# )
# async def improve_task_text(
#     payload: TaskImproveRequest,
#     task_id: ObjectId = Path(..., description="The ID of the task to improve"),
#     current_user: User = Depends(get_current_user),
#     service: TaskService = Depends(TaskService),
#     llm_service: LLMService = Depends(lambda: LLMService()),
# ):
#     task = await service.get_task_by_id(task_id=task_id, current_user_id=current_user.id)
#     if not task:
#         raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Task not found")
#     # ... (rest of the old logic)


@router.get(
    "/{task_id}/llm-suggestions",
    response_model=LLMSuggestionResponse,
    summary="Get LLM suggestions for a task field",
)
async def get_llm_suggestion_for_task(
    task_id: ObjectId = Path(..., description="The ID of the task"),
    action: LLMActionType, # Use the Enum for validation
    current_user: User = Depends(get_current_user),
    task_service: TaskService = Depends(TaskService),
    llm_service: LLMService = Depends(lambda: LLMService()), # LLMService instance
    engine: AIOEngine = Depends(get_database), # Inject engine for direct Task model fetching
):
    # Fetch the Task model directly, not TaskResponse schema
    task_model = await engine.find_one(TaskModel, TaskModel.id == task_id)

    if not task_model:
        # This will be caught by FastAPI's default 404 handler if not overridden by a custom one for TaskNotFoundException
        raise TaskNotFoundException(task_id=str(task_id))
    if task_model.user_id != current_user.id:
        # This will be caught by FastAPI's default 403 handler if not overridden
        raise NotOwnerException(resource="task")
    if task_model.is_deleted:
        raise TaskNotFoundException(task_id=str(task_id), detail="Task has been deleted.")

    # Delegate the logic to the TaskService
    # TaskDataMissingError and LLMGenerationError (and other LLMServiceError)
    # will be caught by their respective global handlers in main.py
    suggestion_response = await task_service.prepare_llm_suggestion(
        task=task_model, action=action, llm_service=llm_service
    )
    return suggestion_response


# @router.post(
#     "/{task_id}/apply-suggestion",
#     response_model=TaskResponse,
#     summary="Apply an LLM suggestion to a task field",
# )
# async def apply_llm_suggestion_to_task(
#     payload: TaskApplySuggestionRequest,
#     task_id: ObjectId = Path(..., description="The ID of the task to update"),
#     current_user: User = Depends(get_current_user),
#     task_service: TaskService = Depends(TaskService),
# ):
#     # Logic for applying suggestion has been removed.
#     # The frontend will now use the standard PATCH /tasks/{task_id} endpoint
#     # with a TaskUpdateRequest payload containing the approved_text for title or description.
#     # Example: {"title": "New approved title"} or {"description": "New approved description"}
#     pass # Endpoint removed


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
