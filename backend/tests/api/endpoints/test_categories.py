import pytest
from httpx import AsyncClient
from odmantic import ObjectId

from app.api.schemas.category import CategoryCreateRequest, CategoryResponse, CategoryUpdateRequest
from app.core.config import settings
from app.db.models.category import Category as CategoryModel
from app.db.models.user import User

API_V1_STR = settings.API_V1_STR
CATEGORIES_ENDPOINT = f"{API_V1_STR}/categories/"

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


async def test_get_all_categories_success(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_db, test_user_one: User
):
    # Ensure no categories exist for the user initially or clear them
    await test_db.get_collection(CategoryModel).delete_many({"user": test_user_one.id})

    cat1_data = CategoryCreateRequest(name="Cat1")
    cat2_data = CategoryCreateRequest(name="Cat2")
    await async_client.post(CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=cat1_data.model_dump(mode="json"))
    await async_client.post(CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=cat2_data.model_dump(mode="json"))

    response = await async_client.get(CATEGORIES_ENDPOINT, headers=auth_headers_user_one)
    assert response.status_code == 200
    categories = [CategoryResponse(**item) for item in response.json()]
    assert len(categories) == 2
    assert {cat.name for cat in categories} == {"Cat1", "Cat2"}


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

    response = await async_client.get(f"{CATEGORIES_ENDPOINT}{created_category_id}", headers=auth_headers_user_one)
    assert response.status_code == 200
    fetched_category = CategoryResponse(**response.json())
    assert str(fetched_category.id) == created_category_id
    assert fetched_category.name == "FetchTest"


async def test_get_category_by_id_not_found(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    non_existent_id = ObjectId()
    response = await async_client.get(f"{CATEGORIES_ENDPOINT}{non_existent_id}", headers=auth_headers_user_one)
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
    response = await async_client.get(f"{CATEGORIES_ENDPOINT}{category_id}", headers=auth_headers_user_two)
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
        f"{CATEGORIES_ENDPOINT}{category_id}", headers=auth_headers_user_one, json=update_data.model_dump(mode="json")
    )
    assert response.status_code == 200
    updated_category = CategoryResponse(**response.json())
    assert updated_category.name == "UpdatedName"
    assert updated_category.color == "#0000FF"


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
        f"{CATEGORIES_ENDPOINT}{cat1_id}", headers=auth_headers_user_one, json=update_data.model_dump(mode="json")
    )
    assert response.status_code == 400
    assert "already exists for this user" in response.json()["detail"]


async def test_update_category_not_found(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    non_existent_id = ObjectId()
    update_data = CategoryUpdateRequest(name="NoCategory")
    response = await async_client.patch(
        f"{CATEGORIES_ENDPOINT}{non_existent_id}",
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
        f"{CATEGORIES_ENDPOINT}{category_id}", headers=auth_headers_user_two, json=update_data.model_dump(mode="json")
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

    delete_response = await async_client.delete(f"{CATEGORIES_ENDPOINT}{category_id}", headers=auth_headers_user_one)
    assert delete_response.status_code == 204

    get_response = await async_client.get(f"{CATEGORIES_ENDPOINT}{category_id}", headers=auth_headers_user_one)
    assert get_response.status_code == 404


async def test_delete_category_not_found(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    non_existent_id = ObjectId()
    response = await async_client.delete(f"{CATEGORIES_ENDPOINT}{non_existent_id}", headers=auth_headers_user_one)
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

    response = await async_client.delete(f"{CATEGORIES_ENDPOINT}{category_id}", headers=auth_headers_user_two)
    assert response.status_code == 403
