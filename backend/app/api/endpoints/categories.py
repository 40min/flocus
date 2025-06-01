from typing import List

from fastapi import APIRouter, Depends, Path, status
from odmantic import ObjectId

from app.api.schemas.category import CategoryCreateRequest, CategoryResponse, CategoryUpdateRequest
from app.core.dependencies import get_current_active_user_id
from app.services.category_service import CategoryService

router = APIRouter()


@router.post(
    "",
    response_model=CategoryResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Create a new Category",
)
async def create_category(
    category_data: CategoryCreateRequest,
    service: CategoryService = Depends(CategoryService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.create_category(category_data=category_data, current_user_id=current_user_id)


@router.get(
    "",
    response_model=List[CategoryResponse],
    summary="Get all Categories for the current user",
)
async def get_all_categories(
    service: CategoryService = Depends(CategoryService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.get_all_categories(current_user_id=current_user_id)


@router.get(
    "/{category_id}",
    response_model=CategoryResponse,
    summary="Get a specific Category by ID",
)
async def get_category_by_id(
    category_id: ObjectId = Path(..., description="The ID of the category to retrieve"),
    service: CategoryService = Depends(CategoryService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.get_category_by_id(category_id=category_id, current_user_id=current_user_id)


@router.patch(
    "/{category_id}",
    response_model=CategoryResponse,
    summary="Update a Category",
)
async def update_category(
    category_data: CategoryUpdateRequest,
    category_id: ObjectId = Path(..., description="The ID of the category to update"),
    service: CategoryService = Depends(CategoryService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    return await service.update_category(
        category_id=category_id, category_data=category_data, current_user_id=current_user_id
    )


@router.delete(
    "/{category_id}",
    status_code=status.HTTP_204_NO_CONTENT,
    summary="Delete a Category",
)
async def delete_category(
    category_id: ObjectId = Path(..., description="The ID of the category to delete"),
    service: CategoryService = Depends(CategoryService),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
):
    await service.delete_category(category_id=category_id, current_user_id=current_user_id)
    return None
