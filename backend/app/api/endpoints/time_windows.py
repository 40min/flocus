from typing import List

from fastapi import APIRouter, Depends, Path, status
from odmantic import ObjectId

from app.api.schemas.time_window import TimeWindowCreateRequest, TimeWindowResponse, TimeWindowUpdateRequest
from app.core.dependencies import get_current_active_user_id
from app.services.time_window_service import TimeWindowService

router = APIRouter()


@router.post(
    "/",
    response_model=TimeWindowResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Time Window",
)
async def create_time_window(
    time_window_data: TimeWindowCreateRequest,
    service: TimeWindowService = Depends(TimeWindowService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.create_time_window(time_window_data=time_window_data, current_user_id=current_user_id)


@router.get(
    "/",
    response_model=List[TimeWindowResponse],
    summary="Get all Time Windows for the current user",
)
async def get_all_time_windows(
    service: TimeWindowService = Depends(TimeWindowService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.get_all_time_windows_for_user(current_user_id=current_user_id)


@router.get(
    "/{time_window_id}",
    response_model=TimeWindowResponse,
    summary="Get a specific Time Window by ID",
)
async def get_time_window_by_id(
    time_window_id: ObjectId = Path(..., description="The ID of the time window to retrieve"),
    service: TimeWindowService = Depends(TimeWindowService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.get_time_window_by_id(time_window_id=time_window_id, current_user_id=current_user_id)


@router.patch(
    "/{time_window_id}",
    response_model=TimeWindowResponse,
    summary="Update a Time Window",
)
async def update_time_window(
    time_window_data: TimeWindowUpdateRequest,
    time_window_id: ObjectId = Path(..., description="The ID of the time window to update"),
    service: TimeWindowService = Depends(TimeWindowService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.update_time_window(
        time_window_id=time_window_id, time_window_data=time_window_data, current_user_id=current_user_id
    )


@router.delete(
    "/{time_window_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a Time Window",
)
async def delete_time_window(
    time_window_id: ObjectId = Path(..., description="The ID of the time window to delete"),
    service: TimeWindowService = Depends(TimeWindowService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    await service.delete_time_window(time_window_id=time_window_id, current_user_id=current_user_id)
    return None
