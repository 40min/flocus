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

# from app.db.models.day_template import DayTemplate as DayTemplateModel
from app.db.models.task import Task as TaskModel
from app.db.models.user import User as UserModel

API_V1_STR = settings.API_V1_STR
DAILY_PLANS_ENDPOINT = f"{API_V1_STR}/daily-plans"

pytestmark = pytest.mark.asyncio


@pytest.fixture
async def user_one_task_alt(test_db, test_user_one: UserModel, user_one_category: CategoryModel) -> TaskModel:
    task_data = {
        "title": f"UserOne_Task_Alt_{uuid.uuid4()}",
        "user_id": test_user_one.id,
        "category_id": user_one_category.id,
        "priority": TaskPriority.LOW,
        "status": TaskStatus.PENDING,
    }
    instance = TaskModel(**task_data)
    await test_db.save(instance)
    return instance


@pytest.fixture
async def unique_date() -> date:
    return date.today() + timedelta(days=random.randint(100, 10000))


def create_allocation_payload(
    name: str, category_id: ObjectId, start_time: int, end_time: int, task_id: ObjectId
) -> DailyPlanAllocationCreate:
    return DailyPlanAllocationCreate(
        name=name,
        category_id=category_id,
        start_time=start_time,
        end_time=end_time,
        task_id=task_id,
    )


async def test_create_daily_plan_success_with_allocations(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
    unique_date: date,
):
    plan_date = unique_date
    allocations = [
        create_allocation_payload(
            name="Morning Focus",
            category_id=user_one_category.id,
            start_time=540,
            end_time=720,
            task_id=user_one_task_model.id,
        )
    ]
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
    assert allocation_resp.time_window.name == "Morning Focus"
    assert allocation_resp.time_window.start_time == 540
    assert allocation_resp.time_window.end_time == 720
    assert allocation_resp.time_window.category.id == user_one_category.id
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
    await async_client.post(DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json"))
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 409
    assert f"Daily plan for date '{plan_date.isoformat()}' already exists" in response.json()["detail"]


async def test_create_daily_plan_invalid_embedded_time_window_data_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
    unique_date: date,
):
    # Send raw dict to bypass client-side Pydantic validation and test server-side
    raw_allocations_payload = [
        {
            "name": "Invalid TW",
            "category_id": str(user_one_category.id),  # Convert ObjectId to str for JSON
            "start_time": 720,  # 12:00
            "end_time": 540,  # 09:00 (invalid)
            "task_id": str(user_one_task_model.id),  # Convert ObjectId to str for JSON
        }
    ]
    raw_payload = {"plan_date": unique_date.isoformat(), "allocations": raw_allocations_payload}

    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=raw_payload  # Send raw dict
    )
    assert response.status_code == 422
    assert "end_time must be greater than start_time" in response.text


async def test_create_daily_plan_non_existent_category_for_tw_fails(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: TaskModel, unique_date: date
):
    non_existent_category_id = ObjectId()
    allocations = [
        create_allocation_payload(
            name="Test TW",
            category_id=non_existent_category_id,
            start_time=600,
            end_time=660,
            task_id=user_one_task_model.id,
        )
    ]
    payload = DailyPlanCreateRequest(plan_date=unique_date, allocations=allocations)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 404
    assert "Category for allocation 'Test TW' not found." in response.json()["detail"]


async def test_create_daily_plan_unowned_category_for_tw_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_two_category: CategoryModel,
    user_one_task_model: TaskModel,
    unique_date: date,
):
    allocations = [
        create_allocation_payload(
            name="Unowned Cat TW",
            category_id=user_two_category.id,
            start_time=600,
            end_time=660,
            task_id=user_one_task_model.id,
        )
    ]
    payload = DailyPlanCreateRequest(plan_date=unique_date, allocations=allocations)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 404
    assert "Category for allocation 'Unowned Cat TW' not found." in response.json()["detail"]


async def test_create_daily_plan_non_existent_task_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_category: CategoryModel,
    unique_date: date,
):
    non_existent_task_id = ObjectId()
    allocations = [
        create_allocation_payload(
            name="Valid TW",
            category_id=user_one_category.id,
            start_time=600,
            end_time=660,
            task_id=non_existent_task_id,
        )
    ]
    payload = DailyPlanCreateRequest(plan_date=unique_date, allocations=allocations)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 404
    assert f"Task with ID '{str(non_existent_task_id)}' not found" in response.json()["detail"]


async def test_create_daily_plan_unowned_task_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_category: CategoryModel,
    user_two_task_model: TaskModel,
    unique_date: date,
):
    allocations = [
        create_allocation_payload(
            name="Valid TW",
            category_id=user_one_category.id,
            start_time=600,
            end_time=660,
            task_id=user_two_task_model.id,
        )
    ]
    payload = DailyPlanCreateRequest(plan_date=unique_date, allocations=allocations)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 404
    assert f"Task with ID '{str(user_two_task_model.id)}' not found" in response.json()["detail"]


async def test_create_daily_plan_unauthenticated_fails(async_client: AsyncClient, unique_date: date):
    payload = DailyPlanCreateRequest(plan_date=unique_date, allocations=[])
    response = await async_client.post(DAILY_PLANS_ENDPOINT, json=payload.model_dump(mode="json"))
    assert response.status_code == 401


async def test_get_daily_plan_by_date_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
    unique_date: date,
):
    plan_date = unique_date
    allocations = [
        create_allocation_payload(
            name="Morning Work",
            category_id=user_one_category.id,
            start_time=540,
            end_time=720,
            task_id=user_one_task_model.id,
        )
    ]
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, allocations=allocations)
    create_response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_response.status_code == 201

    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/{plan_date.isoformat()}", headers=auth_headers_user_one)
    assert response.status_code == 200
    fetched_plan = DailyPlanResponse(**response.json())
    assert fetched_plan.plan_date == plan_date
    assert fetched_plan.user_id == test_user_one.id
    assert len(fetched_plan.allocations) == 1
    assert fetched_plan.allocations[0].time_window.name == "Morning Work"
    assert fetched_plan.allocations[0].time_window.category.id == user_one_category.id
    assert fetched_plan.allocations[0].task.id == user_one_task_model.id


async def test_get_daily_plan_by_date_not_found(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], unique_date: date
):
    non_existent_date = unique_date + timedelta(days=100)
    response = await async_client.get(
        f"{DAILY_PLANS_ENDPOINT}/{non_existent_date.isoformat()}", headers=auth_headers_user_one
    )
    assert response.status_code == 404
    assert f"Daily plan for date '{non_existent_date.isoformat()}' not found" in response.json()["detail"]


async def test_get_daily_plan_by_date_invalid_date_format(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str]
):
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/invalid-date", headers=auth_headers_user_one)
    assert response.status_code == 422


async def test_get_daily_plan_by_date_unauthenticated_fails(async_client: AsyncClient, unique_date: date):
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/{unique_date.isoformat()}")
    assert response.status_code == 401


async def test_get_daily_plan_by_id_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
    unique_date: date,
):
    create_payload = DailyPlanCreateRequest(
        plan_date=unique_date,
        allocations=[
            create_allocation_payload(
                name="Focus Time",
                category_id=user_one_category.id,
                start_time=600,
                end_time=700,
                task_id=user_one_task_model.id,
            )
        ],
    )
    create_response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_response.status_code == 201
    created_plan_id = create_response.json()["id"]

    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/id/{created_plan_id}", headers=auth_headers_user_one)
    assert response.status_code == 200
    fetched_plan = DailyPlanResponse(**response.json())
    assert str(fetched_plan.id) == created_plan_id
    assert fetched_plan.user_id == test_user_one.id


async def test_get_daily_plan_by_id_not_found(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    non_existent_id = ObjectId()
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/id/{non_existent_id}", headers=auth_headers_user_one)
    assert response.status_code == 404


async def test_get_daily_plan_by_id_invalid_id_format(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/id/invalid-object-id", headers=auth_headers_user_one)
    assert response.status_code == 422
    assert "Input should be an instance of ObjectId" in response.json()["detail"][0]["msg"]


async def test_get_daily_plan_by_id_not_owner_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    auth_headers_user_two: dict[str, str],
    unique_date: date,
):
    create_payload = DailyPlanCreateRequest(plan_date=unique_date, allocations=[])
    create_response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_response.status_code == 201
    plan_id_user_one = create_response.json()["id"]

    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/id/{plan_id_user_one}", headers=auth_headers_user_two)
    assert response.status_code == 403


async def test_get_daily_plan_by_id_unauthenticated_fails(async_client: AsyncClient):
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/id/{ObjectId()}")
    assert response.status_code == 401


async def test_update_daily_plan_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
    user_one_task_alt: TaskModel,
    unique_date: date,
):
    plan_date = unique_date
    initial_allocations = [
        create_allocation_payload(
            name="Initial Work",
            category_id=user_one_category.id,
            start_time=540,
            end_time=600,
            task_id=user_one_task_model.id,
        )
    ]
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, allocations=initial_allocations)
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    # created_plan_id = create_resp.json()["id"] # Not needed for PATCH by date

    updated_allocations = [
        create_allocation_payload(
            name="Updated Work",
            category_id=user_one_category.id,
            start_time=660,
            end_time=720,
            task_id=user_one_task_alt.id,
        )
    ]
    update_payload = DailyPlanUpdateRequest(allocations=updated_allocations)
    response = await async_client.patch(
        f"{DAILY_PLANS_ENDPOINT}/{plan_date.isoformat()}",  # Use plan_date for PATCH URL
        headers=auth_headers_user_one,
        json=update_payload.model_dump(mode="json"),
    )
    assert response.status_code == 200
    updated_plan = DailyPlanResponse(**response.json())
    assert updated_plan.plan_date == plan_date
    assert len(updated_plan.allocations) == 1
    assert updated_plan.allocations[0].time_window.name == "Updated Work"
    assert updated_plan.allocations[0].time_window.start_time == 660
    assert updated_plan.allocations[0].task.id == user_one_task_alt.id


async def test_update_daily_plan_to_empty_allocations_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    unique_date: date,
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
):
    plan_date = unique_date
    # The commented out line below caused NameError, fixtures are added for completeness
    # create_payload = DailyPlanCreateRequest(plan_date=plan_date, allocations=[
    #      create_allocation_payload("Initial", user_one_category.id, 100, 200, user_one_task_model.id)
    # ])

    # Create a plan first (can be empty or with some allocs)
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT,
        headers=auth_headers_user_one,
        json=DailyPlanCreateRequest(plan_date=plan_date, allocations=[]).model_dump(mode="json"),
    )
    assert create_resp.status_code == 201
    # created_plan_id = create_resp.json()["id"] # Not needed for PATCH by date

    update_payload = DailyPlanUpdateRequest(allocations=[])
    response = await async_client.patch(
        f"{DAILY_PLANS_ENDPOINT}/{plan_date.isoformat()}",  # Use plan_date
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
        f"{DAILY_PLANS_ENDPOINT}/{non_existent_date.isoformat()}",
        headers=auth_headers_user_one,
        json=update_payload.model_dump(mode="json"),
    )
    assert response.status_code == 404


async def test_update_daily_plan_with_extra_fields_fails(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], unique_date: date
):
    plan_date = unique_date
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, allocations=[])
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    # created_plan_id = create_resp.json()["id"] # Not needed

    invalid_update_payload = {"allocations": [], "extra_field": "should_fail"}
    response = await async_client.patch(
        f"{DAILY_PLANS_ENDPOINT}/{plan_date.isoformat()}",
        headers=auth_headers_user_one,
        json=invalid_update_payload,
    )
    assert response.status_code == 422
    assert "Extra inputs are not permitted" in response.json()["detail"][0]["msg"]


async def test_update_daily_plan_unauthenticated_fails(async_client: AsyncClient, unique_date: date):
    update_payload = DailyPlanUpdateRequest(allocations=[])
    some_date_string = unique_date.isoformat()
    response = await async_client.patch(
        f"{DAILY_PLANS_ENDPOINT}/{some_date_string}", json=update_payload.model_dump(mode="json")
    )
    assert response.status_code == 401


async def test_update_daily_plan_unowned_category_for_tw_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
    user_two_category: CategoryModel,
    unique_date: date,
):
    plan_date = unique_date
    create_payload = DailyPlanCreateRequest(
        plan_date=plan_date,
        allocations=[create_allocation_payload("Initial", user_one_category.id, 100, 200, user_one_task_model.id)],
    )
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    # created_plan_id = create_resp.json()["id"] # Not needed

    updated_allocations = [
        create_allocation_payload(
            name="Bad Cat TW",
            category_id=user_two_category.id,
            start_time=600,
            end_time=660,
            task_id=user_one_task_model.id,
        )
    ]
    update_payload = DailyPlanUpdateRequest(allocations=updated_allocations)
    response = await async_client.patch(
        f"{DAILY_PLANS_ENDPOINT}/{plan_date.isoformat()}",
        headers=auth_headers_user_one,
        json=update_payload.model_dump(mode="json"),
    )
    assert response.status_code == 404
    assert "Category for allocation 'Bad Cat TW' not found." in response.json()["detail"]


async def test_update_daily_plan_unowned_task_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
    user_two_task_model: TaskModel,
    unique_date: date,
):
    plan_date = unique_date
    create_payload = DailyPlanCreateRequest(
        plan_date=plan_date,
        allocations=[create_allocation_payload("Initial Task", user_one_category.id, 100, 200, user_one_task_model.id)],
    )
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    # created_plan_id = create_resp.json()["id"] # Not needed

    updated_allocations = [
        create_allocation_payload(
            name="Bad Task TW",
            category_id=user_one_category.id,
            start_time=600,
            end_time=660,
            task_id=user_two_task_model.id,
        )
    ]
    update_payload = DailyPlanUpdateRequest(allocations=updated_allocations)
    response = await async_client.patch(
        f"{DAILY_PLANS_ENDPOINT}/{plan_date.isoformat()}",
        headers=auth_headers_user_one,
        json=update_payload.model_dump(mode="json"),
    )
    assert response.status_code == 404
    assert f"Task with ID '{str(user_two_task_model.id)}' not found" in response.json()["detail"]


async def test_update_daily_plan_not_owner_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    auth_headers_user_two: dict[str, str],
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
    unique_date: date,
):
    plan_date = unique_date
    create_payload = DailyPlanCreateRequest(
        plan_date=plan_date,
        allocations=[create_allocation_payload("UserOne Plan", user_one_category.id, 100, 200, user_one_task_model.id)],
    )
    create_response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_response.status_code == 201
    # plan_id_user_one = create_response.json()["id"] # Not needed for PATCH by date

    update_payload_by_two = DailyPlanUpdateRequest(
        allocations=[
            create_allocation_payload("Attempted Update", user_one_category.id, 300, 400, user_one_task_model.id)
        ]
    )
    response = await async_client.patch(
        f"{DAILY_PLANS_ENDPOINT}/{plan_date.isoformat()}",
        headers=auth_headers_user_two,
        json=update_payload_by_two.model_dump(mode="json"),
    )
    assert response.status_code == 404
    assert f"Daily plan for date '{plan_date.isoformat()}' not found" in response.json()["detail"]
