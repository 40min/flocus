# from datetime import date, datetime, time
#
# import pytest
# from odmantic import ObjectId
#
# from app.api.schemas.category import CategoryResponse
# from app.api.schemas.daily_plan import (
#     DailyPlanAllocationCreate,
#     DailyPlanAllocationResponse,
#     DailyPlanCreateRequest,
#     DailyPlanResponse,
# )
# from app.api.schemas.task import TaskPriority, TaskResponse, TaskStatus
# from app.api.schemas.time_window import TimeWindowResponse
# from app.db.models.daily_plan import DailyPlan, DailyPlanAllocation
# from app.mappers.daily_plan_mapper import DailyPlanMapper
#
#
# @pytest.fixture
# def sample_user_id() -> ObjectId:
#     return ObjectId()
#
#
# @pytest.fixture
# def sample_category_response() -> CategoryResponse:
#     # Corrected: Pydantic expects 'user' due to alias, even if field is 'user_id'
#     # Also, CategoryResponse doesn't have 'icon' field.
#     return CategoryResponse(id=ObjectId(), name="Test Category", user=ObjectId(), color="#FFFFFF")
#
#
# @pytest.fixture
# def sample_time_window_response(sample_category_response: CategoryResponse) -> TimeWindowResponse:
#     return TimeWindowResponse(
#         id=ObjectId(),
#         name="Morning Focus",
#         start_time=540,  # 09:00
#         end_time=720,  # 12:00
#         category=sample_category_response,
#         user_id=ObjectId(),
#         day_template_id=ObjectId(),
#     )
#
#
# @pytest.fixture
# def sample_task_response(sample_category_response: CategoryResponse) -> TaskResponse:
#     now = datetime.now()
#     return TaskResponse(
#         id=ObjectId(),
#         title="Complete report",
#         priority=TaskPriority.HIGH,
#         status=TaskStatus.PENDING,
#         category=sample_category_response,
#         user_id=ObjectId(),
#         due_date=datetime(2024, 12, 31, 0, 0, 0),  # TaskResponse expects datetime
#         # estimated_time=120, # Not a field in TaskResponse
#         description="A detailed report needs to be completed.",
#         created_at=now,
#         updated_at=now,
#     )
#
#
# @pytest.fixture
# def sample_daily_plan_model(sample_user_id: ObjectId) -> DailyPlan:
#     plan_date = date(2024, 7, 20)
#     plan_datetime = datetime.combine(plan_date, time.min)
#     return DailyPlan(
#         id=ObjectId(),
#         user_id=sample_user_id,
#         plan_date=plan_datetime,
#         allocations=[
#             DailyPlanAllocation(time_window_id=ObjectId(), task_id=ObjectId()),
#             DailyPlanAllocation(time_window_id=ObjectId(), task_id=ObjectId()),
#         ],
#     )
#
#
# @pytest.fixture
# def sample_daily_plan_create_request() -> DailyPlanCreateRequest:
#     return DailyPlanCreateRequest(
#         plan_date=date(2024, 7, 21),
#         allocations=[
#             DailyPlanAllocationCreate(time_window_id=ObjectId(), task_id=ObjectId()),
#             DailyPlanAllocationCreate(time_window_id=ObjectId(), task_id=ObjectId()),
#         ],
#     )
#
#
# def test_to_allocation_response(sample_time_window_response: TimeWindowResponse, sample_task_response: TaskResponse):
#     result = DailyPlanMapper.to_allocation_response(
#         time_window_response=sample_time_window_response, task_response=sample_task_response
#     )
#
#     assert isinstance(result, DailyPlanAllocationResponse)
#     assert result.time_window == sample_time_window_response
#     assert result.task == sample_task_response
#
#
# def test_to_response(
#     sample_daily_plan_model: DailyPlan,
#     sample_time_window_response: TimeWindowResponse,
#     sample_task_response: TaskResponse,
# ):
#     populated_allocations = [
#         DailyPlanAllocationResponse(time_window=sample_time_window_response, task=sample_task_response)
#     ]
#     result = DailyPlanMapper.to_response(
#         daily_plan_model=sample_daily_plan_model, populated_allocations_responses=populated_allocations
#     )
#
#     assert isinstance(result, DailyPlanResponse)
#     assert result.id == sample_daily_plan_model.id
#     assert result.user_id == sample_daily_plan_model.user_id
#     assert result.plan_date == sample_daily_plan_model.plan_date.date()  # Ensure date conversion
#     assert result.allocations == populated_allocations
#     assert len(result.allocations) == 1
#
#
# def test_to_response_empty_allocations(sample_daily_plan_model: DailyPlan):
#     sample_daily_plan_model.allocations = []  # Ensure model has empty allocations for this test
#     result = DailyPlanMapper.to_response(daily_plan_model=sample_daily_plan_model, populated_allocations_responses=[])
#
#     assert isinstance(result, DailyPlanResponse)
#     assert result.id == sample_daily_plan_model.id
#     assert result.user_id == sample_daily_plan_model.user_id
#     assert result.plan_date == sample_daily_plan_model.plan_date.date()
#     assert result.allocations == []
#     assert len(result.allocations) == 0
#
#
# def test_to_model_for_create(sample_daily_plan_create_request: DailyPlanCreateRequest, sample_user_id: ObjectId):
#     result = DailyPlanMapper.to_model_for_create(schema=sample_daily_plan_create_request, user_id=sample_user_id)
#
#     assert isinstance(result, DailyPlan)
#     assert result.user_id == sample_user_id
#     expected_datetime = datetime.combine(sample_daily_plan_create_request.plan_date, time.min)
#     assert result.plan_date == expected_datetime
#     assert len(result.allocations) == len(sample_daily_plan_create_request.allocations)
#
#     for i, alloc_schema in enumerate(sample_daily_plan_create_request.allocations):
#         assert isinstance(result.allocations[i], DailyPlanAllocation)
#         assert result.allocations[i].time_window_id == alloc_schema.time_window_id
#         assert result.allocations[i].task_id == alloc_schema.task_id
#
#
# def test_to_model_for_create_empty_allocations(sample_user_id: ObjectId):
#     create_request_empty_allocs = DailyPlanCreateRequest(plan_date=date(2024, 8, 1), allocations=[])
#     result = DailyPlanMapper.to_model_for_create(schema=create_request_empty_allocs, user_id=sample_user_id)
#
#     assert isinstance(result, DailyPlan)
#     assert result.user_id == sample_user_id
#     expected_datetime = datetime.combine(create_request_empty_allocs.plan_date, time.min)
#     assert result.plan_date == expected_datetime
#     assert result.allocations == []
#     assert len(result.allocations) == 0
