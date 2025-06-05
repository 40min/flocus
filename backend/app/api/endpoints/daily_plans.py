from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Path, status
from odmantic import ObjectId

from app.api.schemas.daily_plan import (
    DailyPlanCreateRequest,
    DailyPlanResponse,
    DailyPlanReviewRequest,
    DailyPlanUpdateRequest,
)
from app.core.dependencies import get_current_active_user_id
from app.services.daily_plan_service import DailyPlanService

router = APIRouter()


@router.post(
    "",
    response_model=DailyPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Daily Plan",
    description="Creates a new daily plan for the current user with optional allocations.",
)
async def create_daily_plan(
    daily_plan_request: DailyPlanCreateRequest,
    service: DailyPlanService = Depends(DailyPlanService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.create_daily_plan(daily_plan_request, current_user_id)


@router.get(
    "/{plan_date}",
    response_model=DailyPlanResponse,
    summary="Get Daily Plan by date",
    description="Retrieves a specific daily plan for the current user by its date.",
)
async def get_daily_plan_by_date(
    plan_date: datetime,
    service: DailyPlanService = Depends(DailyPlanService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.get_daily_plan_by_date(plan_date, current_user_id)


@router.get(
    "/id/{plan_id}",
    response_model=DailyPlanResponse,
    summary="Get a Daily Plan by ID",
    description="Alternative way to get a specific daily plan if its ID is known.",
)
async def get_daily_plan_by_id(
    plan_id: ObjectId = Path(..., description="The ID of the daily plan to retrieve"),
    service: DailyPlanService = Depends(DailyPlanService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.get_daily_plan_by_id(plan_id=plan_id, current_user_id=current_user_id)


@router.patch(
    "/{plan_date}",
    response_model=DailyPlanResponse,
    summary="Update a Daily Plan by date",
    description="Updates an existing daily plan for the user, identified by date. "
    "If allocations are updated, validates that tasks assigned to a time window "
    "share the same category as the time window. "
    "Raises a 400 error if a category mismatch is detected.",
)
async def update_daily_plan(
    plan_date: datetime,
    daily_plan_update_request: DailyPlanUpdateRequest,
    service: DailyPlanService = Depends(DailyPlanService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    try:
        # First, get the daily plan by date to retrieve its ID
        daily_plan_to_update = await service.get_daily_plan_by_date_internal(
            plan_date=plan_date, current_user_id=current_user_id
        )

        return await service.update_daily_plan(
            plan_id=daily_plan_to_update.id,
            daily_plan_update_request=daily_plan_update_request,
            current_user_id=current_user_id,
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))


@router.patch(
    "/yesterday/review",
    response_model=DailyPlanResponse,
    summary="Mark yesterday's Daily Plan as reviewed and add reflection",
    description="Finds yesterday's daily plan, sets its 'reviewed' flag to True, "
    "and updates reflection and notes content. Returns the updated plan.",
)
async def review_yesterday_daily_plan(
    review_data: DailyPlanReviewRequest,
    service: DailyPlanService = Depends(DailyPlanService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.review_yesterday_daily_plan(review_data=review_data, current_user_id=current_user_id)


@router.get(
    "/yesterday",
    response_model=DailyPlanResponse,
    summary="Get yesterday's Daily Plan for review",
    description="Retrieves the daily plan for the previous day, typically for review purposes.",
)
async def get_yesterday_daily_plan(
    service: DailyPlanService = Depends(DailyPlanService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.get_yesterday_daily_plan(current_user_id=current_user_id)
