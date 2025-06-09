import random
import uuid
from datetime import date, datetime, timedelta, timezone  # Added timezone
from typing import List, Optional

import pytest
from httpx import AsyncClient
from odmantic import ObjectId

from app.api.schemas.daily_plan import (
    DailyPlanCreateRequest,
    DailyPlanResponse,
    DailyPlanUpdateRequest,
    TimeWindowCreate,
)
from app.api.schemas.task import TaskPriority, TaskStatus
from app.core.config import settings
from app.db.models.category import Category as CategoryModel
from app.db.models.daily_plan import DailyPlan as DailyPlanModel  # Added import

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
async def user_one_category_alt(test_db, test_user_one: UserModel) -> CategoryModel:
    category_data = {
        "name": f"UserOne_Category_Alt_{uuid.uuid4()}",
        "user": test_user_one.id,
        "color": "#FF00AA",  # Different color
        "icon": "settings_alt",  # Different icon
        "is_default": False,
    }
    instance = CategoryModel(**category_data)
    await test_db.save(instance)
    return instance


@pytest.fixture
async def user_one_task_no_category_model(test_db, test_user_one: UserModel) -> TaskModel:
    task_data = {
        "title": f"UserOne_Task_NoCat_{uuid.uuid4()}",
        "user_id": test_user_one.id,
        "category_id": None,  # Explicitly None
        "priority": TaskPriority.MEDIUM,
        "status": TaskStatus.PENDING,
        "description": "A task without a category",
    }
    instance = TaskModel(**task_data)
    await test_db.save(instance)
    return instance


@pytest.fixture
async def unique_date() -> datetime:
    # Return a datetime object, for example, at the beginning of a unique future day
    unique_future_date = date.today() + timedelta(days=random.randint(100, 10000))
    return datetime.combine(unique_future_date, datetime.min.time()).replace(
        tzinfo=timezone.utc
    )  # Ensure it's UTC aware


def create_time_window_payload(
    description: Optional[str], category_id: ObjectId, start_time: int, end_time: int, task_ids: List[ObjectId]
) -> TimeWindowCreate:
    return TimeWindowCreate(
        description=description,
        category_id=category_id,
        start_time=start_time,
        end_time=end_time,
        task_ids=task_ids,
    )


async def test_create_daily_plan_success_with_allocations(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
    unique_date: datetime,
):
    plan_date = unique_date
    time_windows = [
        create_time_window_payload(
            description="Morning Focus",
            category_id=user_one_category.id,
            start_time=540,
            end_time=720,
            task_ids=[user_one_task_model.id],
        )
    ]
    payload = DailyPlanCreateRequest(plan_date=plan_date, time_windows=time_windows)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 201
    created_plan = DailyPlanResponse(**response.json())
    assert created_plan.plan_date == plan_date.replace(tzinfo=timezone.utc)  # Make expected date UTC aware
    assert created_plan.user_id == test_user_one.id
    assert len(created_plan.time_windows) == 1
    time_window_resp = created_plan.time_windows[0]
    assert time_window_resp.time_window.description == "Morning Focus"
    assert time_window_resp.time_window.start_time == 540
    assert time_window_resp.time_window.end_time == 720
    assert time_window_resp.time_window.category.id == user_one_category.id
    assert len(time_window_resp.tasks) == 1
    assert time_window_resp.tasks[0].id == user_one_task_model.id
    assert time_window_resp.tasks[0].category.id == user_one_task_model.category_id


async def test_create_daily_plan_success_empty_allocations(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_user_one: UserModel, unique_date: datetime
):
    plan_date = unique_date
    payload = DailyPlanCreateRequest(plan_date=plan_date, time_windows=[])
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 201
    created_plan = DailyPlanResponse(**response.json())
    assert created_plan.plan_date == plan_date.replace(tzinfo=timezone.utc)  # Make expected date UTC aware
    assert created_plan.user_id == test_user_one.id
    assert len(created_plan.time_windows) == 0


async def test_create_daily_plan_duplicate_date_fails(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], unique_date: datetime
):
    plan_date = unique_date
    payload = DailyPlanCreateRequest(plan_date=plan_date, time_windows=[])
    await async_client.post(DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json"))
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 400  # Service explicitly checks and raises 400
    assert response.json()["detail"] == "A daily plan for this date already exists."


async def test_create_daily_plan_invalid_embedded_time_window_data_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
    unique_date: datetime,
):
    # Send raw dict to bypass client-side Pydantic validation and test server-side
    raw_time_windows_payload = [
        {
            "description": "Invalid TW",
            "category_id": str(user_one_category.id),  # Convert ObjectId to str for JSON
            "start_time": 720,  # 12:00
            "end_time": 540,  # 09:00 (invalid)
            "task_ids": [str(user_one_task_model.id)],  # Convert ObjectId to str for JSON
        }
    ]
    raw_payload = {"plan_date": unique_date.isoformat(), "time_windows": raw_time_windows_payload}

    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=raw_payload  # Send raw dict
    )
    assert response.status_code == 422
    assert "end_time must be greater than start_time" in response.text


async def test_create_daily_plan_non_existent_category_for_tw_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_task_model: TaskModel,
    unique_date: datetime,
):
    non_existent_category_id = ObjectId()
    time_windows = [
        create_time_window_payload(
            description="Test TW",
            category_id=non_existent_category_id,
            start_time=600,
            end_time=660,
            task_ids=[user_one_task_model.id],
        )
    ]
    payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=time_windows)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 404
    assert f"Category with ID '{non_existent_category_id}' not found" in response.json()["detail"]


async def test_create_daily_plan_unowned_category_for_tw_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_two_category: CategoryModel,
    user_one_task_model: TaskModel,
    unique_date: datetime,
):
    time_windows = [
        create_time_window_payload(
            description="Unowned Cat TW",
            category_id=user_two_category.id,
            start_time=600,
            end_time=660,
            task_ids=[user_one_task_model.id],
        )
    ]
    payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=time_windows)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 403  # NotOwnerException from CategoryService results in 403
    assert response.json()["detail"] == "Not authorized to access this category"


async def test_create_daily_plan_non_existent_task_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_category: CategoryModel,
    unique_date: datetime,
):
    non_existent_task_id = ObjectId()
    time_windows = [
        create_time_window_payload(
            description="Valid TW",
            category_id=user_one_category.id,
            start_time=600,
            end_time=660,
            task_ids=[non_existent_task_id],
        )
    ]
    payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=time_windows)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 404
    # The error message might be more general if multiple task_ids can be invalid
    # For now, assume it reports the first problematic one or a general message.
    assert "not found" in response.json()["detail"].lower()  # Make it more robust to message changes


async def test_create_daily_plan_unowned_task_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_category: CategoryModel,
    user_two_task_model: TaskModel,
    unique_date: datetime,
):
    time_windows = [
        create_time_window_payload(
            description="Valid TW",
            category_id=user_one_category.id,
            start_time=600,
            end_time=660,
            task_ids=[user_two_task_model.id],
        )
    ]
    payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=time_windows)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 404
    # Similar to non-existent, making the check more general.
    assert "not found" in response.json()["detail"].lower() or "access" in response.json()["detail"].lower()


async def test_create_daily_plan_unauthenticated_fails(async_client: AsyncClient, unique_date: datetime):
    payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=[])
    response = await async_client.post(DAILY_PLANS_ENDPOINT, json=payload.model_dump(mode="json"))
    assert response.status_code == 401


async def test_get_daily_plan_by_date_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
    unique_date: datetime,
):
    plan_date = unique_date
    time_windows = [
        create_time_window_payload(
            description="Morning Work",
            category_id=user_one_category.id,
            start_time=540,
            end_time=720,
            task_ids=[user_one_task_model.id],
        )
    ]
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, time_windows=time_windows)
    create_response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_response.status_code == 201

    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/{plan_date.isoformat()}", headers=auth_headers_user_one)
    assert response.status_code == 200
    fetched_plan = DailyPlanResponse(**response.json())
    assert fetched_plan.plan_date == plan_date
    assert fetched_plan.user_id == test_user_one.id
    assert len(fetched_plan.time_windows) == 1
    assert fetched_plan.time_windows[0].time_window.description == "Morning Work"
    assert fetched_plan.time_windows[0].time_window.category.id == user_one_category.id
    assert len(fetched_plan.time_windows[0].tasks) == 1
    assert fetched_plan.time_windows[0].tasks[0].id == user_one_task_model.id


async def test_get_daily_plan_by_date_not_found(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], unique_date: datetime
):
    non_existent_date = unique_date + timedelta(days=100)
    response = await async_client.get(
        f"{DAILY_PLANS_ENDPOINT}/{non_existent_date.isoformat()}", headers=auth_headers_user_one
    )
    assert response.status_code == 200
    assert response.json() is None


async def test_get_daily_plan_by_date_invalid_date_format(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str]
):
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/invalid-date", headers=auth_headers_user_one)
    assert response.status_code == 422


async def test_get_daily_plan_by_date_unauthenticated_fails(async_client: AsyncClient, unique_date: datetime):
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/{unique_date.isoformat()}")
    assert response.status_code == 401


async def test_get_daily_plan_by_id_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
    unique_date: datetime,
):

    some_date = datetime.combine(date.today(), datetime.min.time()).replace(
        tzinfo=timezone.utc
    )  # Ensure it's UTC aware
    create_payload = DailyPlanCreateRequest(
        plan_date=some_date,  # Use a fixed date for consistency
        time_windows=[
            create_time_window_payload(
                description="Focus Time",
                category_id=user_one_category.id,
                start_time=600,
                end_time=700,
                task_ids=[user_one_task_model.id],
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
    unique_date: datetime,
):
    create_payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=[])
    create_response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_response.status_code == 201
    plan_id_user_one = create_response.json()["id"]

    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/id/{plan_id_user_one}", headers=auth_headers_user_two)
    assert response.status_code == 404  # Service returns 404 if not found for the user


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
    unique_date: datetime,
):
    plan_date = unique_date
    initial_time_windows = [
        create_time_window_payload(
            description="Initial Work",
            category_id=user_one_category.id,
            start_time=540,
            end_time=600,
            task_ids=[user_one_task_model.id],
        )
    ]
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, time_windows=initial_time_windows)
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    created_plan_id = create_resp.json()["id"]

    updated_time_windows = [
        create_time_window_payload(
            description="Updated Work",
            category_id=user_one_category.id,
            start_time=660,
            end_time=720,
            task_ids=[user_one_task_alt.id],
        )
    ]
    update_payload = DailyPlanUpdateRequest(time_windows=updated_time_windows)
    response = await async_client.put(
        f"{DAILY_PLANS_ENDPOINT}/{created_plan_id}",
        headers=auth_headers_user_one,
        json=update_payload.model_dump(mode="json"),
    )
    assert response.status_code == 200
    updated_plan = DailyPlanResponse(**response.json())
    assert updated_plan.plan_date == plan_date.replace(tzinfo=timezone.utc)  # Make expected date UTC aware
    assert len(updated_plan.time_windows) == 1
    assert updated_plan.time_windows[0].time_window.description == "Updated Work"
    assert updated_plan.time_windows[0].time_window.start_time == 660
    assert len(updated_plan.time_windows[0].tasks) == 1
    assert updated_plan.time_windows[0].tasks[0].id == user_one_task_alt.id


async def test_update_daily_plan_mark_reviewed_and_add_reflection(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    test_db,
):
    # Create a daily plan for yesterday
    yesterday_date = datetime.now().date() - timedelta(days=1)
    yesterday_datetime = datetime.combine(yesterday_date, datetime.min.time()).replace(
        tzinfo=timezone.utc
    )  # Ensure it's UTC aware

    create_payload = DailyPlanCreateRequest(plan_date=yesterday_datetime, time_windows=[])
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    created_plan = DailyPlanResponse(**create_resp.json())
    assert created_plan.reviewed is False
    assert created_plan.reflection_content is None
    assert created_plan.notes_content is None

    # Update the plan to mark as reviewed and add reflection/notes
    update_payload = DailyPlanUpdateRequest(
        reviewed=True,
        reflection_content="Yesterday was productive.",
        notes_content="Remember to follow up on task X.",
    )
    response = await async_client.put(
        f"{DAILY_PLANS_ENDPOINT}/{created_plan.id}",
        headers=auth_headers_user_one,
        json=update_payload.model_dump(mode="json"),
    )
    assert response.status_code == 200
    updated_plan = DailyPlanResponse(**response.json())
    assert updated_plan.plan_date.date() == yesterday_date  # Comparing only date part is fine here
    assert updated_plan.reviewed is True
    assert updated_plan.reflection_content == "Yesterday was productive."
    assert updated_plan.notes_content == "Remember to follow up on task X."


async def test_get_yesterday_daily_plan_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    test_db,
):
    # Ensure no plan exists for yesterday for this user (UTC midnight)
    yesterday_date_for_del = datetime.now(timezone.utc).date() - timedelta(days=1)
    utc_midnight_yesterday_for_del = datetime(
        yesterday_date_for_del.year,
        yesterday_date_for_del.month,
        yesterday_date_for_del.day,
        0,
        0,
        0,
        tzinfo=timezone.utc,
    )
    await test_db.get_collection(DailyPlanModel).delete_many(
        {"user_id": test_user_one.id, "plan_date": utc_midnight_yesterday_for_del}
    )

    # Create a daily plan for yesterday
    yesterday_date = datetime.now(timezone.utc).date() - timedelta(days=1)
    yesterday_datetime = datetime.combine(yesterday_date, datetime.min.time()).replace(
        tzinfo=timezone.utc
    )  # Ensure it's UTC aware

    create_payload = DailyPlanCreateRequest(plan_date=yesterday_datetime, time_windows=[])
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201

    # Request yesterday's plan
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/yesterday", headers=auth_headers_user_one)
    assert response.status_code == 200
    fetched_plan = DailyPlanResponse(**response.json())
    assert fetched_plan.plan_date.date() == yesterday_date  # Comparing only date part is fine here
    assert fetched_plan.user_id == test_user_one.id


async def test_get_today_daily_plan_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    test_db,
):
    # Ensure no plan exists for today for this user (UTC midnight)
    today_date_for_del = datetime.now(timezone.utc).date()
    utc_midnight_today_for_del = datetime(
        today_date_for_del.year,
        today_date_for_del.month,
        today_date_for_del.day,
        0,
        0,
        0,
        tzinfo=timezone.utc,
    )
    await test_db.get_collection(DailyPlanModel).delete_many(
        {"user_id": test_user_one.id, "plan_date": utc_midnight_today_for_del}
    )

    # Create a daily plan for today
    today_date = datetime.now(timezone.utc).date()
    today_datetime = datetime.combine(today_date, datetime.min.time()).replace(
        tzinfo=timezone.utc
    )  # Ensure it's UTC aware

    create_payload = DailyPlanCreateRequest(plan_date=today_datetime, time_windows=[])
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201

    # Request today's plan
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/today", headers=auth_headers_user_one)
    assert response.status_code == 200
    fetched_plan = DailyPlanResponse(**response.json())
    assert fetched_plan.plan_date.date() == today_date
    assert fetched_plan.user_id == test_user_one.id


async def test_get_yesterday_daily_plan_not_found(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    test_db,
):
    # Ensure no plan exists for yesterday for this user (UTC midnight)
    yesterday_date_for_del = datetime.now(timezone.utc).date() - timedelta(days=1)
    utc_midnight_yesterday_for_del = datetime(
        yesterday_date_for_del.year,
        yesterday_date_for_del.month,
        yesterday_date_for_del.day,
        0,
        0,
        0,
        tzinfo=timezone.utc,
    )
    await test_db.get_collection(DailyPlanModel).delete_many(
        {"user_id": test_user_one.id, "plan_date": utc_midnight_yesterday_for_del}
    )

    # Request yesterday's plan
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/yesterday", headers=auth_headers_user_one)
    assert response.status_code == 200
    assert response.json() is None


async def test_get_today_daily_plan_not_found(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    test_db,
):
    # Ensure no plan exists for today for this user (UTC midnight)
    today_date_for_del = datetime.now(timezone.utc).date()
    utc_midnight_today_for_del = datetime(
        today_date_for_del.year,
        today_date_for_del.month,
        today_date_for_del.day,
        0,
        0,
        0,
        tzinfo=timezone.utc,
    )
    await test_db.get_collection(DailyPlanModel).delete_many(
        {"user_id": test_user_one.id, "plan_date": utc_midnight_today_for_del}
    )

    # Request today's plan
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/today", headers=auth_headers_user_one)
    assert response.status_code == 200
    assert response.json() is None


async def test_update_daily_plan_with_extra_fields_fails(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], unique_date: date
):
    plan_date = unique_date
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, time_windows=[])
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    created_plan_id = create_resp.json()["id"]

    invalid_update_payload = {"time_windows": [], "extra_field": "should_fail"}
    response = await async_client.put(
        f"{DAILY_PLANS_ENDPOINT}/{created_plan_id}",
        headers=auth_headers_user_one,
        json=invalid_update_payload,
    )
    assert response.status_code == 422
    assert "Extra inputs are not permitted" in response.json()["detail"][0]["msg"]


async def test_update_daily_plan_unauthenticated_fails(async_client: AsyncClient, unique_date: date):
    update_payload = DailyPlanUpdateRequest(time_windows=[])
    some_date_id = ObjectId()  # Use a random ObjectId for testing
    response = await async_client.put(
        f"{DAILY_PLANS_ENDPOINT}/{some_date_id}", json=update_payload.model_dump(mode="json")
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
        time_windows=[
            create_time_window_payload("Initial", user_one_category.id, 100, 200, task_ids=[user_one_task_model.id])
        ],
    )
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    created_plan_id = create_resp.json()["id"]

    updated_time_windows = [
        create_time_window_payload(
            description="Bad Cat TW",
            category_id=user_two_category.id,
            start_time=600,
            end_time=660,
            task_ids=[user_one_task_model.id],
        )
    ]
    update_payload = DailyPlanUpdateRequest(time_windows=updated_time_windows)
    response = await async_client.put(
        f"{DAILY_PLANS_ENDPOINT}/{created_plan_id}",
        headers=auth_headers_user_one,
        json=update_payload.model_dump(mode="json"),
    )
    assert response.status_code == 403  # NotOwnerException from CategoryService results in 403
    assert response.json()["detail"] == "Not authorized to access this category"


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
        time_windows=[
            create_time_window_payload(
                "Initial Task", user_one_category.id, 100, 200, task_ids=[user_one_task_model.id]
            )
        ],
    )
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    created_plan_id = create_resp.json()["id"]

    updated_time_windows = [
        create_time_window_payload(
            description="Bad Task TW",
            category_id=user_one_category.id,
            start_time=600,
            end_time=660,
            task_ids=[user_two_task_model.id],
        )
    ]
    update_payload = DailyPlanUpdateRequest(time_windows=updated_time_windows)
    response = await async_client.put(
        f"{DAILY_PLANS_ENDPOINT}/{created_plan_id}",
        headers=auth_headers_user_one,
        json=update_payload.model_dump(mode="json"),
    )
    assert response.status_code == 404
    assert (
        response.json()["detail"] == f"Task with ID {str(user_two_task_model.id)} not found for user."
    )  # Adjusted detail


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
        time_windows=[
            create_time_window_payload(
                "UserOne Plan", user_one_category.id, 100, 200, task_ids=[user_one_task_model.id]
            )
        ],
    )
    create_response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_response.status_code == 201
    created_response_id = create_response.json()["id"]

    update_payload_by_two = DailyPlanUpdateRequest(
        time_windows=[
            create_time_window_payload(
                "Attempted Update", user_one_category.id, 300, 400, task_ids=[user_one_task_model.id]
            )
        ]
    )
    response = await async_client.put(
        f"{DAILY_PLANS_ENDPOINT}/{created_response_id}",
        headers=auth_headers_user_two,
        json=update_payload_by_two.model_dump(mode="json"),
    )
    assert response.status_code == 404
    assert response.json()["detail"] == "Daily plan not found"


async def test_create_daily_plan_fail_task_category_mismatch(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_category: CategoryModel,  # This will be the category for the allocation
    user_one_category_alt: CategoryModel,  # This will be the category for the task
    unique_date: date,
    test_db,
    test_user_one: UserModel,
):
    # Create a task that belongs to user_one_category_alt
    task_with_alt_category_data = {
        "title": f"Task_With_Alt_Cat_{uuid.uuid4()}",
        "user_id": test_user_one.id,
        "category_id": user_one_category_alt.id,  # Task's category
        "priority": TaskPriority.HIGH,
        "status": TaskStatus.IN_PROGRESS,
    }
    task_instance = TaskModel(**task_with_alt_category_data)
    await test_db.save(task_instance)

    time_windows = [
        create_time_window_payload(
            description="Mismatch Category Allocation",
            category_id=user_one_category.id,  # Allocation's category
            start_time=540,
            end_time=600,
            task_ids=[task_instance.id],  # Task with alt_category
        )
    ]
    payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=time_windows)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 400
    assert "Task category does not match Time Window category" in response.json()["detail"]


async def test_create_daily_plan_success_task_no_category(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_category: CategoryModel,  # Allocation will use this category
    user_one_task_no_category_model: TaskModel,  # Task has no category
    unique_date: date,
    test_user_one: UserModel,
):
    plan_date = unique_date
    time_windows = [
        create_time_window_payload(
            description="Task With No Category Allocation",
            category_id=user_one_category.id,  # Allocation has a category
            start_time=540,
            end_time=720,
            task_ids=[user_one_task_no_category_model.id],  # Task has no category
        )
    ]
    payload = DailyPlanCreateRequest(plan_date=plan_date, time_windows=time_windows)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 201
    created_plan = DailyPlanResponse(**response.json())
    assert created_plan.plan_date == plan_date.replace(tzinfo=timezone.utc)  # Make expected date UTC aware
    assert created_plan.user_id == test_user_one.id
    assert len(created_plan.time_windows) == 1
    time_window_resp = created_plan.time_windows[0]
    assert time_window_resp.time_window.category.id == user_one_category.id
    assert len(time_window_resp.tasks) == 1
    assert time_window_resp.tasks[0].id == user_one_task_no_category_model.id
    assert time_window_resp.tasks[0].category is None  # Verify task still has no category


async def test_update_daily_plan_fail_task_category_mismatch(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_category: CategoryModel,
    user_one_category_alt: CategoryModel,  # Task will have this category
    user_one_task_model: TaskModel,  # Initially in user_one_category
    unique_date: date,
    test_db,
    test_user_one: UserModel,
):
    plan_date = unique_date
    # Create a task that will be used for mismatch, belonging to user_one_category_alt
    mismatch_task_data = {
        "title": f"Mismatch_Update_Task_{uuid.uuid4()}",
        "user_id": test_user_one.id,
        "category_id": user_one_category_alt.id,  # Different category from allocation
        "priority": TaskPriority.LOW,
        "status": TaskStatus.PENDING,
    }
    mismatch_task_instance = TaskModel(**mismatch_task_data)
    await test_db.save(mismatch_task_instance)

    # Initial plan with a task that matches its allocation category
    initial_time_windows = [
        create_time_window_payload(
            description="Initial Allocation",
            category_id=user_one_category.id,  # Allocation category
            start_time=540,
            end_time=600,
            task_ids=[user_one_task_model.id],  # Task with matching category
        )
    ]
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, time_windows=initial_time_windows)
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    created_response_id = create_resp.json()["id"]

    # Attempt to update: allocation keeps user_one_category, but task is mismatch_task_instance (user_one_category_alt)
    updated_time_windows = [
        create_time_window_payload(
            description="Updated Mismatch Allocation",
            category_id=user_one_category.id,  # Allocation category remains user_one_category
            start_time=660,
            end_time=720,
            task_ids=[mismatch_task_instance.id],  # Task has user_one_category_alt
        )
    ]
    update_payload = DailyPlanUpdateRequest(time_windows=updated_time_windows)
    response = await async_client.put(
        f"{DAILY_PLANS_ENDPOINT}/{created_response_id}",
        headers=auth_headers_user_one,
        json=update_payload.model_dump(mode="json"),
    )
    assert response.status_code == 400
    assert "Task category does not match Time Window category" in response.json()["detail"]
