import datetime

import pytest
from httpx import AsyncClient
from odmantic import ObjectId

from app.api.schemas.task import TaskCreateRequest, TaskPriority, TaskResponse, TaskStatus, TaskUpdateRequest
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


async def test_get_soft_deleted_task_by_id_success(
    async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: TaskModel, test_db
):
    # Soft delete the task
    user_one_task_model.is_deleted = True
    await test_db.save(user_one_task_model)

    response = await async_client.get(f"{TASKS_ENDPOINT}/{user_one_task_model.id}", headers=auth_headers_user_one)
    assert response.status_code == 200
    fetched_task = TaskResponse(**response.json())
    assert fetched_task.id == user_one_task_model.id
    assert fetched_task.is_deleted is True


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
        updated_task.created_at.replace(tzinfo=datetime.UTC)
        if updated_task.created_at.tzinfo is None
        else updated_task.created_at
    )
    updated_at_aware = (
        updated_task.updated_at.replace(tzinfo=datetime.UTC)
        if updated_task.updated_at.tzinfo is None
        else updated_task.updated_at
    )
    assert updated_at_aware > created_at_aware


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

    # Verify it's marked as deleted
    get_response = await async_client.get(f"{TASKS_ENDPOINT}/{user_one_task_model.id}", headers=auth_headers_user_one)
    assert get_response.status_code == 200
    fetched_task = TaskResponse(**get_response.json())
    assert fetched_task.is_deleted is True

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
    assert delete_resp2.status_code == 204

    get_response = await async_client.get(f"{TASKS_ENDPOINT}/{user_one_task_model.id}", headers=auth_headers_user_one)
    assert TaskResponse(**get_response.json()).is_deleted is True


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
        assert task_resp.id == expected_sorted_tasks[i].id
        # Due date comparison needs care due to potential None values and timezone
        if sort_by == "due_date":
            resp_due_date = task_resp.due_date
            exp_due_date = expected_sorted_tasks[i].due_date
            if resp_due_date:
                resp_due_date = resp_due_date.replace(microsecond=0)
            if exp_due_date:
                exp_due_date = exp_due_date.replace(microsecond=0)
            assert resp_due_date == exp_due_date
        elif sort_by == "priority":
            assert task_resp.priority == expected_sorted_tasks[i].priority
        elif sort_by == "created_at":
            # Compare with tolerance for microseconds if necessary, or strip them
            assert task_resp.created_at.replace(microsecond=0) == expected_sorted_tasks[i].created_at.replace(
                microsecond=0
            )
        elif sort_by == "title":
            assert task_resp.title == expected_sorted_tasks[i].title


@pytest.mark.parametrize(
    "payload_field, invalid_value, expected_detail_part",
    [
        ("title", "", "String should have at least 1 character"),
        ("title", "a" * 101, "String should have at most 100 characters"),
        ("description", "a" * 501, "String should have at most 500 characters"),
        ("status", "invalid_status", "Input should be 'pending', 'in_progress', 'done' or 'blocked'"),
        ("priority", "invalid_priority", "Input should be 'low', 'medium', 'high' or 'urgent'"),
        ("due_date", "not_a_date", "Input should be a valid datetime"),
        ("category_id", "not_an_object_id", "Input should be an instance of ObjectId"),
    ],
)
async def test_create_task_validation_errors(
    async_client: AsyncClient,
    auth_headers_user_one: dict[str, str],
    payload_field: str,
    invalid_value,
    expected_detail_part: str,
):
    base_payload = {"title": "Valid Title for Validation Test"}
    payload = {**base_payload, payload_field: invalid_value}

    response = await async_client.post(TASKS_ENDPOINT, headers=auth_headers_user_one, json=payload)
    assert response.status_code == 422
    response_json = response.json()
    assert "detail" in response_json
    error_messages = [err.get("msg", "") for err in response_json.get("detail", [])]
    assert any(expected_detail_part.lower() in msg.lower() for msg in error_messages if msg)


async def test_unauthenticated_access_to_task_endpoints(async_client: AsyncClient):
    endpoints_to_test = [
        ("POST", TASKS_ENDPOINT, {"title": "Unauth Task"}),
        ("GET", TASKS_ENDPOINT, None),
        ("GET", f"{TASKS_ENDPOINT}/{ObjectId()}", None),
        ("PATCH", f"{TASKS_ENDPOINT}/{ObjectId()}", {"title": "Unauth Update"}),
        ("DELETE", f"{TASKS_ENDPOINT}/{ObjectId()}", None),
    ]

    for method, url, json_data in endpoints_to_test:
        if json_data:
            response = await async_client.request(method, url, json=json_data)
        else:
            response = await async_client.request(method, url)
        assert response.status_code == 401
        assert response.json()["detail"] == "Not authenticated"


async def test_invalid_task_id_format(async_client: AsyncClient, auth_headers_user_one: dict[str, str]):
    invalid_id = "this-is-not-an-objectid"
    endpoints_to_test = [
        ("GET", f"{TASKS_ENDPOINT}/{invalid_id}"),
        ("PATCH", f"{TASKS_ENDPOINT}/{invalid_id}"),
        ("DELETE", f"{TASKS_ENDPOINT}/{invalid_id}"),
    ]
    json_payload_for_patch = {"title": "Update with invalid ID"}

    for method, url in endpoints_to_test:
        if method == "PATCH":
            response = await async_client.request(
                method, url, headers=auth_headers_user_one, json=json_payload_for_patch
            )
        else:
            response = await async_client.request(method, url, headers=auth_headers_user_one)

        assert response.status_code == 422  # Path validation for ObjectId
        assert "Input should be an instance of ObjectId" in response.json()["detail"][0]["msg"]
