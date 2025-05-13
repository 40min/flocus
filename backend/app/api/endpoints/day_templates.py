from typing import List

from fastapi import APIRouter, Depends, status  # Removed HTTPException
from odmantic import ObjectId

from app.api.schemas.day_template import DayTemplateCreateRequest, DayTemplateResponse, DayTemplateUpdateRequest
from app.core.dependencies import get_validated_user_id  # For authentication
from app.services.day_template_service import DayTemplateService

router = APIRouter()


@router.post(
    "/",
    response_model=DayTemplateResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Day Template",
)
async def create_day_template(
    template_data: DayTemplateCreateRequest,
    service: DayTemplateService = Depends(DayTemplateService),
    current_user_id: ObjectId = Depends(get_validated_user_id),  # Authenticated route
):
    """
    Creates a new day template associated with the current user.
    Requires authentication.
    """
    # Note: Currently, DayTemplate model doesn't link to a user.
    # This might need adjustment based on requirements (e.g., add user_id field).
    # For now, authentication ensures only logged-in users can create templates.
    created_template = await service.create_day_template(template_data=template_data, current_user_id=current_user_id)
    return created_template


@router.get(
    "/",
    response_model=List[DayTemplateResponse],
    summary="Get all Day Templates",
)
async def get_all_day_templates(
    service: DayTemplateService = Depends(DayTemplateService),
    current_user_id: ObjectId = Depends(get_validated_user_id),  # Authenticated route
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
    current_user_id: ObjectId = Depends(get_validated_user_id),  # Authenticated route
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
    current_user_id: ObjectId = Depends(get_validated_user_id),  # Authenticated route
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
    current_user_id: ObjectId = Depends(get_validated_user_id),  # Authenticated route
):
    """
    Deletes a day template by its unique ID.
    Requires authentication.
    """
    # Service method includes ownership check.
    await service.delete_day_template(template_id=template_id, current_user_id=current_user_id)
    return None  # No content response
