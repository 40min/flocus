from typing import List

from fastapi import Depends
from odmantic import AIOEngine, ObjectId

from app.api.schemas.category import CategoryCreateRequest, CategoryResponse, CategoryUpdateRequest
from app.core.exceptions import CategoryNameExistsException, CategoryNotFoundException, NotOwnerException
from app.db.connection import get_database
from app.db.models.category import Category


class CategoryService:
    def __init__(self, engine: AIOEngine = Depends(get_database)):
        self.engine = engine

    async def create_category(
        self, category_data: CategoryCreateRequest, current_user_id: ObjectId
    ) -> CategoryResponse:
        existing_category = await self.engine.find_one(
            Category, Category.name == category_data.name, Category.user == current_user_id
        )
        if existing_category:
            raise CategoryNameExistsException(name=category_data.name)

        category = Category(**category_data.model_dump(), user=current_user_id)
        await self.engine.save(category)
        return CategoryResponse.model_validate(category)

    async def get_category_by_id(self, category_id: ObjectId, current_user_id: ObjectId) -> CategoryResponse:
        category = await self.engine.find_one(Category, Category.id == category_id)
        if not category:
            raise CategoryNotFoundException(category_id=str(category_id))

        if category.user != current_user_id:
            raise NotOwnerException(resource="category", detail_override="Not authorized to access this category")

        return CategoryResponse.model_validate(category)

    async def get_all_categories(self, current_user_id: ObjectId) -> List[CategoryResponse]:
        categories = await self.engine.find(Category, Category.user == current_user_id)
        return [CategoryResponse.model_validate(category) for category in categories]

    async def update_category(
        self, category_id: ObjectId, category_data: CategoryUpdateRequest, current_user_id: ObjectId
    ) -> CategoryResponse:
        category = await self.engine.find_one(Category, Category.id == category_id)
        if not category:
            raise CategoryNotFoundException(category_id=str(category_id))

        if category.user != current_user_id:
            raise NotOwnerException(resource="category", detail_override="Not authorized to update this category")

        update_data = category_data.model_dump(exclude_unset=True)

        if "name" in update_data and update_data["name"] != category.name:
            name_conflict_check = await self.engine.find_one(
                Category,
                Category.name == update_data["name"],
                Category.user == current_user_id,
                Category.id != category_id,
            )
            if name_conflict_check:
                raise CategoryNameExistsException(name=update_data["name"])

        for field, value in update_data.items():
            setattr(category, field, value)

        await self.engine.save(category)
        return CategoryResponse.model_validate(category)

    async def delete_category(self, category_id: ObjectId, current_user_id: ObjectId) -> bool:
        category = await self.engine.find_one(Category, Category.id == category_id)
        if not category:
            # Per "fewer lines of code", if not found, it's effectively deleted from user's perspective.
            # However, for strictness and to inform client, raising an error is better.
            # Let's align with typical behavior of raising NotFound.
            raise CategoryNotFoundException(category_id=str(category_id))

        if category.user != current_user_id:
            raise NotOwnerException(resource="category", detail_override="Not authorized to delete this category")

        await self.engine.delete(category)
        return True
