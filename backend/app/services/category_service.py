from typing import List

from fastapi import Depends
from odmantic import AIOEngine, ObjectId

from app.api.schemas.category import CategoryCreateRequest, CategoryResponse, CategoryUpdateRequest
from app.core.exceptions import CategoryNameExistsException, CategoryNotFoundException, NotOwnerException
from app.db.connection import get_database
from app.db.models.category import Category
from app.mappers.category_mapper import CategoryMapper


class CategoryService:
    def __init__(self, engine: AIOEngine = Depends(get_database)):
        self.engine = engine

    async def create_category(
        self, category_data: CategoryCreateRequest, current_user_id: ObjectId
    ) -> CategoryResponse:
        existing_category = await self.engine.find_one(
            Category,
            Category.name == category_data.name,
            Category.user == current_user_id,
            Category.is_deleted == False,  # noqa: E712
        )
        if existing_category:
            raise CategoryNameExistsException(name=category_data.name)

        category = CategoryMapper.to_model_for_create(schema=category_data, user_id=current_user_id)
        await self.engine.save(category)
        return CategoryMapper.to_response(category)

    async def get_category_by_id(self, category_id: ObjectId, current_user_id: ObjectId) -> CategoryResponse:
        category = await self.engine.find_one(Category, Category.id == category_id)
        if not category:
            raise CategoryNotFoundException(category_id=str(category_id))

        if category.user != current_user_id:
            raise NotOwnerException(resource="category", detail_override="Not authorized to access this category")

        return CategoryMapper.to_response(category)

    async def get_all_categories(self, current_user_id: ObjectId) -> List[CategoryResponse]:
        categories = await self.engine.find(
            Category,
            Category.user == current_user_id,
            Category.is_deleted == False,  # noqa: E712
        )
        return [CategoryMapper.to_response(category) for category in categories]

    async def get_categories_by_ids(
        self, category_ids: List[ObjectId], current_user_id: ObjectId, include_deleted: bool = False
    ) -> List[CategoryResponse]:

        if not category_ids:
            return []

        # Remove duplicates while preserving order
        unique_category_ids = list(dict.fromkeys(category_ids))

        # Build query conditions
        query_conditions = [
            Category.id.in_(unique_category_ids),
            Category.user == current_user_id,
        ]

        if not include_deleted:
            query_conditions.append(Category.is_deleted == False)  # noqa: E712

        # Fetch categories
        categories = await self.engine.find(Category, *query_conditions)

        # Validate all requested categories were found
        found_ids = {category.id for category in categories}
        missing_ids = set(unique_category_ids) - found_ids

        if missing_ids:
            raise CategoryNotFoundException(
                f"Categories not found or not accessible: {[str(id) for id in missing_ids]}"
            )

        # Convert to response objects
        return [CategoryMapper.to_response(category) for category in categories]

    async def update_category(
        self, category_id: ObjectId, category_data: CategoryUpdateRequest, current_user_id: ObjectId
    ) -> CategoryResponse:
        category = await self.engine.find_one(
            Category,
            Category.id == category_id,
            Category.is_deleted == False,  # noqa: E712
        )
        if not category:
            raise CategoryNotFoundException(category_id=str(category_id))

        if category.user != current_user_id:
            raise NotOwnerException(resource="category", detail_override="Not authorized to update this category")

        update_data = category_data.model_dump(exclude_none=True)  # Use exclude_none for Pydantic v2

        if "name" in update_data and update_data["name"] != category.name:
            name_conflict_check = await self.engine.find_one(
                Category,
                Category.name == update_data["name"],
                Category.user == current_user_id,
                Category.id != category_id,
                Category.is_deleted == False,  # noqa: E712
            )
            if name_conflict_check:
                raise CategoryNameExistsException(name=update_data["name"])

        for field, value in update_data.items():
            setattr(category, field, value)

        await self.engine.save(category)
        return CategoryMapper.to_response(category)

    async def delete_category(self, category_id: ObjectId, current_user_id: ObjectId) -> bool:
        category = await self.engine.find_one(Category, Category.id == category_id)
        if not category:
            raise CategoryNotFoundException(category_id=str(category_id))

        if category.user != current_user_id:
            raise NotOwnerException(resource="category", detail_override="Not authorized to delete this category")

        if not category.is_deleted:
            category.is_deleted = True
            await self.engine.save(category)
        return True
