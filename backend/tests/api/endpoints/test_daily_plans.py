import random
import uuid
from datetime import date, datetime, timedelta, timezone  # Added timezone
from typing import List, Optional

import pytest
from httpx import AsyncClient
from odmantic import ObjectId

from app.api.schemas.daily_plan import TimeWindowCreateRequest  # Flat for request
from app.api.schemas.daily_plan import DailyPlanCreateRequest, DailyPlanResponse, DailyPlanUpdateRequest, SelfReflection
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
) -> TimeWindowCreateRequest:  # Changed return type
    return TimeWindowCreateRequest(  # Changed instantiation
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
    payload = DailyPlanCreateRequest(plan_date=plan_date, time_windows=time_windows, self_reflection=None)
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
    payload = DailyPlanCreateRequest(plan_date=plan_date, time_windows=[], self_reflection=None)
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
    payload = DailyPlanCreateRequest(plan_date=plan_date, time_windows=[], self_reflection=None)
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
    payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=time_windows, self_reflection=None)
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
    payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=time_windows, self_reflection=None)
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
    payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=time_windows, self_reflection=None)
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
    payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=time_windows, self_reflection=None)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 404
    # Similar to non-existent, making the check more general.
    assert "not found" in response.json()["detail"].lower() or "access" in response.json()["detail"].lower()


async def test_create_daily_plan_unauthenticated_fails(async_client: AsyncClient, unique_date: datetime):
    payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=[], self_reflection=None)
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
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, time_windows=time_windows, self_reflection=None)
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
        self_reflection=None,
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
    create_payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=[], self_reflection=None)
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
    create_payload = DailyPlanCreateRequest(
        plan_date=plan_date, time_windows=initial_time_windows, self_reflection=None
    )
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
    update_payload = DailyPlanUpdateRequest(time_windows=updated_time_windows, self_reflection=None)
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


async def test_update_daily_plan_add_reflection(
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

    create_payload = DailyPlanCreateRequest(plan_date=yesterday_datetime, time_windows=[], self_reflection=None)
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    created_plan = DailyPlanResponse(**create_resp.json())

    assert created_plan.self_reflection.positive is None
    assert created_plan.self_reflection.negative is None
    assert created_plan.self_reflection.follow_up_notes is None

    # Update the plan to mark as reviewed and add reflection/notes
    update_payload = DailyPlanUpdateRequest(
        self_reflection=SelfReflection(
            positive="Yesterday was productive.",
            negative=None,
            follow_up_notes="Remember to follow up on task X.",
        ),
        time_windows=[],
    )
    response = await async_client.put(
        f"{DAILY_PLANS_ENDPOINT}/{created_plan.id}",
        headers=auth_headers_user_one,
        json=update_payload.model_dump(mode="json"),
    )
    assert response.status_code == 200
    updated_plan = DailyPlanResponse(**response.json())
    assert updated_plan.plan_date.date() == yesterday_date  # Comparing only date part is fine here
    assert updated_plan.self_reflection.positive == "Yesterday was productive."
    assert updated_plan.self_reflection.negative is None
    assert updated_plan.self_reflection.follow_up_notes == "Remember to follow up on task X."


async def test_get_yesterday_daily_plan_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    test_db,
):
    # Clean up any existing plans for the user
    await test_db.get_collection(DailyPlanModel).delete_many({"user_id": test_user_one.id})

    # Create a daily plan for 3 days ago
    three_days_ago_date = datetime.now(timezone.utc).date() - timedelta(days=3)
    three_days_ago_datetime = datetime.combine(three_days_ago_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    create_payload_old = DailyPlanCreateRequest(
        plan_date=three_days_ago_datetime, time_windows=[], self_reflection=None
    )
    await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload_old.model_dump(mode="json")
    )

    # Create a daily plan for 2 days ago (this is the most recent)
    two_days_ago_date = datetime.now(timezone.utc).date() - timedelta(days=2)
    two_days_ago_datetime = datetime.combine(two_days_ago_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    create_payload_recent = DailyPlanCreateRequest(
        plan_date=two_days_ago_datetime, time_windows=[], self_reflection=None
    )
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload_recent.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    recent_plan_id = create_resp.json()["id"]

    # Request previous day's plan
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/prev-day", headers=auth_headers_user_one)
    assert response.status_code == 200
    fetched_plan = DailyPlanResponse(**response.json())
    assert str(fetched_plan.id) == recent_plan_id
    assert fetched_plan.plan_date.date() == two_days_ago_date
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

    create_payload = DailyPlanCreateRequest(plan_date=today_datetime, time_windows=[], self_reflection=None)
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


async def test_get_prev_day_daily_plan_not_found(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    test_db,
):
    # Ensure no plans exist for this user at all
    await test_db.get_collection(DailyPlanModel).delete_many({"user_id": test_user_one.id})

    # Request previous day's plan
    response = await async_client.get(f"{DAILY_PLANS_ENDPOINT}/prev-day", headers=auth_headers_user_one)
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
    create_payload = DailyPlanCreateRequest(plan_date=plan_date, time_windows=[], self_reflection=None)
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
    update_payload = DailyPlanUpdateRequest(time_windows=[], self_reflection=None)
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
        self_reflection=None,
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
    update_payload = DailyPlanUpdateRequest(time_windows=updated_time_windows, self_reflection=None)
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
        self_reflection=None,
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
    update_payload = DailyPlanUpdateRequest(time_windows=updated_time_windows, self_reflection=None)
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
        self_reflection=None,
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
        ],
        self_reflection=None,
    )
    response = await async_client.put(
        f"{DAILY_PLANS_ENDPOINT}/{created_response_id}",
        headers=auth_headers_user_two,
        json=update_payload_by_two.model_dump(mode="json"),
    )
    assert response.status_code == 404
    assert response.json()["detail"] == f"Daily plan with ID '{created_response_id}' not found"


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
    payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=time_windows, self_reflection=None)
    response = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=payload.model_dump(mode="json")
    )
    assert response.status_code == 400
    assert "Task category does not match Time Window category" in response.json()["detail"]


async def test_update_daily_plan_with_overlapping_time_windows(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,  # Renamed from test_user for consistency with existing tests
    user_one_category: CategoryModel,  # Renamed from created_category
    test_db,  # Added db_session equivalent for creating plan
):
    # a. Define initial valid time windows
    initial_time_windows = [
        {"category_id": str(user_one_category.id), "start_time": 60, "end_time": 120, "description": "Morning Prep"},
        {"category_id": str(user_one_category.id), "start_time": 180, "end_time": 240, "description": "Work Block 1"},
    ]

    # b. Create a daily plan
    plan_date_str = datetime.now(timezone.utc).isoformat()
    create_data = {
        "plan_date": plan_date_str,
        "time_windows": initial_time_windows,
        "user_id": str(test_user_one.id),  # Ensure user_id is part of creation if needed by service logic indirectly
    }
    # Use DailyPlanCreateRequest for payload construction to ensure all fields are correct
    # However, the endpoint expects a raw dict, so model_dump it.
    # The direct dict usage above is fine as long as it matches the expected structure.

    response = await async_client.post(DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_data)
    assert response.status_code == 201, f"Failed to create daily plan: {response.text}"
    created_plan_id = response.json()["id"]

    # c. Define overlapping time windows for the update
    overlapping_time_windows = [
        {"category_id": str(user_one_category.id), "start_time": 30, "end_time": 90, "description": "Overlap 1"},
        {"category_id": str(user_one_category.id), "start_time": 60, "end_time": 120, "description": "Overlap 2"},
    ]
    update_data = {"time_windows": overlapping_time_windows}

    # d. Attempt to update the daily plan
    response = await async_client.put(
        f"{DAILY_PLANS_ENDPOINT}/{created_plan_id}",
        headers=auth_headers_user_one,
        json=update_data,
    )

    # e. Assert that the response status code is 200 (overlapping time windows are now allowed)
    assert response.status_code == 200, f"Actual status code: {response.status_code}, Response: {response.text}"

    # f. Assert that the plan was updated successfully and reviewed flag is reset
    response_data = response.json()
    assert not response_data["reviewed"]  # Should be reset to false after update
    assert len(response_data["time_windows"]) == 2  # Both overlapping windows should be present


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
    payload = DailyPlanCreateRequest(plan_date=plan_date, time_windows=time_windows, self_reflection=None)
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
    create_payload = DailyPlanCreateRequest(
        plan_date=plan_date, time_windows=initial_time_windows, self_reflection=None
    )
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
    update_payload = DailyPlanUpdateRequest(time_windows=updated_time_windows, self_reflection=None)
    response = await async_client.put(
        f"{DAILY_PLANS_ENDPOINT}/{created_response_id}",
        headers=auth_headers_user_one,
        json=update_payload.model_dump(mode="json"),
    )
    assert response.status_code == 400
    assert "Task category does not match Time Window category" in response.json()["detail"]


# Tests for carry-over time window endpoint
async def test_carry_over_time_window_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
    user_one_task_alt: TaskModel,
    test_db,
):
    """Test successful carry-over of a time window with unfinished tasks."""
    # Create source daily plan with time window containing tasks
    source_date = datetime.now(timezone.utc).date() + timedelta(days=1)
    source_datetime = datetime.combine(source_date, datetime.min.time()).replace(tzinfo=timezone.utc)

    # Mark one task as done, one as pending
    user_one_task_model.status = TaskStatus.DONE
    await test_db.save(user_one_task_model)

    time_windows = [
        create_time_window_payload(
            description="Work Session",
            category_id=user_one_category.id,
            start_time=540,  # 9:00 AM
            end_time=720,  # 12:00 PM
            task_ids=[user_one_task_model.id, user_one_task_alt.id],
        )
    ]

    create_payload = DailyPlanCreateRequest(plan_date=source_datetime, time_windows=time_windows, self_reflection=None)
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    source_plan_id = create_resp.json()["id"]

    # Carry over to target date
    target_date = source_date + timedelta(days=2)
    time_window_id = f"{user_one_category.id}_{540}_{720}"  # category_id_start_end format

    carry_over_payload = {
        "source_plan_id": source_plan_id,
        "time_window_id": time_window_id,
        "target_date": target_date.isoformat(),
    }

    response = await async_client.post(
        f"{DAILY_PLANS_ENDPOINT}/carry-over-time-window", headers=auth_headers_user_one, json=carry_over_payload
    )

    assert response.status_code == 200
    updated_source_plan = DailyPlanResponse(**response.json())

    # Source plan should have the time window removed
    assert len(updated_source_plan.time_windows) == 0

    # Check target plan was created with unfinished tasks only
    target_datetime = datetime.combine(target_date, datetime.min.time()).replace(tzinfo=timezone.utc)
    target_resp = await async_client.get(
        f"{DAILY_PLANS_ENDPOINT}/{target_datetime.isoformat()}", headers=auth_headers_user_one
    )
    assert target_resp.status_code == 200
    target_plan = DailyPlanResponse(**target_resp.json())

    # Target plan should have one time window with only the unfinished task
    assert len(target_plan.time_windows) == 1
    assert target_plan.time_windows[0].time_window.description == "Work Session"
    assert target_plan.time_windows[0].time_window.start_time == 540
    assert target_plan.time_windows[0].time_window.end_time == 720
    assert len(target_plan.time_windows[0].tasks) == 1
    assert target_plan.time_windows[0].tasks[0].id == user_one_task_alt.id  # Only unfinished task
    assert not target_plan.reviewed  # Target plan should require review


async def test_carry_over_time_window_source_plan_not_found(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
):
    """Test carry-over fails when source plan doesn't exist."""
    non_existent_plan_id = ObjectId()
    target_date = date.today() + timedelta(days=1)

    carry_over_payload = {
        "source_plan_id": str(non_existent_plan_id),
        "time_window_id": "some_id",
        "target_date": target_date.isoformat(),
    }

    response = await async_client.post(
        f"{DAILY_PLANS_ENDPOINT}/carry-over-time-window", headers=auth_headers_user_one, json=carry_over_payload
    )

    assert response.status_code == 404
    assert "Source daily plan not found" in response.json()["detail"]


async def test_carry_over_time_window_not_found(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_category: CategoryModel,
    unique_date: datetime,
):
    """Test carry-over fails when time window doesn't exist in source plan."""
    # Create source daily plan without time windows
    create_payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=[], self_reflection=None)
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    source_plan_id = create_resp.json()["id"]

    target_date = unique_date.date() + timedelta(days=1)

    carry_over_payload = {
        "source_plan_id": source_plan_id,
        "time_window_id": "non_existent_time_window",
        "target_date": target_date.isoformat(),
    }

    response = await async_client.post(
        f"{DAILY_PLANS_ENDPOINT}/carry-over-time-window", headers=auth_headers_user_one, json=carry_over_payload
    )

    assert response.status_code == 404
    assert "Time window not found" in response.json()["detail"]


async def test_carry_over_time_window_past_date_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
):
    """Test carry-over fails when target date is in the past."""
    source_plan_id = ObjectId()
    past_date = date.today() - timedelta(days=1)

    carry_over_payload = {
        "source_plan_id": str(source_plan_id),
        "time_window_id": "some_id",
        "target_date": past_date.isoformat(),
    }

    response = await async_client.post(
        f"{DAILY_PLANS_ENDPOINT}/carry-over-time-window", headers=auth_headers_user_one, json=carry_over_payload
    )

    assert response.status_code == 422
    assert "Target date cannot be in the past" in response.text


async def test_carry_over_time_window_unauthorized(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    auth_headers_user_two: dict[str, str],
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
    unique_date: datetime,
):
    """Test carry-over fails when user doesn't own the source plan."""
    # Create source daily plan as user one
    time_windows = [
        create_time_window_payload(
            description="Work Session",
            category_id=user_one_category.id,
            start_time=540,
            end_time=720,
            task_ids=[user_one_task_model.id],
        )
    ]

    create_payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=time_windows, self_reflection=None)
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    source_plan_id = create_resp.json()["id"]

    # Try to carry over as user two
    target_date = unique_date.date() + timedelta(days=1)
    time_window_id = f"{user_one_category.id}_{540}_{720}"

    carry_over_payload = {
        "source_plan_id": source_plan_id,
        "time_window_id": time_window_id,
        "target_date": target_date.isoformat(),
    }

    response = await async_client.post(
        f"{DAILY_PLANS_ENDPOINT}/carry-over-time-window", headers=auth_headers_user_two, json=carry_over_payload
    )

    assert response.status_code == 404
    assert "Source daily plan not found" in response.json()["detail"]


async def test_carry_over_time_window_unauthenticated_fails(
    async_client: AsyncClient,
):
    """Test carry-over fails when user is not authenticated."""
    carry_over_payload = {
        "source_plan_id": str(ObjectId()),
        "time_window_id": "some_id",
        "target_date": date.today().isoformat(),
    }

    response = await async_client.post(f"{DAILY_PLANS_ENDPOINT}/carry-over-time-window", json=carry_over_payload)

    assert response.status_code == 401


# Tests for plan approval endpoint
async def test_approve_daily_plan_success_no_conflicts(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
    unique_date: datetime,
):
    """Test successful approval of a daily plan with no conflicts."""
    # Create daily plan with non-overlapping time windows
    time_windows = [
        create_time_window_payload(
            description="Morning Work",
            category_id=user_one_category.id,
            start_time=540,  # 9:00 AM
            end_time=660,  # 11:00 AM
            task_ids=[user_one_task_model.id],
        ),
        create_time_window_payload(
            description="Afternoon Work",
            category_id=user_one_category.id,
            start_time=780,  # 1:00 PM
            end_time=900,  # 3:00 PM
            task_ids=[],
        ),
    ]

    create_payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=time_windows, self_reflection=None)
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    plan_id = create_resp.json()["id"]

    # Verify plan is initially not reviewed
    assert not create_resp.json()["reviewed"]

    # Approve the plan
    response = await async_client.put(f"{DAILY_PLANS_ENDPOINT}/{plan_id}/approve", headers=auth_headers_user_one)

    assert response.status_code == 200
    approval_response = response.json()

    # Check approval response structure
    assert "plan" in approval_response
    assert "merged" in approval_response
    assert "merge_details" in approval_response

    # Plan should now be reviewed
    assert approval_response["plan"]["reviewed"] is True
    assert not approval_response["merged"] is True  # No merging needed
    assert approval_response["merge_details"] is None


async def test_approve_daily_plan_success_with_merging(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
    user_one_task_alt: TaskModel,
    unique_date: datetime,
):
    """Test successful approval with automatic merging of overlapping same-category time windows."""
    # Create daily plan with overlapping same-category time windows
    time_windows = [
        create_time_window_payload(
            description="Morning Work",
            category_id=user_one_category.id,
            start_time=540,  # 9:00 AM
            end_time=660,  # 11:00 AM
            task_ids=[user_one_task_model.id],
        ),
        create_time_window_payload(
            description="Extended Work",
            category_id=user_one_category.id,
            start_time=600,  # 10:00 AM (overlaps with previous)
            end_time=720,  # 12:00 PM
            task_ids=[user_one_task_alt.id],
        ),
    ]

    create_payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=time_windows, self_reflection=None)
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    plan_id = create_resp.json()["id"]

    # Approve the plan
    response = await async_client.put(f"{DAILY_PLANS_ENDPOINT}/{plan_id}/approve", headers=auth_headers_user_one)

    assert response.status_code == 200
    approval_response = response.json()

    # Should have merged the overlapping windows
    assert approval_response["plan"]["reviewed"]
    assert approval_response["merged"] is True
    assert approval_response["merge_details"] is not None
    assert len(approval_response["merge_details"]) > 0

    # Should have only one merged time window
    assert len(approval_response["plan"]["time_windows"]) == 1
    merged_window = approval_response["plan"]["time_windows"][0]
    assert merged_window["time_window"]["start_time"] == 540  # Earliest start
    assert merged_window["time_window"]["end_time"] == 720  # Latest end
    assert len(merged_window["tasks"]) == 2  # Both tasks preserved


async def test_approve_daily_plan_conflicts_fail(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_category: CategoryModel,
    user_one_category_alt: CategoryModel,
    user_one_task_model: TaskModel,
    user_one_task_alt: TaskModel,
    unique_date: datetime,
):
    """Test approval fails when there are conflicts between different categories."""
    # Create daily plan with overlapping different-category time windows
    time_windows = [
        create_time_window_payload(
            description="Work Session",
            category_id=user_one_category.id,
            start_time=540,  # 9:00 AM
            end_time=660,  # 11:00 AM
            task_ids=[user_one_task_model.id],
        ),
        create_time_window_payload(
            description="Meeting",
            category_id=user_one_category_alt.id,  # Different category
            start_time=600,  # 10:00 AM (overlaps)
            end_time=720,  # 12:00 PM
            task_ids=[],  # No tasks to avoid category mismatch
        ),
    ]

    create_payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=time_windows, self_reflection=None)
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    plan_id = create_resp.json()["id"]

    # Attempt to approve the plan
    response = await async_client.put(f"{DAILY_PLANS_ENDPOINT}/{plan_id}/approve", headers=auth_headers_user_one)

    assert response.status_code == 400
    error_response = response.json()
    assert "Cannot approve plan due to scheduling conflicts" in error_response["detail"]["message"]
    assert "conflicts" in error_response["detail"]
    assert len(error_response["detail"]["conflicts"]) > 0


async def test_approve_daily_plan_already_reviewed(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_category: CategoryModel,
    unique_date: datetime,
):
    """Test approval fails when plan is already reviewed."""
    # Create and approve a daily plan
    time_windows = [
        create_time_window_payload(
            description="Work Session",
            category_id=user_one_category.id,
            start_time=540,
            end_time=660,
            task_ids=[],
        )
    ]

    create_payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=time_windows, self_reflection=None)
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    plan_id = create_resp.json()["id"]

    # First approval should succeed
    first_approval = await async_client.put(f"{DAILY_PLANS_ENDPOINT}/{plan_id}/approve", headers=auth_headers_user_one)
    assert first_approval.status_code == 200

    # Second approval should fail
    second_approval = await async_client.put(f"{DAILY_PLANS_ENDPOINT}/{plan_id}/approve", headers=auth_headers_user_one)

    assert second_approval.status_code == 409
    assert "Daily plan is already reviewed and approved" in second_approval.json()["detail"]


async def test_approve_daily_plan_not_found(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
):
    """Test approval fails when plan doesn't exist."""
    non_existent_plan_id = ObjectId()

    response = await async_client.put(
        f"{DAILY_PLANS_ENDPOINT}/{non_existent_plan_id}/approve", headers=auth_headers_user_one
    )

    assert response.status_code == 404
    assert f"Daily plan with ID '{non_existent_plan_id}' not found" in response.json()["detail"]


async def test_approve_daily_plan_unauthorized(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    auth_headers_user_two: dict[str, str],
    user_one_category: CategoryModel,
    unique_date: datetime,
):
    """Test approval fails when user doesn't own the plan."""
    # Create plan as user one
    time_windows = [
        create_time_window_payload(
            description="Work Session",
            category_id=user_one_category.id,
            start_time=540,
            end_time=660,
            task_ids=[],
        )
    ]

    create_payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=time_windows, self_reflection=None)
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    plan_id = create_resp.json()["id"]

    # Try to approve as user two
    response = await async_client.put(f"{DAILY_PLANS_ENDPOINT}/{plan_id}/approve", headers=auth_headers_user_two)

    assert response.status_code == 404
    assert f"Daily plan with ID '{plan_id}' not found" in response.json()["detail"]


async def test_approve_daily_plan_unauthenticated_fails(
    async_client: AsyncClient,
):
    """Test approval fails when user is not authenticated."""
    response = await async_client.put(f"{DAILY_PLANS_ENDPOINT}/{ObjectId()}/approve")

    assert response.status_code == 401


async def test_update_daily_plan_resets_reviewed_flag(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_category: CategoryModel,
    user_one_task_model: TaskModel,
    unique_date: datetime,
):
    """Test that updating a daily plan resets the reviewed flag to false."""
    # Create and approve a daily plan
    time_windows = [
        create_time_window_payload(
            description="Work Session",
            category_id=user_one_category.id,
            start_time=540,
            end_time=660,
            task_ids=[user_one_task_model.id],
        )
    ]

    create_payload = DailyPlanCreateRequest(plan_date=unique_date, time_windows=time_windows, self_reflection=None)
    create_resp = await async_client.post(
        DAILY_PLANS_ENDPOINT, headers=auth_headers_user_one, json=create_payload.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    plan_id = create_resp.json()["id"]

    # Approve the plan
    approval_resp = await async_client.put(f"{DAILY_PLANS_ENDPOINT}/{plan_id}/approve", headers=auth_headers_user_one)
    assert approval_resp.status_code == 200
    assert approval_resp.json()["plan"]["reviewed"] is True

    # Update the plan
    updated_time_windows = [
        create_time_window_payload(
            description="Updated Work Session",
            category_id=user_one_category.id,
            start_time=600,  # Different time
            end_time=720,
            task_ids=[user_one_task_model.id],
        )
    ]

    update_payload = DailyPlanUpdateRequest(time_windows=updated_time_windows, self_reflection=None)
    update_resp = await async_client.put(
        f"{DAILY_PLANS_ENDPOINT}/{plan_id}", headers=auth_headers_user_one, json=update_payload.model_dump(mode="json")
    )

    assert update_resp.status_code == 200
    updated_plan = DailyPlanResponse(**update_resp.json())

    # Reviewed flag should be reset to false
    assert not updated_plan.reviewed
    assert updated_plan.time_windows[0].time_window.description == "Updated Work Session"
    assert updated_plan.time_windows[0].time_window.start_time == 600
