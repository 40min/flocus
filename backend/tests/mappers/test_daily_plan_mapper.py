from datetime import datetime, timezone

import pytest
from odmantic import ObjectId

from app.api.schemas.category import CategoryResponse
from app.api.schemas.daily_plan import DailyPlanCreateRequest, DailyPlanResponse, TimeWindowCreate, TimeWindowResponse
from app.api.schemas.task import TaskPriority, TaskResponse, TaskStatus
from app.api.schemas.time_window import TimeWindowResponse as TimeWindowModelResponse
from app.db.models.daily_plan import DailyPlan, TimeWindow
from app.mappers.daily_plan_mapper import DailyPlanMapper


@pytest.fixture
def sample_user_id() -> ObjectId:
    return ObjectId()


@pytest.fixture
def sample_category_id() -> ObjectId:
    return ObjectId()


@pytest.fixture
def sample_plan_date() -> datetime:
    return datetime(2024, 7, 20, 0, 0, 0).replace(tzinfo=timezone.utc)


@pytest.fixture
def sample_category_response(sample_category_id: ObjectId, sample_user_id: ObjectId) -> CategoryResponse:
    return CategoryResponse(
        id=sample_category_id,
        name="Test Category",
        user=sample_user_id,
        color="#FF0000",
        description="A test category for mappers.",
        is_deleted=False,
    )


@pytest.fixture
def sample_time_window_response_for_allocation(sample_category_response: CategoryResponse) -> TimeWindowModelResponse:
    return TimeWindowModelResponse(
        id=ObjectId(),
        description="Morning Focus",
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
def sample_daily_plan_model(
    sample_user_id: ObjectId, sample_category_id: ObjectId, sample_plan_date: datetime
) -> DailyPlan:
    return DailyPlan(
        id=ObjectId(),
        user_id=sample_user_id,
        plan_date=sample_plan_date,
        time_windows=[
            TimeWindow(
                description="Embedded TW 1",
                category_id=sample_category_id,
                start_time=540,
                end_time=600,
                task_ids=[ObjectId()],
            ),
            TimeWindow(
                description="Embedded TW 2",
                category_id=sample_category_id,
                start_time=660,
                end_time=720,
                task_ids=[ObjectId()],
            ),
        ],
    )


@pytest.fixture
def sample_daily_plan_create_request(
    sample_category_id: ObjectId, sample_plan_date: datetime
) -> DailyPlanCreateRequest:
    return DailyPlanCreateRequest(
        plan_date=sample_plan_date,
        time_windows=[
            TimeWindowCreate(
                description="Morning Session",
                category_id=sample_category_id,
                start_time=540,
                end_time=720,
                task_ids=[ObjectId()],
            ),
            TimeWindowCreate(
                description="Afternoon Block",
                category_id=sample_category_id,
                start_time=780,
                end_time=900,
                task_ids=[ObjectId()],
            ),
        ],
    )


def test_time_windows_request_to_models(sample_daily_plan_create_request: DailyPlanCreateRequest):
    time_window_dtos = sample_daily_plan_create_request.time_windows
    result_models = DailyPlanMapper.time_windows_request_to_models(time_window_dtos)

    assert len(result_models) == len(time_window_dtos)
    for i, dto in enumerate(time_window_dtos):
        model = result_models[i]
        assert isinstance(model, TimeWindow)
        assert model.description == dto.description
        assert model.category_id == dto.category_id
        assert model.start_time == dto.start_time
        assert model.end_time == dto.end_time
        assert model.task_ids == dto.task_ids


def test_to_time_window_response(
    sample_time_window_response_for_allocation: TimeWindowModelResponse, sample_task_response: TaskResponse
):
    result = DailyPlanMapper.to_time_window_response(
        time_window_response=sample_time_window_response_for_allocation, task_responses=[sample_task_response]
    )
    assert isinstance(result, TimeWindowResponse)
    assert result.time_window == sample_time_window_response_for_allocation
    assert result.tasks == [sample_task_response]


def test_to_response(
    sample_daily_plan_model: DailyPlan,
    sample_time_window_response_for_allocation: TimeWindowModelResponse,
    sample_task_response: TaskResponse,
):
    populated_time_windows = [
        TimeWindowResponse(time_window=sample_time_window_response_for_allocation, tasks=[sample_task_response])
    ]
    result = DailyPlanMapper.to_response(
        daily_plan_model=sample_daily_plan_model, populated_time_window_responses=populated_time_windows
    )

    assert isinstance(result, DailyPlanResponse)
    assert result.id == sample_daily_plan_model.id
    assert result.user_id == sample_daily_plan_model.user_id
    assert result.plan_date == sample_daily_plan_model.plan_date
    assert result.time_windows == populated_time_windows
    assert len(result.time_windows) == 1


def test_to_response_empty_time_windows(sample_daily_plan_model: DailyPlan):
    sample_daily_plan_model.time_windows = []
    result = DailyPlanMapper.to_response(daily_plan_model=sample_daily_plan_model, populated_time_window_responses=[])

    assert isinstance(result, DailyPlanResponse)
    assert result.id == sample_daily_plan_model.id
    assert result.user_id == sample_daily_plan_model.user_id
    assert result.plan_date == sample_daily_plan_model.plan_date
    assert result.time_windows == []


def test_to_model_for_create(sample_daily_plan_create_request: DailyPlanCreateRequest, sample_user_id: ObjectId):
    result = DailyPlanMapper.to_model_for_create(schema=sample_daily_plan_create_request, user_id=sample_user_id)

    assert isinstance(result, DailyPlan)
    assert result.user_id == sample_user_id
    expected_date = sample_daily_plan_create_request.plan_date
    assert result.plan_date == expected_date
    assert len(result.time_windows) == len(sample_daily_plan_create_request.time_windows)

    for i, tw_schema in enumerate(sample_daily_plan_create_request.time_windows):
        model_tw = result.time_windows[i]
        assert isinstance(model_tw, TimeWindow)
        assert model_tw.description == tw_schema.description
        assert model_tw.category_id == tw_schema.category_id
        assert model_tw.start_time == tw_schema.start_time
        assert model_tw.end_time == tw_schema.end_time
        assert model_tw.task_ids == tw_schema.task_ids


def test_to_model_for_create_empty_time_windows(sample_user_id: ObjectId, sample_plan_date: datetime):
    create_request_empty_tws = DailyPlanCreateRequest(plan_date=sample_plan_date, time_windows=[])
    result = DailyPlanMapper.to_model_for_create(schema=create_request_empty_tws, user_id=sample_user_id)

    assert isinstance(result, DailyPlan)
    assert result.user_id == sample_user_id
    expected_date = create_request_empty_tws.plan_date
    assert result.plan_date == expected_date
    assert result.time_windows == []
