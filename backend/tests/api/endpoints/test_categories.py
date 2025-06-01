import pytest
from httpx import AsyncClient
from odmantic import ObjectId

from app.api.schemas.category import CategoryCreateRequest, CategoryResponse, CategoryUpdateRequest
from app.core.config import settings
from app.db.models.category import Category as CategoryModel
from app.db.models.user import User

API_V1_STR = settings.API_V1_STR
CATEGORIES_ENDPOINT = f"{API_V1_STR}/categories"

pytestmark = pytest.mark.asyncio


async def test_create_category_success(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_user_one: User
):
    category_data = CategoryCreateRequest(name="Work", description="Work related tasks", color="#FF0000")
    response = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=category_data.model_dump(mode="json")
    )
    assert response.status_code == 201
    created_category = CategoryResponse(**response.json())
    assert created_category.name == category_data.name
    assert created_category.description == category_data.description
    assert created_category.color == category_data.color
    assert created_category.user_id == test_user_one.id
    assert created_category.is_deleted is False


async def test_create_category_name_conflict(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_db, test_user_one: User
):
    category_data = CategoryCreateRequest(name="UniqueName")
    await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=category_data.model_dump(mode="json")
    )  # First creation
    response = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=category_data.model_dump(mode="json")
    )  # Second attempt
    assert response.status_code == 400
    assert "already exists for this user" in response.json()["detail"]


async def test_get_all_categories_success_and_excludes_soft_deleted(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_db, test_user_one: User
):
    # Ensure no categories exist for the user initially or clear them
    await test_db.get_collection(CategoryModel).delete_many({"user": test_user_one.id})

    cat1_data = CategoryCreateRequest(name="ActiveCat1")
    cat2_data = CategoryCreateRequest(name="ActiveCat2")
    cat_to_delete_data = CategoryCreateRequest(name="ToDeleteCat")

    cat1_resp = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=cat1_data.model_dump(mode="json")
    )
    await async_client.post(CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=cat2_data.model_dump(mode="json"))
    cat_to_delete_resp = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=cat_to_delete_data.model_dump(mode="json")
    )
    assert cat1_resp.status_code == 201
    assert cat_to_delete_resp.status_code == 201
    cat_to_delete_id = cat_to_delete_resp.json()["id"]

    # Soft delete one category
    delete_resp = await async_client.delete(f"{CATEGORIES_ENDPOINT}/{cat_to_delete_id}", headers=auth_headers_user_one)
    assert delete_resp.status_code == 204  # Assuming endpoint is 204 for delete

    response = await async_client.get(CATEGORIES_ENDPOINT, headers=auth_headers_user_one)
    assert response.status_code == 200
    categories = [CategoryResponse(**item) for item in response.json()]
    assert len(categories) == 2
    active_category_names = {cat.name for cat in categories}
    assert active_category_names == {"ActiveCat1", "ActiveCat2"}
    for cat in categories:
        assert cat.is_deleted is False


async def test_get_all_categories_empty(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_db, test_user_one: User
):
    await test_db.get_collection(CategoryModel).delete_many({"user": test_user_one.id})
    response = await async_client.get(CATEGORIES_ENDPOINT, headers=auth_headers_user_one)
    assert response.status_code == 200
    assert response.json() == []


async def test_get_category_by_id_success(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_user_one: User
):
    category_data = CategoryCreateRequest(name="FetchTest")
    create_response = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=category_data.model_dump(mode="json")
    )
    created_category_id = create_response.json()["id"]

    response = await async_client.get(f"{CATEGORIES_ENDPOINT}/{created_category_id}", headers=auth_headers_user_one)
    assert response.status_code == 200
    fetched_category = CategoryResponse(**response.json())
    assert str(fetched_category.id) == created_category_id
    assert fetched_category.name == "FetchTest"
    assert fetched_category.is_deleted is False


async def test_get_category_by_id_not_found(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    non_existent_id = ObjectId()
    response = await async_client.get(f"{CATEGORIES_ENDPOINT}/{non_existent_id}", headers=auth_headers_user_one)
    assert response.status_code == 404


async def test_get_category_by_id_not_owner(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    auth_headers_user_two: dict[str, str],
    test_user_one: User,
):
    category_data = CategoryCreateRequest(name="UserOneCategory")
    create_response = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=category_data.model_dump(mode="json")
    )
    category_id = create_response.json()["id"]

    # User two tries to access user one's category
    response = await async_client.get(f"{CATEGORIES_ENDPOINT}/{category_id}", headers=auth_headers_user_two)
    assert response.status_code == 403


async def test_update_category_success(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_user_one: User
):
    category_data = CategoryCreateRequest(name="ToUpdate")
    create_response = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=category_data.model_dump(mode="json")
    )
    category_id = create_response.json()["id"]

    update_data = CategoryUpdateRequest(name="UpdatedName", color="#0000FF")
    response = await async_client.patch(
        f"{CATEGORIES_ENDPOINT}/{category_id}", headers=auth_headers_user_one, json=update_data.model_dump(mode="json")
    )
    assert response.status_code == 200
    updated_category = CategoryResponse(**response.json())
    assert updated_category.name == "UpdatedName"
    assert updated_category.color == "#0000FF"
    assert updated_category.is_deleted is False


async def test_update_category_name_conflict(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_user_one: User
):
    # Create two categories
    cat1_data = CategoryCreateRequest(name="CatOriginal1")
    cat1_resp = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=cat1_data.model_dump(mode="json")
    )
    cat1_id = cat1_resp.json()["id"]

    cat2_data = CategoryCreateRequest(name="CatOriginal2")
    await async_client.post(CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=cat2_data.model_dump(mode="json"))

    # Try to update cat1 to have the name of cat2 (or any existing name for that user)
    update_data = CategoryUpdateRequest(name="CatOriginal2")
    response = await async_client.patch(
        f"{CATEGORIES_ENDPOINT}/{cat1_id}", headers=auth_headers_user_one, json=update_data.model_dump(mode="json")
    )
    assert response.status_code == 400
    assert "already exists for this user" in response.json()["detail"]


async def test_update_category_not_found(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    non_existent_id = ObjectId()
    update_data = CategoryUpdateRequest(name="NoCategory")
    response = await async_client.patch(
        f"{CATEGORIES_ENDPOINT}/{non_existent_id}",
        headers=auth_headers_user_one,
        json=update_data.model_dump(mode="json"),
    )
    assert response.status_code == 404


async def test_update_category_not_owner(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    auth_headers_user_two: dict[str, str],
    test_user_one: User,
):
    category_data = CategoryCreateRequest(name="UserOneCategoryUpdate")
    create_response = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=category_data.model_dump(mode="json")
    )
    category_id = create_response.json()["id"]

    update_data = CategoryUpdateRequest(name="AttemptedUpdateByTwo")
    response = await async_client.patch(
        f"{CATEGORIES_ENDPOINT}/{category_id}", headers=auth_headers_user_two, json=update_data.model_dump(mode="json")
    )
    assert response.status_code == 403


async def test_delete_category_success(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_user_one: User
):
    category_data = CategoryCreateRequest(name="ToDelete")
    create_response = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=category_data.model_dump(mode="json")
    )
    category_id = create_response.json()["id"]

    delete_response = await async_client.delete(f"{CATEGORIES_ENDPOINT}/{category_id}", headers=auth_headers_user_one)
    assert delete_response.status_code == 204  # Assuming endpoint is 204 for delete

    # Check if the category is marked as deleted when fetched by ID
    get_response = await async_client.get(f"{CATEGORIES_ENDPOINT}/{category_id}", headers=auth_headers_user_one)
    assert get_response.status_code == 200
    deleted_category_data = CategoryResponse(**get_response.json())
    assert deleted_category_data.id == ObjectId(category_id)
    assert deleted_category_data.is_deleted is True

    # Check if it's excluded from all categories list
    all_categories_response = await async_client.get(CATEGORIES_ENDPOINT, headers=auth_headers_user_one)
    assert all_categories_response.status_code == 200
    all_categories = [CategoryResponse(**item) for item in all_categories_response.json()]
    assert ObjectId(category_id) not in [cat.id for cat in all_categories]


async def test_delete_category_not_found(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    non_existent_id = ObjectId()
    response = await async_client.delete(f"{CATEGORIES_ENDPOINT}/{non_existent_id}", headers=auth_headers_user_one)
    assert response.status_code == 404


async def test_delete_category_not_owner(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    auth_headers_user_two: dict[str, str],
    test_user_one: User,
):
    category_data = CategoryCreateRequest(name="UserOneCategoryDelete")
    create_response = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=category_data.model_dump(mode="json")
    )
    category_id = create_response.json()["id"]

    response = await async_client.delete(f"{CATEGORIES_ENDPOINT}/{category_id}", headers=auth_headers_user_two)
    assert response.status_code == 403


async def test_create_category_with_same_name_as_soft_deleted_succeeds(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_user_one: User
):
    category_name = "SharedNameCategory"
    original_category_data = CategoryCreateRequest(name=category_name, description="Original")
    create_resp = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=original_category_data.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    original_category_id = create_resp.json()["id"]

    # Soft delete the original category
    delete_resp = await async_client.delete(
        f"{CATEGORIES_ENDPOINT}/{original_category_id}", headers=auth_headers_user_one
    )
    assert delete_resp.status_code == 204

    # Attempt to create a new category with the same name
    new_category_data = CategoryCreateRequest(name=category_name, description="New one after soft delete")
    new_create_resp = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=new_category_data.model_dump(mode="json")
    )
    assert new_create_resp.status_code == 201
    new_category = CategoryResponse(**new_create_resp.json())
    assert new_category.name == category_name
    assert new_category.is_deleted is False
    assert new_category.id != ObjectId(original_category_id)


async def test_get_soft_deleted_category_by_id_success(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_user_one: User
):
    category_data = CategoryCreateRequest(name="ToBeSoftDeletedAndFetched")
    create_response = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=category_data.model_dump(mode="json")
    )
    assert create_response.status_code == 201
    category_id = create_response.json()["id"]

    # Soft delete the category
    delete_resp = await async_client.delete(f"{CATEGORIES_ENDPOINT}/{category_id}", headers=auth_headers_user_one)
    assert delete_resp.status_code == 204

    # Fetch the soft-deleted category by ID
    response = await async_client.get(f"{CATEGORIES_ENDPOINT}/{category_id}", headers=auth_headers_user_one)
    assert response.status_code == 200
    fetched_category = CategoryResponse(**response.json())
    assert str(fetched_category.id) == category_id
    assert fetched_category.name == category_data.name
    assert fetched_category.is_deleted is True


async def test_update_category_name_to_match_soft_deleted_succeeds(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_user_one: User
):
    # Create a category that will be soft-deleted
    soft_deleted_name = "OldNameSoftDeleted"
    cat_to_delete_data = CategoryCreateRequest(name=soft_deleted_name)
    create_del_resp = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=cat_to_delete_data.model_dump(mode="json")
    )
    assert create_del_resp.status_code == 201
    soft_deleted_cat_id = create_del_resp.json()["id"]
    delete_resp = await async_client.delete(
        f"{CATEGORIES_ENDPOINT}/{soft_deleted_cat_id}", headers=auth_headers_user_one
    )
    assert delete_resp.status_code == 204

    # Create an active category to be updated
    active_cat_data = CategoryCreateRequest(name="ActiveCategoryToUpdate")
    create_active_resp = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=active_cat_data.model_dump(mode="json")
    )
    assert create_active_resp.status_code == 201
    active_cat_id = create_active_resp.json()["id"]

    # Update active category's name to the soft-deleted name
    update_data = CategoryUpdateRequest(name=soft_deleted_name)
    response = await async_client.patch(
        f"{CATEGORIES_ENDPOINT}/{active_cat_id}",
        headers=auth_headers_user_one,
        json=update_data.model_dump(mode="json"),
    )
    assert response.status_code == 200
    updated_category = CategoryResponse(**response.json())
    assert updated_category.name == soft_deleted_name
    assert updated_category.is_deleted is False


async def test_update_soft_deleted_category_fails_not_found(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_user_one: User
):
    category_data = CategoryCreateRequest(name="WillBeSoftDeletedThenUpdateAttempt")
    create_response = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=category_data.model_dump(mode="json")
    )
    assert create_response.status_code == 201
    category_id = create_response.json()["id"]

    # Soft delete the category
    delete_resp = await async_client.delete(f"{CATEGORIES_ENDPOINT}/{category_id}", headers=auth_headers_user_one)
    assert delete_resp.status_code == 204

    # Attempt to update the soft-deleted category
    update_data = CategoryUpdateRequest(name="NewNameForSoftDeleted")
    response = await async_client.patch(
        f"{CATEGORIES_ENDPOINT}/{category_id}", headers=auth_headers_user_one, json=update_data.model_dump(mode="json")
    )
    assert response.status_code == 404  # Service tries to find active category for update


async def test_delete_already_soft_deleted_category_succeeds(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_user_one: User
):
    category_data = CategoryCreateRequest(name="DeleteMultipleTimes")
    create_response = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=category_data.model_dump(mode="json")
    )
    assert create_response.status_code == 201
    category_id = create_response.json()["id"]

    # First delete
    delete_resp1 = await async_client.delete(f"{CATEGORIES_ENDPOINT}/{category_id}", headers=auth_headers_user_one)
    assert delete_resp1.status_code == 204

    # Second delete
    delete_resp2 = await async_client.delete(f"{CATEGORIES_ENDPOINT}/{category_id}", headers=auth_headers_user_one)
    assert delete_resp2.status_code == 204  # Should still succeed (idempotent from client view)

    # Verify it's still soft-deleted
    get_response = await async_client.get(f"{CATEGORIES_ENDPOINT}/{category_id}", headers=auth_headers_user_one)
    assert get_response.status_code == 200
    fetched_category = CategoryResponse(**get_response.json())
    assert fetched_category.is_deleted is True
