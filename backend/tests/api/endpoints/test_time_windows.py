import pytest
from httpx import AsyncClient
from odmantic import ObjectId

from app.api.schemas.time_window import TimeWindowCreateRequest, TimeWindowResponse, TimeWindowUpdateRequest
from app.core.config import settings
from app.db.models.category import Category as CategoryModel
from app.db.models.day_template import DayTemplate as DayTemplateModel
from app.db.models.time_window import TimeWindow as TimeWindowModel
from app.db.models.user import User as UserModel

API_V1_STR = settings.API_V1_STR
TIME_WINDOWS_ENDPOINT = f"{API_V1_STR}/time-windows/"
CATEGORIES_ENDPOINT = f"{API_V1_STR}/categories/"  # Added for soft-deleting categories

pytestmark = pytest.mark.asyncio


async def test_create_time_window_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_category: CategoryModel,
    user_one_day_template_model: DayTemplateModel,
):
    tw_data = TimeWindowCreateRequest(
        name="Morning Focus",
        category=user_one_category.id,
        day_template_id=user_one_day_template_model.id,
        start_time=540,  # 9:00
        end_time=720,  # 12:00
    )
    response = await async_client.post(
        TIME_WINDOWS_ENDPOINT, headers=auth_headers_user_one, json=tw_data.model_dump(mode="json")
    )
    assert response.status_code == 201
    created_tw = TimeWindowResponse(**response.json())
    assert created_tw.name == tw_data.name
    assert created_tw.category.id == user_one_category.id
    assert created_tw.day_template_id == user_one_day_template_model.id
    assert created_tw.start_time == tw_data.start_time
    assert created_tw.end_time == tw_data.end_time
    assert created_tw.user_id == test_user_one.id


async def test_create_time_window_invalid_category(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_day_template_model: DayTemplateModel
):
    non_existent_category_id = ObjectId()
    tw_data = TimeWindowCreateRequest(
        name="Invalid Category TW",
        category=non_existent_category_id,
        day_template_id=user_one_day_template_model.id,
        start_time=540,
        end_time=720,
    )
    response = await async_client.post(
        TIME_WINDOWS_ENDPOINT, headers=auth_headers_user_one, json=tw_data.model_dump(mode="json")
    )
    assert response.status_code == 404
    assert "Active category not found." in response.json()["detail"]


async def test_create_time_window_category_not_owned(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_two_category: CategoryModel,  # Category owned by user_two
    user_one_day_template_model: DayTemplateModel,
):
    tw_data = TimeWindowCreateRequest(
        name="Unowned Category TW",
        category=user_two_category.id,
        day_template_id=user_one_day_template_model.id,
        start_time=540,
        end_time=720,
    )
    response = await async_client.post(
        TIME_WINDOWS_ENDPOINT, headers=auth_headers_user_one, json=tw_data.model_dump(mode="json")
    )
    assert response.status_code == 403  # NotOwnerException
    assert "Category not owned by user" in response.json()["detail"]


async def test_create_time_window_with_soft_deleted_category(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_day_template_model: DayTemplateModel,
    test_user_one: UserModel,  # Added to create a category for this user
):
    # 1. Create a category for user_one
    category_name = "CategoryToSoftDeleteForTW"
    category_create_data = {"name": category_name, "user_id": str(test_user_one.id)}  # Simplified for creation
    create_cat_response = await async_client.post(
        CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=category_create_data
    )
    assert create_cat_response.status_code == 201
    soft_deleted_category_id = create_cat_response.json()["id"]

    # 2. Soft-delete this category
    delete_cat_response = await async_client.delete(
        f"{CATEGORIES_ENDPOINT}{soft_deleted_category_id}", headers=auth_headers_user_one
    )
    assert delete_cat_response.status_code == 204

    # 3. Attempt to create a time window using the ID of the soft-deleted category
    tw_data = TimeWindowCreateRequest(
        name="TW With Soft Deleted Cat",
        category=ObjectId(soft_deleted_category_id),
        day_template_id=user_one_day_template_model.id,
        start_time=800,  # 13:20
        end_time=900,  # 15:00
    )
    response = await async_client.post(
        TIME_WINDOWS_ENDPOINT, headers=auth_headers_user_one, json=tw_data.model_dump(mode="json")
    )

    # 4. Assert a 404 status code and the specific error message
    assert response.status_code == 404
    error_detail = response.json()["detail"]
    assert "Active category not found." in error_detail


async def test_create_time_window_invalid_day_template(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_category: CategoryModel
):
    non_existent_dt_id = ObjectId()
    tw_data = TimeWindowCreateRequest(
        name="Invalid DT TW",
        category=user_one_category.id,
        day_template_id=non_existent_dt_id,
        start_time=540,
        end_time=720,
    )
    response = await async_client.post(
        TIME_WINDOWS_ENDPOINT, headers=auth_headers_user_one, json=tw_data.model_dump(mode="json")
    )
    assert response.status_code == 404
    assert f"Day template with ID '{non_existent_dt_id}' not found" in response.json()["detail"]


async def test_create_time_window_day_template_not_owned(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_category: CategoryModel,
    user_two_day_template_model: DayTemplateModel,  # DayTemplate owned by user_two
):
    tw_data = TimeWindowCreateRequest(
        name="Unowned DT TW",
        category=user_one_category.id,
        day_template_id=user_two_day_template_model.id,
        start_time=540,
        end_time=720,
    )
    response = await async_client.post(
        TIME_WINDOWS_ENDPOINT, headers=auth_headers_user_one, json=tw_data.model_dump(mode="json")
    )
    assert response.status_code == 403  # NotOwnerException
    assert "Day template not owned by user" in response.json()["detail"]


async def test_get_all_time_windows_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_time_window: TimeWindowModel,  # Fixture creates one TW for user_one
    test_user_one: UserModel,
):
    response = await async_client.get(TIME_WINDOWS_ENDPOINT, headers=auth_headers_user_one)
    assert response.status_code == 200
    time_windows = [TimeWindowResponse(**item) for item in response.json()]
    assert len(time_windows) >= 1  # Can be more if other tests created TWs for user_one
    assert any(tw.id == user_one_time_window.id for tw in time_windows)
    for tw in time_windows:
        assert tw.user_id == test_user_one.id


async def test_get_all_time_windows_empty(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_db, test_user_one: UserModel
):
    await test_db.get_collection(TimeWindowModel).delete_many({"user": test_user_one.id})
    response = await async_client.get(TIME_WINDOWS_ENDPOINT, headers=auth_headers_user_one)
    assert response.status_code == 200
    assert response.json() == []


async def test_get_time_window_by_id_success(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_time_window: TimeWindowModel
):
    response = await async_client.get(
        f"{TIME_WINDOWS_ENDPOINT}{user_one_time_window.id}", headers=auth_headers_user_one
    )
    assert response.status_code == 200
    fetched_tw = TimeWindowResponse(**response.json())
    assert fetched_tw.id == user_one_time_window.id
    assert fetched_tw.name == user_one_time_window.name


async def test_get_time_window_by_id_not_found(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    non_existent_id = ObjectId()
    response = await async_client.get(f"{TIME_WINDOWS_ENDPOINT}{non_existent_id}", headers=auth_headers_user_one)
    assert response.status_code == 404


async def test_get_time_window_by_id_not_owner(
    async_client: AsyncClient, auth_headers_user_two: dict[str, str], user_one_time_window: TimeWindowModel
):
    # user_one_time_window is owned by user_one
    response = await async_client.get(
        f"{TIME_WINDOWS_ENDPOINT}{user_one_time_window.id}", headers=auth_headers_user_two
    )
    assert response.status_code == 403


async def test_update_time_window_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_time_window: TimeWindowModel,
    user_one_category: CategoryModel,  # Original category
    user_one_day_template_model: DayTemplateModel,  # Original DT
    test_user_one: UserModel,
    test_db,
):
    # Create a new category and day template for update
    new_category_data = CategoryModel(name="Updated Category for TW", user=test_user_one.id, color="#112233")
    await test_db.save(new_category_data)
    new_dt_data = DayTemplateModel(name="Updated DT for TW", user=test_user_one.id)
    await test_db.save(new_dt_data)

    update_data = TimeWindowUpdateRequest(
        name="Updated TW Name",
        start_time=600,  # 10:00
        end_time=780,  # 13:00
        category=new_category_data.id,
        day_template_id=new_dt_data.id,
    )
    response = await async_client.patch(
        f"{TIME_WINDOWS_ENDPOINT}{user_one_time_window.id}",
        headers=auth_headers_user_one,
        json=update_data.model_dump(mode="json", exclude_none=True),
    )
    assert response.status_code == 200
    updated_tw = TimeWindowResponse(**response.json())
    assert updated_tw.name == update_data.name
    assert updated_tw.start_time == update_data.start_time
    assert updated_tw.end_time == update_data.end_time
    assert updated_tw.category.id == new_category_data.id
    assert updated_tw.category.name == new_category_data.name
    assert updated_tw.day_template_id == new_dt_data.id
    assert updated_tw.user_id == test_user_one.id


async def test_update_time_window_invalid_times(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_time_window: TimeWindowModel
):
    invalid_update_payload = {"start_time": 700, "end_time": 600}  # end < start
    response = await async_client.patch(
        f"{TIME_WINDOWS_ENDPOINT}{user_one_time_window.id}",
        headers=auth_headers_user_one,
        json=invalid_update_payload,
    )
    assert response.status_code == 422  # FastAPI request validation error
    # Or 400 if service raises ValueError explicitly and it's caught


async def test_update_time_window_not_found(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    non_existent_id = ObjectId()
    update_data = TimeWindowUpdateRequest(name="No TW")
    response = await async_client.patch(
        f"{TIME_WINDOWS_ENDPOINT}{non_existent_id}",
        headers=auth_headers_user_one,
        json=update_data.model_dump(mode="json", exclude_none=True),
    )
    assert response.status_code == 404


async def test_update_time_window_not_owner(
    async_client: AsyncClient, auth_headers_user_two: dict[str, str], user_one_time_window: TimeWindowModel
):
    update_data = TimeWindowUpdateRequest(name="Attempted Update By Two")
    response = await async_client.patch(
        f"{TIME_WINDOWS_ENDPOINT}{user_one_time_window.id}",
        headers=auth_headers_user_two,  # User two tries to update user one's TW
        json=update_data.model_dump(mode="json", exclude_none=True),
    )
    assert response.status_code == 403


async def test_update_time_window_to_soft_deleted_category(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_time_window: TimeWindowModel,  # Existing TW with an active category
    user_one_category: CategoryModel,  # This is the active category of user_one_time_window
    test_user_one: UserModel,  # Added for creating another category
):
    # 1. Create another category for user_one that will be soft-deleted
    category_to_soft_delete_name = "AnotherCatToSoftDeleteForTWUpdate"
    cat_create_data = {"name": category_to_soft_delete_name, "user_id": str(test_user_one.id)}
    create_cat_resp = await async_client.post(CATEGORIES_ENDPOINT, headers=auth_headers_user_one, json=cat_create_data)
    assert create_cat_resp.status_code == 201
    soft_deleted_category_id = ObjectId(create_cat_resp.json()["id"])

    # 2. Soft-delete this newly created category
    delete_cat_resp = await async_client.delete(
        f"{CATEGORIES_ENDPOINT}{soft_deleted_category_id}", headers=auth_headers_user_one
    )
    assert delete_cat_resp.status_code == 204

    # Ensure the original time window's category is not the one we just soft-deleted
    assert user_one_time_window.category != soft_deleted_category_id

    # 3. Attempt to update the existing time window to use the soft-deleted category
    update_data = TimeWindowUpdateRequest(category=soft_deleted_category_id)
    response = await async_client.patch(
        f"{TIME_WINDOWS_ENDPOINT}{user_one_time_window.id}",
        headers=auth_headers_user_one,
        json=update_data.model_dump(mode="json", exclude_none=True),
    )

    # 4. Assert a 404 status code and the specific error message
    assert response.status_code == 404
    error_detail = response.json()["detail"]
    assert "Active category for update not found." in error_detail


async def test_delete_time_window_success(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_time_window: TimeWindowModel
):
    delete_response = await async_client.delete(
        f"{TIME_WINDOWS_ENDPOINT}{user_one_time_window.id}", headers=auth_headers_user_one
    )
    assert delete_response.status_code == 204

    get_response = await async_client.get(
        f"{TIME_WINDOWS_ENDPOINT}{user_one_time_window.id}", headers=auth_headers_user_one
    )
    assert get_response.status_code == 404


async def test_delete_time_window_not_found(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    non_existent_id = ObjectId()
    response = await async_client.delete(f"{TIME_WINDOWS_ENDPOINT}{non_existent_id}", headers=auth_headers_user_one)
    assert response.status_code == 404


async def test_delete_time_window_not_owner(
    async_client: AsyncClient, auth_headers_user_two: dict[str, str], user_one_time_window: TimeWindowModel
):
    response = await async_client.delete(
        f"{TIME_WINDOWS_ENDPOINT}{user_one_time_window.id}", headers=auth_headers_user_two
    )
    assert response.status_code == 403


@pytest.mark.parametrize(
    "endpoint_method, url_suffix",
    [
        ("POST", ""),
        ("GET", ""),
        ("GET", f"{ObjectId()}"),
        ("PATCH", f"{ObjectId()}"),
        ("DELETE", f"{ObjectId()}"),
    ],
)
async def test_time_window_endpoints_unauthenticated(async_client: AsyncClient, endpoint_method: str, url_suffix: str):
    json_payload = None
    if endpoint_method in ["POST", "PATCH"]:
        # Minimal valid-ish payload for schema parsing before auth check
        json_payload = (
            {
                "name": "Test",
                "category": str(ObjectId()),
                "day_template_id": str(ObjectId()),
                "start_time": 0,
                "end_time": 60,
            }
            if endpoint_method == "POST"
            else {"name": "Test"}
        )

    response = await async_client.request(
        method=endpoint_method, url=f"{TIME_WINDOWS_ENDPOINT}{url_suffix}", json=json_payload
    )
    assert response.status_code == 401
    assert response.json()["detail"] == "Not authenticated"
