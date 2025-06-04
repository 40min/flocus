from datetime import date, datetime, time

import pytest
from odmantic import ObjectId

from app.api.schemas.category import CategoryResponse
from app.api.schemas.daily_plan import (
    DailyPlanAllocationCreate,
    DailyPlanAllocationResponse,
    DailyPlanCreateRequest,
    DailyPlanResponse,
)
from app.api.schemas.task import TaskPriority, TaskResponse, TaskStatus
from app.api.schemas.time_window import TimeWindowResponse
from app.db.models.daily_plan import DailyPlan, DailyPlanAllocation
from app.mappers.daily_plan_mapper import DailyPlanMapper


@pytest.fixture
def sample_user_id() -> ObjectId:
    return ObjectId()


@pytest.fixture
def sample_category_id() -> ObjectId:
    return ObjectId()


@pytest.fixture
def sample_category_response(sample_category_id: ObjectId, sample_user_id: ObjectId) -> CategoryResponse:
    return CategoryResponse(
        id=sample_category_id,
        name="Test Category",
        user=sample_user_id,  # Corrected: use alias 'user'
        color="#FF0000",
        description="A test category for mappers.",  # Optional, but good for completeness
        is_deleted=False,  # This field is in CategoryResponse
    )


@pytest.fixture
def sample_time_window_response_for_allocation(sample_category_response: CategoryResponse) -> TimeWindowResponse:
    return TimeWindowResponse(
        id=ObjectId(),  # Added dummy ID for the response schema
        name="Morning Focus",
        start_time=540,  # 09:00
        end_time=720,  # 12:00
        category=sample_category_response,
    )


@pytest.fixture
def sample_task_response(sample_category_response: CategoryResponse, sample_user_id: ObjectId) -> TaskResponse:
    now = datetime.now()
    return TaskResponse(
        id=ObjectId(),
        title="Complete report",
        priority=TaskPriority.HIGH,
        status=TaskStatus.PENDING,
        category=sample_category_response,
        user_id=sample_user_id,
        due_date=datetime(2024, 12, 31, 0, 0, 0),
        description="A detailed report needs to be completed.",
        created_at=now,
        updated_at=now,
    )


@pytest.fixture
def sample_daily_plan_model(sample_user_id: ObjectId, sample_category_id: ObjectId) -> DailyPlan:
    plan_date = date(2024, 7, 20)
    plan_datetime = datetime.combine(plan_date, time.min)
    return DailyPlan(
        id=ObjectId(),
        user_id=sample_user_id,
        plan_date=plan_datetime,
        allocations=[
            DailyPlanAllocation(
                name="Embedded TW 1",
                category_id=sample_category_id,
                start_time=540,
                end_time=600,
                task_ids=[ObjectId()],
            ),
            DailyPlanAllocation(
                name="Embedded TW 2",
                category_id=sample_category_id,
                start_time=660,
                end_time=720,
                task_ids=[ObjectId()],
            ),
        ],
    )


@pytest.fixture
def sample_daily_plan_create_request(sample_category_id: ObjectId) -> DailyPlanCreateRequest:
    return DailyPlanCreateRequest(
        plan_date=date(2024, 7, 21),
        allocations=[
            DailyPlanAllocationCreate(
                name="Morning Session",
                category_id=sample_category_id,
                start_time=540,
                end_time=720,
                task_ids=[ObjectId()],
            ),
            DailyPlanAllocationCreate(
                name="Afternoon Block",
                category_id=sample_category_id,
                start_time=780,
                end_time=900,
                task_ids=[ObjectId()],
            ),
        ],
    )


def test_allocations_request_to_models(sample_daily_plan_create_request: DailyPlanCreateRequest):
    allocation_dtos = sample_daily_plan_create_request.allocations
    result_models = DailyPlanMapper.allocations_request_to_models(allocation_dtos)

    assert len(result_models) == len(allocation_dtos)
    for i, dto in enumerate(allocation_dtos):
        model = result_models[i]
        assert isinstance(model, DailyPlanAllocation)
        assert model.name == dto.name
        assert model.category_id == dto.category_id
        assert model.start_time == dto.start_time
        assert model.end_time == dto.end_time
        assert model.task_ids == dto.task_ids


def test_to_allocation_response(
    sample_time_window_response_for_allocation: TimeWindowResponse, sample_task_response: TaskResponse
):
    result = DailyPlanMapper.to_allocation_response(
        time_window_response=sample_time_window_response_for_allocation, task_responses=[sample_task_response]
    )
    assert isinstance(result, DailyPlanAllocationResponse)
    assert result.time_window == sample_time_window_response_for_allocation
    assert result.tasks == [sample_task_response]


def test_to_response(
    sample_daily_plan_model: DailyPlan,
    sample_time_window_response_for_allocation: TimeWindowResponse,
    sample_task_response: TaskResponse,
):
    populated_allocations = [
        DailyPlanAllocationResponse(
            time_window=sample_time_window_response_for_allocation, tasks=[sample_task_response]
        )
    ]
    result = DailyPlanMapper.to_response(
        daily_plan_model=sample_daily_plan_model, populated_allocations_responses=populated_allocations
    )

    assert isinstance(result, DailyPlanResponse)
    assert result.id == sample_daily_plan_model.id
    assert result.user_id == sample_daily_plan_model.user_id
    assert result.plan_date == sample_daily_plan_model.plan_date.date()
    assert result.allocations == populated_allocations
    assert len(result.allocations) == 1


def test_to_response_empty_allocations(sample_daily_plan_model: DailyPlan):
    sample_daily_plan_model.allocations = []
    result = DailyPlanMapper.to_response(daily_plan_model=sample_daily_plan_model, populated_allocations_responses=[])

    assert isinstance(result, DailyPlanResponse)
    assert result.id == sample_daily_plan_model.id
    assert result.user_id == sample_daily_plan_model.user_id
    assert result.plan_date == sample_daily_plan_model.plan_date.date()
    assert result.allocations == []


def test_to_model_for_create(sample_daily_plan_create_request: DailyPlanCreateRequest, sample_user_id: ObjectId):
    result = DailyPlanMapper.to_model_for_create(schema=sample_daily_plan_create_request, user_id=sample_user_id)

    assert isinstance(result, DailyPlan)
    assert result.user_id == sample_user_id
    expected_datetime = datetime.combine(sample_daily_plan_create_request.plan_date, time.min)
    assert result.plan_date == expected_datetime
    assert len(result.allocations) == len(sample_daily_plan_create_request.allocations)

    for i, alloc_schema in enumerate(sample_daily_plan_create_request.allocations):
        model_alloc = result.allocations[i]
        assert isinstance(model_alloc, DailyPlanAllocation)
        assert model_alloc.name == alloc_schema.name
        assert model_alloc.category_id == alloc_schema.category_id
        assert model_alloc.start_time == alloc_schema.start_time
        assert model_alloc.end_time == alloc_schema.end_time
        assert model_alloc.task_ids == alloc_schema.task_ids


def test_to_model_for_create_empty_allocations(sample_user_id: ObjectId):
    create_request_empty_allocs = DailyPlanCreateRequest(plan_date=date(2024, 8, 1), allocations=[])
    result = DailyPlanMapper.to_model_for_create(schema=create_request_empty_allocs, user_id=sample_user_id)

    assert isinstance(result, DailyPlan)
    assert result.user_id == sample_user_id
    expected_datetime = datetime.combine(create_request_empty_allocs.plan_date, time.min)
    assert result.plan_date == expected_datetime
    assert result.allocations == []
