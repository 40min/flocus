from datetime import date

from fastapi import APIRouter, Depends, HTTPException, Path, status
from odmantic import ObjectId

from app.api.schemas.daily_plan import DailyPlanCreateRequest, DailyPlanResponse, DailyPlanUpdateRequest
from app.core.dependencies import get_current_active_user_id
from app.services.daily_plan_service import DailyPlanService

router = APIRouter()


@router.post(
    "/",
    response_model=DailyPlanResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Daily Plan",
)
async def create_daily_plan(
    plan_data: DailyPlanCreateRequest,
    service: DailyPlanService = Depends(DailyPlanService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.create_daily_plan(plan_data=plan_data, current_user_id=current_user_id)


@router.get(
    "/{plan_date}",
    response_model=DailyPlanResponse,
    summary="Get a Daily Plan by date",
)
async def get_daily_plan_by_date(
    plan_date: date,
    service: DailyPlanService = Depends(DailyPlanService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.get_daily_plan_by_date(plan_date=plan_date, current_user_id=current_user_id)


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
)
async def update_daily_plan(
    plan_date: date,
    plan_data: DailyPlanUpdateRequest,
    service: DailyPlanService = Depends(DailyPlanService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    try:
        return await service.update_daily_plan(
            plan_date=plan_date, plan_data=plan_data, current_user_id=current_user_id
        )
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))
