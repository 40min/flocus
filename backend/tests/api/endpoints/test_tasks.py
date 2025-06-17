import datetime
from unittest.mock import patch  # For mocking datetime & async methods

import pytest
from httpx import AsyncClient
from odmantic import ObjectId

from app.api.schemas.task import (
    TaskCreateRequest,
    TaskPriority,
    TaskResponse,
    TaskStatisticsSchema,
    TaskStatus,
    TaskUpdateRequest,
)
from app.core.config import settings
from app.db.models.category import Category as CategoryModel
from app.db.models.task import Task as TaskModel
from app.db.models.user import User as UserModel

API_V1_STR = settings.API_V1_STR
TASKS_ENDPOINT = f"{API_V1_STR}/tasks"
CATEGORIES_ENDPOINT = f"{API_V1_STR}/categories/"

pytestmark = pytest.mark.asyncio


async def test_create_task_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_category: CategoryModel,
):
    due_date = datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=5)
    task_data = TaskCreateRequest(
        title="New Unique Task",
        description="A detailed description",
        status=TaskStatus.IN_PROGRESS,
        priority=TaskPriority.HIGH,
        due_date=due_date,
        category_id=user_one_category.id,
    )
    response = await async_client.post(
        TASKS_ENDPOINT, headers=auth_headers_user_one, json=task_data.model_dump(mode="json")
    )
    assert response.status_code == 201
    created_task = TaskResponse(**response.json())
    assert created_task.title == task_data.title
    assert created_task.description == task_data.description
    assert created_task.status == task_data.status
    assert created_task.priority == task_data.priority
    assert created_task.due_date.strftime("%Y-%m-%dT%H:%M:%S") == due_date.strftime("%Y-%m-%dT%H:%M:%S")
    assert created_task.category.id == user_one_category.id
    assert created_task.user_id == test_user_one.id
    assert not created_task.is_deleted
    assert created_task.statistics is not None
    assert isinstance(created_task.statistics, TaskStatisticsSchema)
    assert created_task.statistics.was_started_at is not None  # Because status is IN_PROGRESS
    assert created_task.statistics.was_taken_at is not None  # Because status is IN_PROGRESS
    assert created_task.statistics.was_stopped_at is None
    assert created_task.statistics.lasts_min == 0
    # Check if was_started_at and was_taken_at are close to created_at
    assert abs((created_task.statistics.was_started_at - created_task.created_at).total_seconds()) < 2
    assert abs((created_task.statistics.was_taken_at - created_task.created_at).total_seconds()) < 2


async def test_create_task_pending_initial_statistics(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
):
    task_data = TaskCreateRequest(
        title="New Pending Task Stats",
        status=TaskStatus.PENDING,  # Explicitly PENDING
    )
    response = await async_client.post(
        TASKS_ENDPOINT, headers=auth_headers_user_one, json=task_data.model_dump(mode="json")
    )
    assert response.status_code == 201
    created_task = TaskResponse(**response.json())
    assert created_task.statistics is not None
    assert isinstance(created_task.statistics, TaskStatisticsSchema)
    assert created_task.statistics.was_started_at is None
    assert created_task.statistics.was_taken_at is None
    assert created_task.statistics.was_stopped_at is None
    assert created_task.statistics.lasts_min == 0


async def test_create_task_title_conflict(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: TaskModel
):
    task_data = TaskCreateRequest(title=user_one_task_model.title)  # Same title as existing task
    response = await async_client.post(
        TASKS_ENDPOINT, headers=auth_headers_user_one, json=task_data.model_dump(mode="json")
    )
    assert response.status_code == 400
    assert "already exists for this user" in response.json()["detail"]


async def test_create_task_with_soft_deleted_category_fails(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    test_db,
):
    # Create and soft-delete a category
    category_to_delete = CategoryModel(name="SoftDel Category For Task", user=test_user_one.id)
    await test_db.save(category_to_delete)
    category_to_delete.is_deleted = True
    await test_db.save(category_to_delete)

    task_data = TaskCreateRequest(title="Task With SoftDel Cat", category_id=category_to_delete.id)
    response = await async_client.post(
        TASKS_ENDPOINT, headers=auth_headers_user_one, json=task_data.model_dump(mode="json")
    )
    assert response.status_code == 404  # CategoryNotFoundException from service
    assert "Active category not found" in response.json()["detail"]


async def test_get_all_tasks_success_and_filters_soft_deleted(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_task_model: TaskModel,  # An active task
    test_db,
):
    # Create another task and soft-delete it
    task_to_delete_data = TaskCreateRequest(title="Task To Be Soft Deleted")
    create_resp = await async_client.post(
        TASKS_ENDPOINT, headers=auth_headers_user_one, json=task_to_delete_data.model_dump(mode="json")
    )
    assert create_resp.status_code == 201
    task_to_delete_id = create_resp.json()["id"]

    delete_resp = await async_client.delete(f"{TASKS_ENDPOINT}/{task_to_delete_id}", headers=auth_headers_user_one)
    assert delete_resp.status_code == 204

    response = await async_client.get(TASKS_ENDPOINT, headers=auth_headers_user_one)
    assert response.status_code == 200
    tasks = [TaskResponse(**item) for item in response.json()]

    assert any(task.id == user_one_task_model.id for task in tasks)  # Active task should be present
    assert not any(task.id == ObjectId(task_to_delete_id) for task in tasks)  # Soft-deleted task should NOT be present
    for task in tasks:
        assert not task.is_deleted


async def test_get_all_tasks_empty(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_db, test_user_one: UserModel
):
    await test_db.get_collection(TaskModel).delete_many({"user_id": test_user_one.id})
    response = await async_client.get(TASKS_ENDPOINT, headers=auth_headers_user_one)
    assert response.status_code == 200
    assert response.json() == []


async def test_get_task_by_id_success(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: TaskModel
):
    response = await async_client.get(f"{TASKS_ENDPOINT}/{user_one_task_model.id}", headers=auth_headers_user_one)
    assert response.status_code == 200
    fetched_task = TaskResponse(**response.json())
    assert fetched_task.id == user_one_task_model.id
    assert fetched_task.title == user_one_task_model.title
    assert not fetched_task.is_deleted
    assert fetched_task.statistics is not None  # Assuming user_one_task_model has default stats
    assert isinstance(fetched_task.statistics, TaskStatisticsSchema)
    # Further assertions depend on how user_one_task_model fixture initializes statistics
    # For a newly created default task (PENDING), stats would be:
    # assert fetched_task.statistics.was_started_at is None
    # assert fetched_task.statistics.was_taken_at is None
    # assert fetched_task.statistics.was_stopped_at is None
    # assert fetched_task.statistics.lasts_min == 0
    # If user_one_task_model was created with IN_PROGRESS or updated, these would change.
    # For now, just check presence and type. More specific checks will be in update tests.


async def test_get_soft_deleted_task_by_id_success(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: TaskModel, test_db
):
    # Soft delete the task
    user_one_task_model.is_deleted = True
    await test_db.save(user_one_task_model)

    response = await async_client.get(f"{TASKS_ENDPOINT}/{user_one_task_model.id}", headers=auth_headers_user_one)
    assert response.status_code == 404  # Soft-deleted tasks are not found by default
    assert "Task has been deleted" in response.json()["detail"]


async def test_get_task_by_id_not_found(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    non_existent_id = ObjectId()
    response = await async_client.get(f"{TASKS_ENDPOINT}/{non_existent_id}", headers=auth_headers_user_one)
    assert response.status_code == 404


async def test_get_task_by_id_not_owner(
    async_client: AsyncClient, auth_headers_user_two: dict[str, str], user_one_task_model: TaskModel
):
    response = await async_client.get(f"{TASKS_ENDPOINT}/{user_one_task_model.id}", headers=auth_headers_user_two)
    assert response.status_code == 403  # NotOwnerException


async def test_update_task_success(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_task_model: TaskModel,
    test_user_one: UserModel,  # For creating new category
    test_db,
):
    new_category_for_update = CategoryModel(name="New Category for Task Update", user=test_user_one.id)
    await test_db.save(new_category_for_update)

    new_due_date = datetime.datetime.now(datetime.UTC) + datetime.timedelta(days=10)
    update_data = TaskUpdateRequest(
        title="Updated Task Title",
        description="Updated description",
        status=TaskStatus.DONE,
        priority=TaskPriority.URGENT,
        due_date=new_due_date,
        category_id=new_category_for_update.id,
    )
    response = await async_client.patch(
        f"{TASKS_ENDPOINT}/{user_one_task_model.id}",
        headers=auth_headers_user_one,
        json=update_data.model_dump(mode="json", exclude_none=True),
    )
    assert response.status_code == 200
    updated_task = TaskResponse(**response.json())
    assert updated_task.title == update_data.title
    assert updated_task.description == update_data.description
    assert updated_task.status == update_data.status
    assert updated_task.priority == update_data.priority
    assert updated_task.due_date.strftime("%Y-%m-%dT%H:%M:%S") == new_due_date.strftime("%Y-%m-%dT%H:%M:%S")
    assert updated_task.category.id == new_category_for_update.id
    assert not updated_task.is_deleted
    # Ensure comparison is between aware datetimes if they become naive
    created_at_aware = (
        updated_task.created_at.replace(tzinfo=datetime.timezone.utc)
        if updated_task.created_at.tzinfo is None
        else updated_task.created_at
    )
    updated_at_aware = (
        updated_task.updated_at.replace(tzinfo=datetime.timezone.utc)
        if updated_task.updated_at.tzinfo is None
        else updated_task.updated_at
    )
    assert updated_at_aware > created_at_aware
    # Statistics assertions will be more detailed in the dedicated statistics flow test
    assert updated_task.statistics is not None
    assert isinstance(updated_task.statistics, TaskStatisticsSchema)


async def test_update_task_title_conflict(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_task_model: TaskModel,  # Task 1
    test_db,
):
    # Create a second task for user_one
    task2_model = TaskModel(title="Another Active Task", user_id=test_user_one.id)
    await test_db.save(task2_model)

    # Try to update user_one_task_model to have the title of task2_model
    update_data = TaskUpdateRequest(title=task2_model.title)
    response = await async_client.patch(
        f"{TASKS_ENDPOINT}/{user_one_task_model.id}",
        headers=auth_headers_user_one,
        json=update_data.model_dump(mode="json"),
    )
    assert response.status_code == 400
    assert "already exists for this user" in response.json()["detail"]


async def test_update_task_not_found(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    non_existent_id = ObjectId()
    update_data = TaskUpdateRequest(title="No Task")
    response = await async_client.patch(
        f"{TASKS_ENDPOINT}/{non_existent_id}",
        headers=auth_headers_user_one,
        json=update_data.model_dump(mode="json"),
    )
    assert response.status_code == 404


async def test_update_task_not_owner(
    async_client: AsyncClient, auth_headers_user_two: dict[str, str], user_one_task_model: TaskModel
):
    update_data = TaskUpdateRequest(title="Attempted Update By UserTwo")
    response = await async_client.patch(
        f"{TASKS_ENDPOINT}/{user_one_task_model.id}",
        headers=auth_headers_user_two,
        json=update_data.model_dump(mode="json"),
    )
    assert response.status_code == 403


async def test_update_soft_deleted_task_fails(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: TaskModel, test_db
):
    user_one_task_model.is_deleted = True
    await test_db.save(user_one_task_model)

    update_data = TaskUpdateRequest(title="Update Soft Deleted")
    response = await async_client.patch(
        f"{TASKS_ENDPOINT}/{user_one_task_model.id}",
        headers=auth_headers_user_one,
        json=update_data.model_dump(mode="json"),
    )
    assert response.status_code == 404  # Service expects active task for update


async def test_delete_task_success(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: TaskModel, test_db
):
    delete_response = await async_client.delete(
        f"{TASKS_ENDPOINT}/{user_one_task_model.id}", headers=auth_headers_user_one
    )
    assert delete_response.status_code == 204

    # Verify it's marked as deleted by trying to fetch it (should be 404)
    get_response = await async_client.get(f"{TASKS_ENDPOINT}/{user_one_task_model.id}", headers=auth_headers_user_one)
    assert get_response.status_code == 404
    assert "Task has been deleted" in get_response.json()["detail"]

    # Verify it's not in get_all_tasks list
    all_tasks_response = await async_client.get(TASKS_ENDPOINT, headers=auth_headers_user_one)
    all_tasks = [TaskResponse(**item) for item in all_tasks_response.json()]
    assert user_one_task_model.id not in [task.id for task in all_tasks]


async def test_delete_task_not_found(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    non_existent_id = ObjectId()
    response = await async_client.delete(f"{TASKS_ENDPOINT}/{non_existent_id}", headers=auth_headers_user_one)
    assert response.status_code == 404


async def test_delete_task_not_owner(
    async_client: AsyncClient, auth_headers_user_two: dict[str, str], user_one_task_model: TaskModel
):
    response = await async_client.delete(f"{TASKS_ENDPOINT}/{user_one_task_model.id}", headers=auth_headers_user_two)
    assert response.status_code == 403


async def test_delete_already_soft_deleted_task_succeeds(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: TaskModel, test_db
):
    # First delete
    await async_client.delete(f"{TASKS_ENDPOINT}/{user_one_task_model.id}", headers=auth_headers_user_one)

    # Second delete
    delete_resp2 = await async_client.delete(
        f"{TASKS_ENDPOINT}/{user_one_task_model.id}", headers=auth_headers_user_one
    )
    assert delete_resp2.status_code == 204  # Deleting an already soft-deleted task is idempotent

    # Verify it's still considered not found for a direct GET
    get_response = await async_client.get(f"{TASKS_ENDPOINT}/{user_one_task_model.id}", headers=auth_headers_user_one)
    assert get_response.status_code == 404
    assert "Task has been deleted" in get_response.json()["detail"]


async def test_create_task_with_same_title_as_soft_deleted_succeeds(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    user_one_task_model: TaskModel,  # This will be soft-deleted
    test_db,
):
    # Soft delete the existing task
    user_one_task_model.is_deleted = True
    await test_db.save(user_one_task_model)

    # Attempt to create a new task with the same title
    new_task_data = TaskCreateRequest(title=user_one_task_model.title, description="New task with old title")
    response = await async_client.post(
        TASKS_ENDPOINT, headers=auth_headers_user_one, json=new_task_data.model_dump(mode="json")
    )
    assert response.status_code == 201
    created_task = TaskResponse(**response.json())
    assert created_task.title == user_one_task_model.title
    assert not created_task.is_deleted
    assert created_task.id != user_one_task_model.id


async def test_update_task_title_to_match_soft_deleted_succeeds(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    test_db,
):
    # Create a task that will be soft-deleted
    soft_deleted_title = "OldTitleSoftDeleted"
    task_to_delete = TaskModel(title=soft_deleted_title, user_id=test_user_one.id, is_deleted=True)
    await test_db.save(task_to_delete)

    # Create an active task to be updated
    active_task_to_update = TaskModel(
        title="ActiveTaskToUpdateTitle", user_id=test_user_one.id, status=TaskStatus.IN_PROGRESS
    )
    await test_db.save(active_task_to_update)

    # Update active task's title to the soft-deleted name
    update_data = TaskUpdateRequest(title=soft_deleted_title)
    response = await async_client.patch(
        f"{TASKS_ENDPOINT}/{active_task_to_update.id}",
        headers=auth_headers_user_one,
        json=update_data.model_dump(mode="json"),
    )
    assert response.status_code == 200
    updated_task = TaskResponse(**response.json())
    assert updated_task.title == soft_deleted_title
    assert not updated_task.is_deleted


@pytest.mark.parametrize(
    "filters, expected_count_func",
    [
        ({"status": "pending"}, lambda tasks: sum(1 for t in tasks if t.status == TaskStatus.PENDING)),
        ({"priority": "high"}, lambda tasks: sum(1 for t in tasks if t.priority == TaskPriority.HIGH)),
        (
            {"categoryId": "placeholder_category_id"},
            lambda tasks, cat_id: sum(1 for t in tasks if t.category and t.category.id == cat_id),
        ),
        (
            {"status": "in_progress", "priority": "medium"},
            lambda tasks: sum(
                1 for t in tasks if t.status == TaskStatus.IN_PROGRESS and t.priority == TaskPriority.MEDIUM
            ),
        ),
    ],
)
async def test_get_all_tasks_with_filters(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    user_one_category: CategoryModel,
    test_db,
    filters: dict,
    expected_count_func,
):
    # Clear existing tasks for the user for a clean test environment
    await test_db.get_collection(TaskModel).delete_many({"user_id": test_user_one.id})

    # Setup tasks
    task_data_list = [
        TaskModel(
            title="Task 1",
            user_id=test_user_one.id,
            status=TaskStatus.PENDING,
            priority=TaskPriority.LOW,
            category_id=user_one_category.id,
        ),
        TaskModel(
            title="Task 2", user_id=test_user_one.id, status=TaskStatus.IN_PROGRESS, priority=TaskPriority.MEDIUM
        ),
        TaskModel(
            title="Task 3",
            user_id=test_user_one.id,
            status=TaskStatus.DONE,
            priority=TaskPriority.HIGH,
            category_id=user_one_category.id,
        ),
        TaskModel(title="Task 4", user_id=test_user_one.id, status=TaskStatus.PENDING, priority=TaskPriority.HIGH),
    ]
    created_tasks_models = []
    for task_model in task_data_list:
        await test_db.save(task_model)
        # Re-fetch to build TaskResponse-like structure for expected_count_func
        task_resp_dict = task_model.model_dump()
        if task_model.category_id:
            cat = await test_db.find_one(CategoryModel, CategoryModel.id == task_model.category_id)
            task_resp_dict["category"] = cat  # CategoryResponse(**cat.model_dump()) if cat else None
        else:
            task_resp_dict["category"] = None
        created_tasks_models.append(TaskResponse(**task_resp_dict))

    query_params = {}
    if "categoryId" in filters and filters["categoryId"] == "placeholder_category_id":
        query_params["categoryId"] = str(user_one_category.id)
        expected_count = expected_count_func(created_tasks_models, user_one_category.id)
    else:
        query_params.update({k: v.value if hasattr(v, "value") else v for k, v in filters.items()})
        expected_count = expected_count_func(created_tasks_models)

    response = await async_client.get(TASKS_ENDPOINT, headers=auth_headers_user_one, params=query_params)
    assert response.status_code == 200
    response_tasks = [TaskResponse(**item) for item in response.json()]
    assert len(response_tasks) == expected_count

    # Verify all returned tasks match the filter criteria
    for task_resp in response_tasks:
        if "status" in filters:
            assert task_resp.status == filters["status"]
        if "priority" in filters:
            assert task_resp.priority == filters["priority"]
        if "categoryId" in filters and filters["categoryId"] == "placeholder_category_id":
            assert task_resp.category is not None
            assert task_resp.category.id == user_one_category.id


@pytest.mark.parametrize(
    "sort_by, sort_order, expected_order_key_func",
    [
        (
            "due_date",
            "asc",
            lambda t: (
                (t.due_date.replace(tzinfo=datetime.UTC) if t.due_date and t.due_date.tzinfo is None else t.due_date)
                if t.due_date
                else datetime.datetime.max.replace(tzinfo=datetime.UTC)
            ),
        ),
        (
            "due_date",
            "desc",
            lambda t: (
                (t.due_date.replace(tzinfo=datetime.UTC) if t.due_date and t.due_date.tzinfo is None else t.due_date)
                if t.due_date
                else datetime.datetime.min.replace(tzinfo=datetime.UTC)
            ),
        ),
        ("priority", "asc", lambda t: ({"low": 0, "medium": 1, "high": 2, "urgent": 3}[t.priority], str(t.id))),
        (
            "priority",
            "desc",
            lambda t: ({"low": 0, "medium": 1, "high": 2, "urgent": 3}[t.priority], str(t.id)),
        ),  # Use same map, reverse=True will handle desc
        ("created_at", "asc", lambda t: t.created_at),
        ("created_at", "desc", lambda t: t.created_at),
        ("title", "asc", lambda t: t.title.lower()),
        ("title", "desc", lambda t: t.title.lower()),
    ],
)
async def test_get_all_tasks_sorting(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    test_user_one: UserModel,
    test_db,
    sort_by: str,
    sort_order: str,
    expected_order_key_func,
):
    await test_db.get_collection(TaskModel).delete_many({"user_id": test_user_one.id})

    now = datetime.datetime.now(datetime.UTC)
    task_data_list = [
        TaskModel(
            title="Charlie Task",
            user_id=test_user_one.id,
            due_date=now + datetime.timedelta(days=3),
            priority=TaskPriority.LOW,
            created_at=now - datetime.timedelta(hours=2),
        ),
        TaskModel(
            title="Alpha Task",
            user_id=test_user_one.id,
            due_date=now + datetime.timedelta(days=1),
            priority=TaskPriority.URGENT,
            created_at=now - datetime.timedelta(hours=3),
        ),
        TaskModel(
            title="Bravo Task",
            user_id=test_user_one.id,
            due_date=now + datetime.timedelta(days=2),
            priority=TaskPriority.MEDIUM,
            created_at=now - datetime.timedelta(hours=1),
        ),
        TaskModel(
            title="Delta Task (No Due Date)", user_id=test_user_one.id, priority=TaskPriority.HIGH, created_at=now
        ),
    ]
    for task_model in task_data_list:
        await test_db.save(task_model)

    # Fetch tasks from DB to build TaskResponse-like objects for sorting verification
    db_tasks_raw = await test_db.find(TaskModel, TaskModel.user_id == test_user_one.id)
    expected_tasks_responses = []
    for tm in db_tasks_raw:
        # simplified response build, assuming no category for this sort test
        task_resp_dict = tm.model_dump()
        task_resp_dict["category"] = None
        expected_tasks_responses.append(TaskResponse(**task_resp_dict))

    # Sort expected_tasks_responses based on the key function and order
    expected_sorted_tasks = sorted(
        expected_tasks_responses,
        key=expected_order_key_func,
        reverse=(sort_order == "desc"),
    )

    response = await async_client.get(
        TASKS_ENDPOINT, headers=auth_headers_user_one, params={"sort_by": sort_by, "sort_order": sort_order}
    )
    assert response.status_code == 200
    response_tasks = [TaskResponse(**item) for item in response.json()]

    assert len(response_tasks) == len(expected_sorted_tasks)
    for i, task_resp in enumerate(response_tasks):
        expected_task = expected_sorted_tasks[i]
        assert task_resp.id == expected_task.id

        # Add assertions for the sorted field values
        if sort_by == "due_date":
            # Handle None due_dates and ensure timezone awareness for comparison
            resp_due_date = (
                task_resp.due_date.replace(tzinfo=datetime.UTC)
                if task_resp.due_date and task_resp.due_date.tzinfo is None
                else task_resp.due_date
            )
            exp_due_date = (
                expected_task.due_date.replace(tzinfo=datetime.UTC)
                if expected_task.due_date and expected_task.due_date.tzinfo is None
                else expected_task.due_date
            )
            if resp_due_date is None and exp_due_date is None:
                pass  # Both are None, which is fine for sorting
            elif resp_due_date is None or exp_due_date is None:
                # This case should ideally be handled by the sorting logic placing Nones consistently
                # For now, we rely on the ID check and the overall order.
                # A more robust check might be needed if None handling is complex.
                assert resp_due_date == exp_due_date  # Will fail if one is None and other is not
            else:
                assert abs((resp_due_date - exp_due_date).total_seconds()) < 1  # Compare with tolerance
        elif sort_by == "priority":
            assert task_resp.priority == expected_task.priority
        elif sort_by == "created_at":
            # Ensure timezone awareness for comparison
            resp_created_at = (
                task_resp.created_at.replace(tzinfo=datetime.UTC)
                if task_resp.created_at and task_resp.created_at.tzinfo is None
                else task_resp.created_at
            )
            exp_created_at = (
                expected_task.created_at.replace(tzinfo=datetime.UTC)
                if expected_task.created_at and expected_task.created_at.tzinfo is None
                else expected_task.created_at
            )
            assert abs((resp_created_at - exp_created_at).total_seconds()) < 1  # Compare with tolerance
        elif sort_by == "title":
            assert task_resp.title == expected_task.title


@pytest.mark.parametrize(
    "field, value, error_message_part",
    [
        ("title", "", "string should have at least 1 character"),  # Exact Pydantic v2 message
        ("title", "a" * 101, "string should have at most 100 characters"),  # Exact Pydantic v2 message
        ("description", "a" * 501, "string should have at most 500 characters"),  # Exact Pydantic v2 message
        (
            "status",
            "invalid_status",
            "input should be 'pending', 'in_progress', 'done' or 'blocked'",
        ),  # Exact Pydantic v2 message
        (
            "priority",
            "invalid_priority",
            "input should be 'low', 'medium', 'high' or 'urgent'",
        ),  # Exact Pydantic v2 message
        ("category_id", "not_an_object_id", "value error, invalid objectid"),  # Adjusted to match observed error text
    ],
)
async def test_create_task_validation_errors(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    field: str,
    value: any,
    error_message_part: str,
):
    task_data = {"title": "Valid Title"}  # Base valid data
    task_data[field] = value

    # For fields that are not part of TaskCreateRequest directly but TaskBase
    if field not in TaskCreateRequest.model_fields:
        # This test setup might need adjustment if testing fields not in TaskCreateRequest
        pass  # Assuming the test is designed for fields in TaskCreateRequest

    response = await async_client.post(TASKS_ENDPOINT, headers=auth_headers_user_one, json=task_data)
    assert response.status_code == 422
    assert error_message_part in response.text.lower()


async def test_unauthenticated_access_to_task_endpoints(async_client: AsyncClient):
    response = await async_client.get(TASKS_ENDPOINT)
    assert response.status_code == 401  # NotAuthenticatedException

    response = await async_client.post(TASKS_ENDPOINT, json={"title": "Test"})
    assert response.status_code == 401

    response = await async_client.get(f"{TASKS_ENDPOINT}/{ObjectId()}")
    assert response.status_code == 401

    response = await async_client.patch(f"{TASKS_ENDPOINT}/{ObjectId()}", json={"title": "Test"})
    assert response.status_code == 401

    response = await async_client.delete(f"{TASKS_ENDPOINT}/{ObjectId()}")
    assert response.status_code == 401


async def test_invalid_task_id_format(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    invalid_id = "this_is_not_a_valid_object_id"
    response = await async_client.get(f"{TASKS_ENDPOINT}/{invalid_id}", headers=auth_headers_user_one)
    assert response.status_code == 422  # Should be caught by FastAPI path param validation
    assert "Input should be an instance of ObjectId" in response.json()["detail"][0]["msg"]

    response = await async_client.patch(
        f"{TASKS_ENDPOINT}/{invalid_id}", headers=auth_headers_user_one, json={"title": "test"}
    )
    assert response.status_code == 422
    assert "Input should be an instance of ObjectId" in response.json()["detail"][0]["msg"]

    response = await async_client.delete(f"{TASKS_ENDPOINT}/{invalid_id}", headers=auth_headers_user_one)
    assert response.status_code == 422
    assert "Input should be an instance of ObjectId" in response.json()["detail"][0]["msg"]


async def test_update_task_statistics_flow_via_api(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_user_one: UserModel, test_db
):
    # 1. Create a PENDING task via API
    task_create_data = TaskCreateRequest(title="API Stats Flow Task", status=TaskStatus.PENDING)
    create_response = await async_client.post(
        TASKS_ENDPOINT, headers=auth_headers_user_one, json=task_create_data.model_dump(mode="json")
    )
    assert create_response.status_code == 201
    task_id = create_response.json()["id"]
    created_task = TaskResponse(**create_response.json())

    assert created_task.statistics.was_started_at is None
    assert created_task.statistics.was_taken_at is None
    assert created_task.statistics.lasts_min == 0

    # Mock datetime.utcnow to control time for statistics updates
    mock_time_1 = datetime.datetime.now(datetime.timezone.utc)
    mock_time_2 = mock_time_1 + datetime.timedelta(minutes=30)
    mock_time_3 = mock_time_2 + datetime.timedelta(minutes=15)
    mock_time_4 = mock_time_3 + datetime.timedelta(minutes=10)

    # 2. Move to IN_PROGRESS
    with patch("app.services.task_service.datetime") as mock_dt_1:
        mock_dt_1.now.return_value = mock_time_1  # service uses datetime.now(UTC)
        mock_dt_1.utcnow.return_value = mock_time_1  # some older parts might use utcnow
        update_data_1 = TaskUpdateRequest(status=TaskStatus.IN_PROGRESS)
        response_1 = await async_client.patch(
            f"{TASKS_ENDPOINT}/{task_id}", headers=auth_headers_user_one, json=update_data_1.model_dump(mode="json")
        )
    assert response_1.status_code == 200
    updated_task_1 = TaskResponse(**response_1.json())
    assert updated_task_1.statistics.was_started_at is not None
    assert abs((updated_task_1.statistics.was_started_at - mock_time_1).total_seconds()) < 2
    assert updated_task_1.statistics.was_taken_at is not None
    assert abs((updated_task_1.statistics.was_taken_at - mock_time_1).total_seconds()) < 2
    assert updated_task_1.statistics.lasts_min == 0

    # 3. Move to DONE
    with patch("app.services.task_service.datetime") as mock_dt_2:
        mock_dt_2.now.return_value = mock_time_2
        mock_dt_2.utcnow.return_value = mock_time_2
        update_data_2 = TaskUpdateRequest(status=TaskStatus.DONE)
        response_2 = await async_client.patch(
            f"{TASKS_ENDPOINT}/{task_id}", headers=auth_headers_user_one, json=update_data_2.model_dump(mode="json")
        )
    assert response_2.status_code == 200
    updated_task_2 = TaskResponse(**response_2.json())
    assert updated_task_2.statistics.was_stopped_at is not None
    assert abs((updated_task_2.statistics.was_stopped_at - mock_time_2).total_seconds()) < 2
    assert updated_task_2.statistics.lasts_min == 30  # (mock_time_2 - mock_time_1)

    # 4. Move back to IN_PROGRESS (re-opening task)
    with patch("app.services.task_service.datetime") as mock_dt_3:
        mock_dt_3.now.return_value = mock_time_3
        mock_dt_3.utcnow.return_value = mock_time_3
        update_data_3 = TaskUpdateRequest(status=TaskStatus.IN_PROGRESS)
        response_3 = await async_client.patch(
            f"{TASKS_ENDPOINT}/{task_id}", headers=auth_headers_user_one, json=update_data_3.model_dump(mode="json")
        )
    assert response_3.status_code == 200
    updated_task_3 = TaskResponse(**response_3.json())
    # Ensure was_started_at from response is UTC aware for comparison
    was_started_at_from_resp_3 = updated_task_3.statistics.was_started_at
    if was_started_at_from_resp_3 and was_started_at_from_resp_3.tzinfo is None:
        was_started_at_from_resp_3 = was_started_at_from_resp_3.replace(tzinfo=datetime.timezone.utc)
    updated_task_3.statistics.was_started_at = was_started_at_from_resp_3

    # Ensure was_taken_at from response is UTC aware for comparison
    was_taken_at_from_resp_3 = updated_task_3.statistics.was_taken_at
    if was_taken_at_from_resp_3 and was_taken_at_from_resp_3.tzinfo is None:
        was_taken_at_from_resp_3 = was_taken_at_from_resp_3.replace(tzinfo=datetime.timezone.utc)
    updated_task_3.statistics.was_taken_at = was_taken_at_from_resp_3

    # Ensure was_stopped_at from response is UTC aware for comparison
    was_stopped_at_from_resp_3 = updated_task_3.statistics.was_stopped_at
    if was_stopped_at_from_resp_3 and was_stopped_at_from_resp_3.tzinfo is None:
        was_stopped_at_from_resp_3 = was_stopped_at_from_resp_3.replace(tzinfo=datetime.timezone.utc)
    updated_task_3.statistics.was_stopped_at = was_stopped_at_from_resp_3

    assert abs((updated_task_3.statistics.was_started_at - mock_time_1).total_seconds()) < 2  # Should not change
    assert abs((updated_task_3.statistics.was_taken_at - mock_time_3).total_seconds()) < 2  # Updated
    # was_stopped_at should remain from the last stop, or be None if re-opened from non-stopped state
    # In this flow, it was stopped at mock_time_2
    assert abs((updated_task_3.statistics.was_stopped_at - mock_time_2).total_seconds()) < 2
    assert updated_task_3.statistics.lasts_min == 30  # Unchanged until next stop

    # 5. Move to BLOCKED (another stop)
    with patch("app.services.task_service.datetime") as mock_dt_4:
        mock_dt_4.now.return_value = mock_time_4
        mock_dt_4.utcnow.return_value = mock_time_4
        update_data_4 = TaskUpdateRequest(status=TaskStatus.BLOCKED)
        response_4 = await async_client.patch(
            f"{TASKS_ENDPOINT}/{task_id}", headers=auth_headers_user_one, json=update_data_4.model_dump(mode="json")
        )
    assert response_4.status_code == 200
    updated_task_4 = TaskResponse(**response_4.json())
    # Ensure was_stopped_at from response is UTC aware for comparison
    was_stopped_at_from_resp_4 = updated_task_4.statistics.was_stopped_at
    if was_stopped_at_from_resp_4 and was_stopped_at_from_resp_4.tzinfo is None:
        was_stopped_at_from_resp_4 = was_stopped_at_from_resp_4.replace(tzinfo=datetime.timezone.utc)
    updated_task_4.statistics.was_stopped_at = was_stopped_at_from_resp_4

    assert abs((updated_task_4.statistics.was_stopped_at - mock_time_4).total_seconds()) < 2
    assert updated_task_4.statistics.lasts_min == 30 + 10  # 30 (previous) + 10 (mock_time_4 - mock_time_3)


async def test_update_task_no_status_change_no_stat_change_via_api(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], test_user_one: UserModel, test_db
):
    # Create a task with specific initial statistics
    now_utc = datetime.datetime.now(datetime.timezone.utc)
    initial_start = now_utc - datetime.timedelta(days=1)
    initial_taken = now_utc - datetime.timedelta(hours=2)
    initial_stop = now_utc - datetime.timedelta(hours=1)
    initial_lasts_min = 60

    # Create task via API, then update its stats directly in DB for test setup simplicity
    task_create_data = TaskCreateRequest(title="No Status Change API Task", status=TaskStatus.IN_PROGRESS)
    create_response = await async_client.post(
        TASKS_ENDPOINT, headers=auth_headers_user_one, json=task_create_data.model_dump(mode="json")
    )
    assert create_response.status_code == 201
    task_id = ObjectId(create_response.json()["id"])

    # Manually set statistics in the DB for this test scenario
    # This is to ensure we have known, non-default statistics to compare against
    task_in_db = await test_db.find_one(TaskModel, TaskModel.id == task_id)
    task_in_db.statistics.was_started_at = initial_start
    task_in_db.statistics.was_taken_at = initial_taken
    task_in_db.statistics.was_stopped_at = initial_stop
    task_in_db.statistics.lasts_min = initial_lasts_min
    await test_db.save(task_in_db)

    # Update only the title
    update_data = TaskUpdateRequest(title="Updated Title Only API")
    response = await async_client.patch(
        f"{TASKS_ENDPOINT}/{task_id}",
        headers=auth_headers_user_one,
        json=update_data.model_dump(mode="json", exclude_none=True),
    )
    assert response.status_code == 200
    updated_task = TaskResponse(**response.json())

    assert updated_task.title == "Updated Title Only API"

    # Ensure datetimes from response are UTC aware for comparison
    resp_was_started_at = updated_task.statistics.was_started_at
    if resp_was_started_at and resp_was_started_at.tzinfo is None:
        resp_was_started_at = resp_was_started_at.replace(tzinfo=datetime.timezone.utc)
    # Assign back to the response object's statistics for direct comparison
    updated_task.statistics.was_started_at = resp_was_started_at

    resp_was_taken_at = updated_task.statistics.was_taken_at
    if resp_was_taken_at and resp_was_taken_at.tzinfo is None:
        resp_was_taken_at = resp_was_taken_at.replace(tzinfo=datetime.timezone.utc)
    updated_task.statistics.was_taken_at = resp_was_taken_at

    resp_was_stopped_at = updated_task.statistics.was_stopped_at
    if resp_was_stopped_at and resp_was_stopped_at.tzinfo is None:
        resp_was_stopped_at = resp_was_stopped_at.replace(tzinfo=datetime.timezone.utc)
    updated_task.statistics.was_stopped_at = resp_was_stopped_at

    # Compare with tolerance due to potential microsecond differences
    assert abs((updated_task.statistics.was_started_at - initial_start).total_seconds()) < 1
    assert abs((updated_task.statistics.was_taken_at - initial_taken).total_seconds()) < 1
    assert abs((updated_task.statistics.was_started_at - initial_start).total_seconds()) < 1
    assert abs((updated_task.statistics.was_taken_at - initial_taken).total_seconds()) < 1
    assert abs((updated_task.statistics.was_stopped_at - initial_stop).total_seconds()) < 1
    assert updated_task.statistics.lasts_min == initial_lasts_min


# #####################################################
# # Tests for New LLM Suggestion Endpoint (Apply endpoint is removed) #
# #####################################################################

# Tests for the old "/improve-text" endpoint are already commented out or removed.


# Updated tests for GET /llm-suggestions


# Verify/Augment Tests for PATCH /tasks/{task_id}
async def test_update_task_only_title(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: TaskModel, test_db
):
    original_description = user_one_task_model.description
    original_status = user_one_task_model.status

    update_data = {"title": "Updated Title Only By Patch"}
    response = await async_client.patch(
        f"{TASKS_ENDPOINT}/{user_one_task_model.id}",
        headers=auth_headers_user_one,
        json=update_data,  # No need for TaskUpdateRequest.model_dump here
    )
    assert response.status_code == 200
    updated_task_resp = TaskResponse(**response.json())
    assert updated_task_resp.title == "Updated Title Only By Patch"
    assert updated_task_resp.description == original_description  # Ensure description is unchanged
    assert updated_task_resp.status == original_status  # Ensure status is unchanged

    db_task = await test_db.find_one(TaskModel, TaskModel.id == user_one_task_model.id)
    assert db_task.title == "Updated Title Only By Patch"
    assert db_task.description == original_description


async def test_update_task_only_description(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: TaskModel, test_db
):
    original_title = user_one_task_model.title
    original_status = user_one_task_model.status
    # Ensure description is not None for this test to be meaningful if it can be None
    if user_one_task_model.description is None:
        user_one_task_model.description = "Initial description"
        await test_db.save(user_one_task_model)

    update_data = {"description": "Updated Description Only By Patch"}
    response = await async_client.patch(
        f"{TASKS_ENDPOINT}/{user_one_task_model.id}",
        headers=auth_headers_user_one,
        json=update_data,
    )
    assert response.status_code == 200
    updated_task_resp = TaskResponse(**response.json())
    assert updated_task_resp.description == "Updated Description Only By Patch"
    assert updated_task_resp.title == original_title  # Ensure title is unchanged
    assert updated_task_resp.status == original_status  # Ensure status is unchanged

    db_task = await test_db.find_one(TaskModel, TaskModel.id == user_one_task_model.id)
    assert db_task.description == "Updated Description Only By Patch"
    assert db_task.title == original_title
