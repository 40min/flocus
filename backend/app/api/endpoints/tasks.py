from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Path, Query, status
from odmantic import ObjectId

from app.api.schemas.llm import LLMImprovementRequest, LLMImprovementResponse
from app.api.schemas.task import TaskCreateRequest, TaskPriority, TaskResponse, TaskStatus, TaskUpdateRequest
from app.core.dependencies import get_current_active_user_id
from app.core.enums import LLMActionType
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
    llm_service: LLMService = Depends(LLMService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    """
    Receives text and an action, and returns an LLM-generated improvement.
    This is a stateless endpoint that does not interact with any specific task in the database.
    """
    response = LLMImprovementResponse()
    text_to_improve = ""
    base_prompt_override = None

    match request.action:
        case LLMActionType.IMPROVE_TITLE:
            if not request.title:
                raise HTTPException(status_code=400, detail="Title is required for 'improve_title' action.")
            text_to_improve = request.title
            base_prompt_override = "Improve the following task title to make it more concise and informative:"
            improved_text = await llm_service.improve_text(text_to_improve, base_prompt_override)
            response.improved_title = improved_text
        case LLMActionType.IMPROVE_DESCRIPTION:
            if request.description is None:
                raise HTTPException(status_code=400, detail="Description is required for 'improve_description' action.")
            text_to_improve = request.description
            base_prompt_override = "Improve the following task description to make it more concise and informative:"
            improved_text = await llm_service.improve_text(text_to_improve, base_prompt_override)
            response.improved_description = improved_text
        case LLMActionType.GENERATE_DESCRIPTION_FROM_TITLE:
            if not request.title:
                raise HTTPException(
                    status_code=400, detail="Title is required for 'generate_description_from_title' action."
                )
            text_to_improve = f"Task Title: {request.title}"
            base_prompt_override = (
                "Based on the following task title, generate a concise and informative task description:"
            )
            improved_text = await llm_service.improve_text(text_to_improve, base_prompt_override)
            response.improved_description = improved_text

    return response


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
