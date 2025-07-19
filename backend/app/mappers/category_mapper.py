from odmantic import ObjectId

from app.api.schemas.category import CategoryCreateRequest, CategoryResponse
from app.db.models.category import Category


class CategoryMapper:
    @staticmethod
    def to_response(category: Category) -> CategoryResponse:
        """
        Maps a Category model to a CategoryResponse schema.
        """
        # For Category, the model fields align well with the response schema.
        # Pydantic's model_validate can handle this directly.
        return CategoryResponse.model_validate(category)

    @staticmethod
    def to_model_for_create(schema: CategoryCreateRequest, user_id: ObjectId) -> Category:
        """
        Maps a CategoryCreateRequest schema to a Category model instance
        for creation. The returned model is not yet saved to the database.
        """
        return Category(
            name=schema.name,
            description=schema.description,
            color=schema.color,
            user=user_id,
            is_deleted=False,  # Default for new categories
        )  # type: ignore
