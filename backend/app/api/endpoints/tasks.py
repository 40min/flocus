from typing import List, Optional

from fastapi import APIRouter, Depends, Path, Query, status
from odmantic import ObjectId

from app.api.schemas.llm import LLMImprovementRequest, LLMImprovementResponse
from app.api.schemas.task import TaskCreateRequest, TaskPriority, TaskResponse, TaskStatus, TaskUpdateRequest
from app.core.dependencies import get_current_active_user_id, get_llm_service
from app.services.llm_service import LLMService
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


@router.post(
    "/llm/improve-text",
    response_model=LLMImprovementResponse,
    summary="Improve text using LLM",
    status_code=status.HTTP_200_OK,
)
async def improve_text_with_llm(
    request: LLMImprovementRequest,
    llm_service: LLMService = Depends(get_llm_service),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    """
    Receives text and an action, and returns an LLM-generated improvement.
    This is a stateless endpoint that does not interact with any specific task in the database.
    """
    return await llm_service.process_llm_action(
        action=request.action, title=request.title, description=request.description
    )


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
