import random
import uuid
from datetime import date, timedelta

import pytest
from httpx import AsyncClient
from odmantic import ObjectId

from app.api.schemas.daily_plan import (
    DailyPlanAllocationCreate,
    DailyPlanCreateRequest,
    DailyPlanResponse,
    DailyPlanUpdateRequest,
)
from app.api.schemas.task import TaskPriority, TaskStatus
from app.core.config import settings
from app.db.models.category import Category as CategoryModel
from app.db.models.daily_plan import DailyPlan as DailyPlanModel
from app.db.models.day_template import DayTemplate as DayTemplateModel
from app.db.models.task import Task as TaskModel
from app.db.models.time_window import TimeWindow as TimeWindowModel
from app.db.models.user import User as UserModel

API_V1_STR = settings.API_V1_STR
DAILY_PLANS_ENDPOINT = f"{API_V1_STR}/daily-plans/"

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def user_one_time_window_alt(
    test_db, test_user_one: UserModel, user_one_category: CategoryModel, user_one_day_template_model: DayTemplateModel
) -> TimeWindowModel:
    time_window_data = {
        "name": f"TW_UserOne_Alt_{uuid.uuid4()}",
        "start_time": 780,  # 13:00
        "end_time": 840,  # 14:00
        "category": user_one_category.id,
        "user": test_user_one.id,
        "day_template_id": user_one_day_template_model.id,
    }
    instance = TimeWindowModel(**time_window_data)
    await test_db.save(instance)
    return instance


@pytest.fixture
async def user_one_task_alt(test_db, test_user_one: UserModel, user_one_category: CategoryModel) -> TaskModel:
    task_data = {
        "title": f"UserOne_Task_Alt_{uuid.uuid4()}",
        "user_id": test_user_one.id,
        "category_id": user_one_category.id,
        "priority": TaskPriority.LOW,
        "status": TaskStatus.TODO,
    }
    instance = TaskModel(**task_data)
    await test_db.save(instance)
    return instance


@pytest.fixture
async def unique_date() -> date:
    # Provides a unique date for each test needing it, to avoid conflicts
    # This simple version might collide if tests run very fast, but good enough for now
    # A more robust solution might involve a global counter or random large offset.
    return date.today() + timedelta(days=random.randint(100, 10000))


async def test_create_daily_plan_success_with_allocations(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_time_window: TimeWindowModel,
    user_one_task_model: TaskModel,
    unique_date: date,
):
    plan_date = unique_date
    allocations = [DailyPlanAllocationCreate(time_window_id=user_one_time_window.id, task_id=user_one_task_model.id)]
    payload = DailyPlanCreateRequest(plan_date=plan_date, allocations=allocations)

    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )

    assert response.status_code == 201
    created_plan = DailyPlanResponse(**response.json())
    assert created_plan.plan_date == plan_date
    assert created_plan.user_id == test_user_one.id
    assert len(created_plan.allocations) == 1
    allocation_resp = created_plan.allocations[0]
    assert allocation_resp.time_window.id == user_one_time_window.id
    assert allocation_resp.task.id == user_one_task_model.id
    assert allocation_resp.task.category.id == user_one_task_model.category_id


async def test_create_daily_plan_success_empty_allocations(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_user_one: UserModel, unique_date: date
):
    plan_date = unique_date
    payload = DailyPlanCreateRequest(plan_date=plan_date, allocations=[])
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 201
    created_plan = DailyPlanResponse(**response.json())
    assert created_plan.plan_date == plan_date
    assert created_plan.user_id == test_user_one.id
    assert len(created_plan.allocations) == 0


async def test_create_daily_plan_duplicate_date_fails(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], unique_date: date
):
    plan_date = unique_date
    payload = DailyPlanCreateRequest(plan_date=plan_date, allocations=[])
    await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )  # First creation
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )  # Second attempt
    assert response.status_code == 409
    assert f"Daily plan for date '{plan_date.isoformat()}' already exists" in response.json()["detail"]


async def test_create_daily_plan_duplicate_time_window_in_allocations_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_time_window: TimeWindowModel,
    user_one_task_model: TaskModel,
    unique_date: date,
):
    allocations = [
        DailyPlanAllocationCreate(time_window_id=user_one_time_window.id, task_id=user_one_task_model.id),
        DailyPlanAllocationCreate(time_window_id=user_one_time_window.id, task_id=user_one_task_model.id),
    ]
    payload = DailyPlanCreateRequest(plan_date=unique_date, allocations=allocations)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 400
    assert "Duplicate time_window_ids found in allocations." in response.json()["detail"]


async def test_create_daily_plan_non_existent_time_window_fails(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: TaskModel, unique_date: date
):
    non_existent_tw_id = ObjectId()
    allocations = [DailyPlanAllocationCreate(time_window_id=non_existent_tw_id, task_id=user_one_task_model.id)]
    payload = DailyPlanCreateRequest(plan_date=unique_date, allocations=allocations)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 404
    assert f"Time window with ID '{str(non_existent_tw_id)}' not found" in response.json()["detail"]


async def test_create_daily_plan_unowned_time_window_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_two_time_window: TimeWindowModel,  # Belongs to user_two
    user_one_task_model: TaskModel,
    unique_date: date,
):
    allocations = [DailyPlanAllocationCreate(time_window_id=user_two_time_window.id, task_id=user_one_task_model.id)]
    payload = DailyPlanCreateRequest(plan_date=unique_date, allocations=allocations)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 404  # Service validation for TW ownership returns 404 not found for current user
    assert f"Time window with ID '{str(user_two_time_window.id)}' not found" in response.json()["detail"]


async def test_create_daily_plan_non_existent_task_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_time_window: TimeWindowModel,
    unique_date: date,
):
    non_existent_task_id = ObjectId()
    allocations = [DailyPlanAllocationCreate(time_window_id=user_one_time_window.id, task_id=non_existent_task_id)]
    payload = DailyPlanCreateRequest(plan_date=unique_date, allocations=allocations)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 404
    assert f"Task with ID '{str(non_existent_task_id)}' not found" in response.json()["detail"]


async def test_create_daily_plan_unowned_task_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_time_window: TimeWindowModel,
    user_two_task_model: TaskModel,  # Belongs to user_two
    unique_date: date,
):
    allocations = [DailyPlanAllocationCreate(time_window_id=user_one_time_window.id, task_id=user_two_task_model.id)]
    payload = DailyPlanCreateRequest(plan_date=unique_date, allocations=allocations)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 404  # Service validation for Task ownership returns 404 not found for current user
    assert f"Task with ID '{str(user_two_task_model.id)}' not found" in response.json()["detail"]


async def test_create_daily_plan_unauthenticated_fails(async_client: AsyncClient, unique_date: date):
    payload = DailyPlanCreateRequest(plan_date=unique_date, allocations=[])
    response = await async_client.post(DAILY_PLANS_ENDPOINT, json=payload.model_dump(mode="json"))
    assert response.status_code == 401


async def test_get_daily_plan_by_date_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_time_window: TimeWindowModel,
    user_one_task_model: TaskModel,
    unique_date: date,
):
    plan_date = unique_date
    allocations = [DailyPlanAllocationCreate(time_window_id=user_one_time_window.id, task_id=user_one_task_model.id)]
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, allocations=allocations)
    create_response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_response.status_code == 201

    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}{plan_date.isoformat()}", headers=auth_headers_user_one)
    assert response.status_code == 200
    fetched_plan = DailyPlanResponse(**response.json())
    assert fetched_plan.plan_date == plan_date
    assert fetched_plan.user_id == test_user_one.id
    assert len(fetched_plan.allocations) == 1
    assert fetched_plan.allocations[0].time_window.id == user_one_time_window.id
    assert fetched_plan.allocations[0].task.id == user_one_task_model.id


async def test_get_daily_plan_by_date_not_found(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], unique_date: date
):
    non_existent_date = unique_date + timedelta(days=100)  # A date guaranteed not to exist for this test
    response = await async_client.get(
        f"{DAILY_PLANS_ENDPOINT}{non_existent_date.isoformat()}", headers=auth_headers_user_one
    )
    assert response.status_code == 404
    assert f"Daily plan for date '{non_existent_date.isoformat()}' not found" in response.json()["detail"]


async def test_get_daily_plan_by_date_invalid_date_format(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str]
):
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}invalid-date", headers=auth_headers_user_one)
    assert response.status_code == 422  # FastAPI path param conversion error


async def test_get_daily_plan_by_date_unauthenticated_fails(async_client: AsyncClient, unique_date: date):
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}{unique_date.isoformat()}")
    assert response.status_code == 401


async def test_get_daily_plan_by_id_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_time_window: TimeWindowModel,
    user_one_task_model: TaskModel,
    unique_date: date,
):
    create_payload = DailyPlanCreateRequest(
        plan_date=unique_date,
        allocations=[DailyPlanAllocationCreate(time_window_id=user_one_time_window.id, task_id=user_one_task_model.id)],
    )
    create_response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_response.status_code == 201
    created_plan_id = create_response.json()["id"]

    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}id/{created_plan_id}", headers=auth_headers_user_one)
    assert response.status_code == 200
    fetched_plan = DailyPlanResponse(**response.json())
    assert str(fetched_plan.id) == created_plan_id
    assert fetched_plan.user_id == test_user_one.id


async def test_get_daily_plan_by_id_not_found(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    non_existent_id = ObjectId()
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}id/{non_existent_id}", headers=auth_headers_user_one)
    assert response.status_code == 404


async def test_get_daily_plan_by_id_invalid_id_format(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}id/invalid-object-id", headers=auth_headers_user_one)
    assert response.status_code == 422  # FastAPI path param conversion for ObjectId
    assert "Input should be an instance of ObjectId" in response.json()["detail"][0]["msg"]


async def test_get_daily_plan_by_id_not_owner_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    auth_headers_user_two: dict[str, str],  # User two's auth
    unique_date: date,
):
    # User one creates a plan
    create_payload = DailyPlanCreateRequest(plan_date=unique_date, allocations=[])
    create_response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_response.status_code == 201
    plan_id_user_one = create_response.json()["id"]

    # User two tries to get it
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}id/{plan_id_user_one}", headers=auth_headers_user_two)
    assert response.status_code == 403  # Service ownership check


async def test_get_daily_plan_by_id_unauthenticated_fails(async_client: AsyncClient):
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}id/{ObjectId()}")
    assert response.status_code == 401


async def test_update_daily_plan_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_time_window: TimeWindowModel,
    user_one_task_model: TaskModel,
    user_one_time_window_alt: TimeWindowModel,  # For update
    user_one_task_alt: TaskModel,  # For update
    unique_date: date,
):
    plan_date = unique_date
    # Initial creation
    initial_allocations = [
        DailyPlanAllocationCreate(time_window_id=user_one_time_window.id, task_id=user_one_task_model.id)
    ]
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, allocations=initial_allocations)
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201

    # Update
    updated_allocations = [
        DailyPlanAllocationCreate(time_window_id=user_one_time_window_alt.id, task_id=user_one_task_alt.id)
    ]
    update_payload = DailyPlanUpdateRequest(allocations=updated_allocations)
    response = await async_client.patch(
        f"{DAILY_PLANS_ENDPOINT}{plan_date.isoformat()}",
        headers=auth_headers_user_one,
        json=update_payload.model_dump(mode="json"),
    )
    assert response.status_code == 200
    updated_plan = DailyPlanResponse(**response.json())
    assert updated_plan.plan_date == plan_date
    assert len(updated_plan.allocations) == 1
    assert updated_plan.allocations[0].time_window.id == user_one_time_window_alt.id
    assert updated_plan.allocations[0].task.id == user_one_task_alt.id


async def test_update_daily_plan_to_empty_allocations_success(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], unique_date: date
):
    plan_date = unique_date
    # Create a plan (can be with or without initial allocations)
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, allocations=[])
    await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )

    update_payload = DailyPlanUpdateRequest(allocations=[])
    response = await async_client.patch(
        f"{DAILY_PLANS_ENDPOINT}{plan_date.isoformat()}",
        headers=auth_headers_user_one,
        json=update_payload.model_dump(mode="json"),
    )
    assert response.status_code == 200
    updated_plan = DailyPlanResponse(**response.json())
    assert len(updated_plan.allocations) == 0


async def test_update_daily_plan_date_not_found_fails(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], unique_date: date
):
    non_existent_date = unique_date + timedelta(days=200)
    update_payload = DailyPlanUpdateRequest(allocations=[])
    response = await async_client.patch(
        f"{DAILY_PLANS_ENDPOINT}{non_existent_date.isoformat()}",
        headers=auth_headers_user_one,
        json=update_payload.model_dump(mode="json"),
    )
    assert response.status_code == 404


async def test_update_daily_plan_with_extra_fields_fails(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], unique_date: date
):
    plan_date = unique_date
    # Create a plan
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, allocations=[])
    await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )

    invalid_update_payload = {"allocations": [], "extra_field": "should_fail"}
    response = await async_client.patch(
        f"{DAILY_PLANS_ENDPOINT}{plan_date.isoformat()}",
        headers=auth_headers_user_one,
        json=invalid_update_payload,  # Sending dict directly
    )
    assert response.status_code == 422  # Due to extra="forbid" in DailyPlanUpdateRequest
    assert "Extra inputs are not permitted" in response.json()["detail"][0]["msg"]


async def test_update_daily_plan_unauthenticated_fails(async_client: AsyncClient, unique_date: date):
    update_payload = DailyPlanUpdateRequest(allocations=[])
    response = await async_client.patch(
        f"{DAILY_PLANS_ENDPOINT}{unique_date.isoformat()}", json=update_payload.model_dump(mode="json")
    )
    assert response.status_code == 401


async def test_update_daily_plan_unowned_time_window_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_two_time_window: TimeWindowModel,  # Belongs to user_two
    user_one_task_model: TaskModel,
    unique_date: date,
):
    plan_date = unique_date
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, allocations=[])
    await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )

    updated_allocations = [
        DailyPlanAllocationCreate(time_window_id=user_two_time_window.id, task_id=user_one_task_model.id)
    ]
    update_payload = DailyPlanUpdateRequest(allocations=updated_allocations)
    response = await async_client.patch(
        f"{DAILY_PLANS_ENDPOINT}{plan_date.isoformat()}",
        headers=auth_headers_user_one,
        json=update_payload.model_dump(mode="json"),
    )
    assert response.status_code == 404
    assert f"Time window with ID '{str(user_two_time_window.id)}' not found" in response.json()["detail"]


async def test_update_daily_plan_unowned_task_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_time_window: TimeWindowModel,
    user_two_task_model: TaskModel,  # Belongs to user_two
    unique_date: date,
):
    plan_date = unique_date
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, allocations=[])
    await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )

    updated_allocations = [
        DailyPlanAllocationCreate(time_window_id=user_one_time_window.id, task_id=user_two_task_model.id)
    ]
    update_payload = DailyPlanUpdateRequest(allocations=updated_allocations)
    response = await async_client.patch(
        f"{DAILY_PLANS_ENDPOINT}{plan_date.isoformat()}",
        headers=auth_headers_user_one,
        json=update_payload.model_dump(mode="json"),
    )
    assert response.status_code == 404
    assert f"Task with ID '{str(user_two_task_model.id)}' not found" in response.json()["detail"]


async def test_get_daily_plan_with_soft_deleted_time_window_fails_retrieval(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_time_window: TimeWindowModel,
    user_one_task_model: TaskModel,
    unique_date: date,
    test_db,
):
    plan_date = unique_date
    allocations = [DailyPlanAllocationCreate(time_window_id=user_one_time_window.id, task_id=user_one_task_model.id)]
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, allocations=allocations)
    create_response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_response.status_code == 201
    created_plan_id = create_response.json()["id"]

    # Soft delete the time window
    user_one_time_window.is_deleted = True
    await test_db.save(user_one_time_window)

    # Attempt to get the plan by ID
    response_by_id = await async_client.get(
        f"{DAILY_PLANS_ENDPOINT}id/{created_plan_id}", headers=auth_headers_user_one
    )
    assert response_by_id.status_code == 404  # Because _build_daily_plan_response can't find the active TW
    assert f"Time window with ID '{user_one_time_window.id}' not found" in response_by_id.json()["detail"]

    # Attempt to get the plan by Date
    response_by_date = await async_client.get(
        f"{DAILY_PLANS_ENDPOINT}{plan_date.isoformat()}", headers=auth_headers_user_one
    )
    assert response_by_date.status_code == 404
    assert f"Time window with ID '{user_one_time_window.id}' not found" in response_by_date.json()["detail"]


async def test_get_daily_plan_with_soft_deleted_task_fails_retrieval(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_time_window: TimeWindowModel,
    user_one_task_model: TaskModel,
    unique_date: date,
    test_db,
):
    plan_date = unique_date
    allocations = [DailyPlanAllocationCreate(time_window_id=user_one_time_window.id, task_id=user_one_task_model.id)]
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, allocations=allocations)
    create_response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_response.status_code == 201
    created_plan_id = create_response.json()["id"]

    # Soft delete the task
    user_one_task_model.is_deleted = True
    await test_db.save(user_one_task_model)

    # Attempt to get the plan by ID
    response_by_id = await async_client.get(
        f"{DAILY_PLANS_ENDPOINT}id/{created_plan_id}", headers=auth_headers_user_one
    )
    assert response_by_id.status_code == 404  # Because _build_daily_plan_response can't find the active Task
    assert f"Task with ID '{user_one_task_model.id}' not found" in response_by_id.json()["detail"]

    # Attempt to get the plan by Date
    response_by_date = await async_client.get(
        f"{DAILY_PLANS_ENDPOINT}{plan_date.isoformat()}", headers=auth_headers_user_one
    )
    assert response_by_date.status_code == 404
    assert f"Task with ID '{user_one_task_model.id}' not found" in response_by_date.json()["detail"]


async def test_response_schema_for_get_plan_by_date(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_time_window: TimeWindowModel,
    user_one_task_model: TaskModel,
    user_one_category: CategoryModel,  # For TW and Task
    user_one_day_template_model: DayTemplateModel,  # For TW
    unique_date: date,
):
    plan_date = unique_date
    allocations = [DailyPlanAllocationCreate(time_window_id=user_one_time_window.id, task_id=user_one_task_model.id)]
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, allocations=allocations)
    create_response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_response.status_code == 201

    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}{plan_date.isoformat()}", headers=auth_headers_user_one)
    assert response.status_code == 200

    # Validate against DailyPlanResponse schema (implicitly done by Pydantic if no error)
    # and check key nested fields
    plan_resp_data = response.json()
    plan_response_obj = DailyPlanResponse(**plan_resp_data)  # This will raise ValidationError if schema mismatch

    assert plan_response_obj.id is not None
    assert plan_response_obj.plan_date == plan_date
    assert len(plan_response_obj.allocations) == 1

    allocation_item = plan_response_obj.allocations[0]
    # TimeWindow checks
    assert allocation_item.time_window.id == user_one_time_window.id
    assert allocation_item.time_window.name == user_one_time_window.name
    assert allocation_item.time_window.start_time == user_one_time_window.start_time
    assert allocation_item.time_window.end_time == user_one_time_window.end_time
    assert allocation_item.time_window.day_template_id == user_one_day_template_model.id
    assert allocation_item.time_window.category.id == user_one_category.id  # TW's category
    assert allocation_item.time_window.category.name == user_one_category.name

    # Task checks
    assert allocation_item.task.id == user_one_task_model.id
    assert allocation_item.task.title == user_one_task_model.title
    assert allocation_item.task.priority == user_one_task_model.priority
    assert allocation_item.task.status == user_one_task_model.status
    assert allocation_item.task.category.id == user_one_task_model.category_id  # Task's category
    assert allocation_item.task.category.name == user_one_category.name


async def test_plan_date_must_be_unique_per_user_not_globally(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    auth_headers_user_two: dict[str, str],
    unique_date: date,
):
    plan_date = unique_date

    # User One creates a plan
    payload_user_one = DailyPlanCreateRequest(plan_date=plan_date, allocations=[])
    response_user_one = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload_user_one.model_dump(mode="json")
    )
    assert response_user_one.status_code == 201

    # User Two creates a plan for the SAME date
    payload_user_two = DailyPlanCreateRequest(plan_date=plan_date, allocations=[])
    response_user_two = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_two, json=payload_user_two.model_dump(mode="json")
    )
    assert response_user_two.status_code == 201  # Should succeed for User Two

    # User One tries to create again for the same date - should fail
    response_user_one_again = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload_user_one.model_dump(mode="json")
    )
    assert response_user_one_again.status_code == 409
    assert (
        f"Daily plan for date '{plan_date.isoformat()}' already exists for this user"
        in response_user_one_again.json()["detail"]
    )


# Cleanup daily plans after tests if necessary, or use very unique dates
@pytest.fixture(autouse=True)
async def cleanup_daily_plans(test_db):
    yield
    # This is a basic cleanup. For true isolation, it's better to run tests
    # against a dedicated test DB that's wiped before/after test suite.
    # Or, ensure unique dates for each test that creates a plan.
    # For this example, we'll rely on unique_date for most cases and this basic cleanup.
    await test_db.get_collection(DailyPlanModel).delete_many({})
