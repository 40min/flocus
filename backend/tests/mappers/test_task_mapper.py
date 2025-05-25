from datetime import date, datetime, timezone

import pytest
from odmantic import ObjectId

from app.api.schemas.category import CategoryResponse
from app.api.schemas.task import TaskCreateRequest, TaskPriority, TaskResponse, TaskStatus
from app.db.models.category import Category
from app.db.models.task import Task
from app.mappers.task_mapper import TaskMapper


@pytest.fixture
def sample_user_id() -> ObjectId:
    return ObjectId()


@pytest.fixture
def sample_category_id() -> ObjectId:
    return ObjectId()


@pytest.fixture
def sample_category_model(sample_user_id: ObjectId, sample_category_id: ObjectId) -> Category:
    return Category(
        id=sample_category_id,
        name="Test Category",
        user=sample_user_id,
        description="A test category",
        color="#FFFFFF",
        icon="test_icon",
        is_deleted=False,
        created_at=datetime.now(timezone.utc),
        updated_at=datetime.now(timezone.utc),
    )


@pytest.fixture
def sample_category_response(sample_category_model: Category) -> CategoryResponse:
    return CategoryResponse.model_validate(sample_category_model)


@pytest.fixture
def sample_task_create_request(sample_category_id: ObjectId) -> TaskCreateRequest:
    return TaskCreateRequest(
        title="New Task Title",
        description="New task description",
        status=TaskStatus.PENDING,
        priority=TaskPriority.MEDIUM,
        due_date=date(2025, 12, 31),
        category_id=sample_category_id,
    )


@pytest.fixture
def sample_task_model(
    sample_user_id: ObjectId, sample_category_id: ObjectId, sample_task_create_request: TaskCreateRequest
) -> Task:
    now = datetime.now(timezone.utc)
    return Task(
        id=ObjectId(),
        title=sample_task_create_request.title,
        description=sample_task_create_request.description,
        status=sample_task_create_request.status,
        priority=sample_task_create_request.priority,
        due_date=sample_task_create_request.due_date,
        category_id=sample_category_id,
        user_id=sample_user_id,
        is_deleted=False,
        created_at=now,
        updated_at=now,
    )


class TestTaskMapper:
    def test_to_model_for_create(self, sample_task_create_request: TaskCreateRequest, sample_user_id: ObjectId):
        before_creation = datetime.now(timezone.utc)
        task_model = TaskMapper.to_model_for_create(sample_task_create_request, sample_user_id)
        after_creation = datetime.now(timezone.utc)

        assert isinstance(task_model, Task)
        assert task_model.title == sample_task_create_request.title
        assert task_model.description == sample_task_create_request.description
        assert task_model.status == sample_task_create_request.status
        assert task_model.priority == sample_task_create_request.priority
        assert task_model.due_date == sample_task_create_request.due_date
        assert task_model.category_id == sample_task_create_request.category_id
        assert task_model.user_id == sample_user_id
        assert not task_model.is_deleted
        # Check timestamps are close, allowing for small execution time differences
        assert abs((task_model.created_at - before_creation).total_seconds()) < 1
        assert abs((task_model.updated_at - before_creation).total_seconds()) < 1
        assert abs((after_creation - task_model.created_at).total_seconds()) < 1
        assert abs((after_creation - task_model.updated_at).total_seconds()) < 1
        assert task_model.created_at == task_model.updated_at  # For new creation

    def test_to_model_for_create_no_category(
        self, sample_task_create_request: TaskCreateRequest, sample_user_id: ObjectId
    ):
        task_create_no_category = sample_task_create_request.model_copy()
        task_create_no_category.category_id = None

        task_model = TaskMapper.to_model_for_create(task_create_no_category, sample_user_id)

        assert task_model.category_id is None

    def test_to_response_with_category(
        self, sample_task_model: Task, sample_category_model: Category, sample_category_response: CategoryResponse
    ):
        task_response = TaskMapper.to_response(sample_task_model, sample_category_model)

        assert isinstance(task_response, TaskResponse)
        assert task_response.id == sample_task_model.id
        assert task_response.title == sample_task_model.title
        assert task_response.description == sample_task_model.description
        assert task_response.status == sample_task_model.status
        assert task_response.priority == sample_task_model.priority
        assert task_response.due_date == sample_task_model.due_date
        assert task_response.category_id == sample_task_model.category_id
        assert task_response.user_id == sample_task_model.user_id
        assert task_response.is_deleted == sample_task_model.is_deleted
        assert task_response.created_at == sample_task_model.created_at
        assert task_response.updated_at == sample_task_model.updated_at

        assert task_response.category is not None
        assert task_response.category.id == sample_category_model.id
        assert task_response.category.name == sample_category_model.name
        # Compare with the pre-validated response to ensure model_validate works as expected
        assert task_response.category == sample_category_response

    def test_to_response_without_category(self, sample_task_model: Task):
        task_model_no_category = sample_task_model.model_copy()
        task_model_no_category.category_id = None

        task_response = TaskMapper.to_response(task_model_no_category, None)

        assert isinstance(task_response, TaskResponse)
        assert task_response.id == task_model_no_category.id
        assert task_response.title == task_model_no_category.title
        assert task_response.category_id is None
        assert task_response.category is None
        assert task_response.user_id == task_model_no_category.user_id

    def test_to_response_with_category_id_but_no_category_model(self, sample_task_model: Task):
        # This simulates a scenario where category_id exists on task, but the category model
        # itself couldn't be fetched (e.g., deleted, or not found for some reason).
        # The mapper should still produce a response, but category field will be None.
        task_response = TaskMapper.to_response(sample_task_model, None)  # Pass None for category_model

        assert isinstance(task_response, TaskResponse)
        assert task_response.id == sample_task_model.id
        assert task_response.title == sample_task_model.title
        assert task_response.category_id == sample_task_model.category_id  # category_id is still present
        assert task_response.category is None  # But the category object is None
        assert task_response.user_id == sample_task_model.user_id
