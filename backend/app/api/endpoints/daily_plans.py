import logging  # Added import for logging
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, Path, status
from odmantic import ObjectId

from app.api.schemas.daily_plan import DailyPlanCreateRequest, DailyPlanResponse, DailyPlanUpdateRequest
from app.api.schemas.llm import LLMReflectionRequest, LLMReflectionResponse
from app.core.dependencies import get_current_active_user_id, get_llm_service
from app.services.daily_plan_service import DailyPlanService
from app.services.llm_service import LLMService

router = APIRouter()

logger = logging.getLogger(__name__)  # Initialize logger


@router.post(
    "",
    response_model=DailyPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Daily Plan",
    description="Creates a new daily plan for the current user with optional time windows.",
)
async def create_daily_plan(
    daily_plan_request: DailyPlanCreateRequest,
    service: DailyPlanService = Depends(DailyPlanService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.create_daily_plan(daily_plan_request, current_user_id)


# Specific string routes should come before parameterized routes
@router.get(
    "/prev-day",
    response_model=Optional[DailyPlanResponse],
    summary="Get the last working day's Daily Plan",
    description="Retrieves the daily plan for the user's last recorded day prior to today, for review purposes.",
)
async def get_prev_day_daily_plan(
    service: DailyPlanService = Depends(DailyPlanService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.get_prev_day_daily_plan(current_user_id=current_user_id) or None


@router.get(
    "/today",
    response_model=Optional[DailyPlanResponse],
    summary="Get today's Daily Plan",
    description="Retrieves the daily plan for the current day.",
)
async def get_today_daily_plan(
    service: DailyPlanService = Depends(DailyPlanService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.get_today_daily_plan(current_user_id=current_user_id) or None


@router.get(
    "/id/{plan_id}",
    response_model=Optional[DailyPlanResponse],
    summary="Get Daily Plan by ID",
    description="Retrieves a specific daily plan by its ID.",
)
async def get_daily_plan_by_id(
    plan_id: ObjectId = Path(..., description="The ID of the daily plan to retrieve"),
    service: DailyPlanService = Depends(DailyPlanService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):

    return await service.get_daily_plan_by_id(plan_id=plan_id, current_user_id=current_user_id) or None


# Parameterized routes after specific ones
@router.get(
    "/{plan_date}",
    response_model=Optional[DailyPlanResponse],
    summary="Get Daily Plan by date",
    description="Retrieves a specific daily plan for the current user by its date.",
)
async def get_daily_plan_by_date(
    plan_date: datetime,
    service: DailyPlanService = Depends(DailyPlanService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.get_daily_plan_by_date(plan_date, current_user_id) or None


@router.post(
    "/llm/improve-reflection",
    response_model=LLMReflectionResponse,
    summary="Improve reflection text using LLM",
    status_code=status.HTTP_200_OK,
)
async def improve_reflection(
    request: LLMReflectionRequest,
    llm_service: LLMService = Depends(get_llm_service),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    prompt = (
        "You are a helpful assistant for self-reflection. "
        "Improve the following journal entry to be more clear, concise, and insightful. "
        "Maintain the original sentiment and correct any grammatical errors. "
        "The output should be just the improved text, without any additional commentary."
    )
    improved_text = await llm_service.improve_text(request.text, prompt)
    return LLMReflectionResponse(improved_text=improved_text)


@router.put(
    "/{plan_id}",
    response_model=DailyPlanResponse,
    summary="Update a Daily Plan by date",
    description="Updates an existing daily plan for the user, identified by date. "
    "If time windows are updated, validates that tasks assigned to a time window "
    "share the same category as the time window. "
    "Raises a 400 error if a category mismatch is detected.",
)
async def update_daily_plan(
    daily_plan_update_request: DailyPlanUpdateRequest,
    plan_id: ObjectId = Path(..., description="The ID of the daily plan to update"),
    service: DailyPlanService = Depends(DailyPlanService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    logger.info(f"Received update request for plan_id: {plan_id}")  # Log incoming plan_id
    logger.info(f"Update payload: {daily_plan_update_request.model_dump_json()}")  # Log update payload
    return await service.update_daily_plan(
        plan_id=plan_id,
        daily_plan_update_request=daily_plan_update_request,
        current_user_id=current_user_id,
    )
