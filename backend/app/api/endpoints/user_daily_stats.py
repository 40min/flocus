from fastapi import APIRouter, Depends, Response, status
from odmantic import ObjectId

from app.api.schemas.user_daily_stats import IncrementTimeRequest, UserDailyStatsResponse
from app.core.dependencies import get_current_active_user_id
from app.services.user_daily_stats_service import UserDailyStatsService

router = APIRouter()


@router.get(
    "/",
    response_model=UserDailyStatsResponse,
    summary="Get today's daily statistics",
)
async def get_today_stats(
    user_id: ObjectId = Depends(get_current_active_user_id),
    service: UserDailyStatsService = Depends(UserDailyStatsService),
):
    stats = await service.get_today_stats(user_id)
    return stats


@router.post(
    "/increment-time",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Increment total time spent today",
)
async def increment_time_spent(
    request: IncrementTimeRequest,
    user_id: ObjectId = Depends(get_current_active_user_id),
    service: UserDailyStatsService = Depends(UserDailyStatsService),
):
    await service.increment_time(user_id, request.seconds)
    return Response(status_code=status.HTTP_204_NO_CONTENT)


@router.post(
    "/increment-pomodoro",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Increment completed Pomodoros today",
)
async def increment_pomodoros_completed(
    user_id: ObjectId = Depends(get_current_active_user_id),
    service: UserDailyStatsService = Depends(UserDailyStatsService),
):
    await service.increment_pomodoro(user_id)
    return Response(status_code=status.HTTP_204_NO_CONTENT)
