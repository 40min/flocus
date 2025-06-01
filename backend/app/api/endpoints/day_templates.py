from typing import List

from fastapi import APIRouter, Depends, status
from odmantic import ObjectId

from app.api.schemas.day_template import DayTemplateCreateRequest, DayTemplateResponse, DayTemplateUpdateRequest
from app.core.dependencies import get_current_active_user_id
from app.services.day_template_service import DayTemplateService

router = APIRouter()


@router.post(
    "",
    response_model=DayTemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Day Template",
)
async def create_day_template(
    template_data: DayTemplateCreateRequest,
    service: DayTemplateService = Depends(DayTemplateService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    """
    Creates a new day template associated with the current user.
    Requires authentication.
    """
    created_template = await service.create_day_template(template_data=template_data, current_user_id=current_user_id)
    return created_template


@router.get(
    "",
    response_model=List[DayTemplateResponse],
    summary="Get all Day Templates",
)
async def get_all_day_templates(
    current_user_id: ObjectId = Depends(get_current_active_user_id),
    service: DayTemplateService = Depends(DayTemplateService),
):
    """
    Retrieves a list of all day templates.
    Requires authentication.
    """
    # Fetches templates only for the current authenticated user.
    templates = await service.get_all_day_templates(current_user_id=current_user_id)
    return templates


@router.get(
    "/{template_id}",
    response_model=DayTemplateResponse,
    summary="Get a specific Day Template by ID",
)
async def get_day_template_by_id(
    template_id: ObjectId,
    service: DayTemplateService = Depends(DayTemplateService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    """
    Retrieves a specific day template by its unique ID.
    Requires authentication.
    """
    # Service method includes ownership check.
    template = await service.get_day_template_by_id(template_id=template_id, current_user_id=current_user_id)
    return template


@router.patch(
    "/{template_id}",
    response_model=DayTemplateResponse,
    summary="Update a Day Template",
)
async def update_day_template(
    template_id: ObjectId,
    template_data: DayTemplateUpdateRequest,
    service: DayTemplateService = Depends(DayTemplateService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    """
    Updates an existing day template.
    Requires authentication. Allows partial updates.
    """
    # Service method includes ownership check.
    updated_template = await service.update_day_template(
        template_id=template_id,
        template_data=template_data,
        current_user_id=current_user_id,
    )
    return updated_template


@router.delete(
    "/{template_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a Day Template",
)
async def delete_day_template(
    template_id: ObjectId,
    service: DayTemplateService = Depends(DayTemplateService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    """
    Deletes a day template by its unique ID.
    Requires authentication.
    """
    # Service method includes ownership check.
    await service.delete_day_template(template_id=template_id, current_user_id=current_user_id)
    return None  # No content response
