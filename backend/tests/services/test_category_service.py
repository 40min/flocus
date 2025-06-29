import pytest
from odmantic import ObjectId

from app.db.models.category import Category
from app.db.models.user import User
from app.services.category_service import CategoryService

pytestmark = pytest.mark.asyncio


class TestCategoryService:
    async def test_get_categories_by_ids_with_duplicates(self, test_db, test_user_one: User):
        """
        Test that get_categories_by_ids correctly handles duplicate category IDs
        in the input list, returning unique categories.
        """
        # Create some categories
        category1 = Category(name="Category One", user=test_user_one.id)
        category2 = Category(name="Category Two", user=test_user_one.id)
        await test_db.save_all([category1, category2])

        # Prepare a list with duplicate IDs
        category_ids_with_duplicates = [
            category1.id,
            category2.id,
            category1.id,  # Duplicate
            ObjectId(),  # Non-existent
        ]

        service = CategoryService(engine=test_db)

        # Expecting CategoryNotFoundException due to the non-existent ID
        with pytest.raises(Exception) as exc_info:
            await service.get_categories_by_ids(
                category_ids=category_ids_with_duplicates,
                current_user_id=test_user_one.id,
            )
        assert "Categories not found or not accessible" in str(exc_info.value)

        # Test with only existing and unique IDs
        category_ids_unique = [category1.id, category2.id]
        fetched_categories = await service.get_categories_by_ids(
            category_ids=category_ids_unique, current_user_id=test_user_one.id
        )

        assert len(fetched_categories) == 2
        fetched_ids = {cat.id for cat in fetched_categories}
        assert fetched_ids == {category1.id, category2.id}

        # Test with duplicates but all existing
        category_ids_all_existing_duplicates = [category1.id, category2.id, category1.id]
        fetched_categories_duplicates = await service.get_categories_by_ids(
            category_ids=category_ids_all_existing_duplicates, current_user_id=test_user_one.id
        )
        assert len(fetched_categories_duplicates) == 2
        fetched_ids_duplicates = {cat.id for cat in fetched_categories_duplicates}
        assert fetched_ids_duplicates == {category1.id, category2.id}
