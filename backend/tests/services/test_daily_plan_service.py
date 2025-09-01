from datetime import datetime, timezone
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from odmantic import ObjectId

from app.api.schemas.daily_plan import (
    CarryOverTimeWindowRequest,
    DailyPlanCreateRequest,
    DailyPlanResponse,
    DailyPlanUpdateRequest,
    PlanApprovalResponse,
    TimeWindowCreateRequest,
)
from app.api.schemas.task import TaskStatus
from app.db.models.category import Category
from app.db.models.daily_plan import DailyPlan, SelfReflection, TimeWindow
from app.db.models.task import Task
from app.mappers.task_mapper import TaskMapper
from app.services.category_service import CategoryService
from app.services.daily_plan_service import DailyPlanService
from app.services.task_service import TaskService


@pytest.fixture
def mock_engine():
    """Mock database engine."""
    engine = MagicMock()
    engine.find_one = AsyncMock()
    engine.save = AsyncMock()
    engine.find = AsyncMock()
    return engine


@pytest.fixture
def mock_task_service():
    """Mock task service."""
    return MagicMock(spec=TaskService)


@pytest.fixture
def mock_task_mapper():
    """Mock task mapper."""
    return MagicMock(spec=TaskMapper)


@pytest.fixture
def mock_category_service():
    """Mock category service."""
    return MagicMock(spec=CategoryService)


@pytest.fixture
def daily_plan_service(mock_engine, mock_task_service, mock_task_mapper, mock_category_service):
    """Create DailyPlanService with mocked dependencies."""
    service = DailyPlanService(
        engine=mock_engine,
        task_service=mock_task_service,
        task_mapper=mock_task_mapper,
        category_service=mock_category_service,
    )
    return service


@pytest.fixture
def sample_user_id():
    """Sample user ID for tests."""
    return ObjectId()


@pytest.fixture
def sample_category_id():
    """Sample category ID for tests."""
    return ObjectId()


@pytest.fixture
def sample_task_ids():
    """Sample task IDs for tests."""
    return [ObjectId(), ObjectId(), ObjectId()]


@pytest.fixture
def sample_daily_plan(sample_user_id, sample_category_id, sample_task_ids):
    """Sample daily plan for tests."""
    plan_date = datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc)
    return DailyPlan(
        id=ObjectId(),
        plan_date=plan_date,
        user_id=sample_user_id,
        time_windows=[
            TimeWindow(
                description="Morning tasks",
                category_id=sample_category_id,
                start_time=480,  # 8:00 AM
                end_time=600,  # 10:00 AM
                task_ids=sample_task_ids[:2],
            ),
            TimeWindow(
                description="Afternoon tasks",
                category_id=sample_category_id,
                start_time=780,  # 1:00 PM
                end_time=900,  # 3:00 PM
                task_ids=sample_task_ids[2:],
            ),
        ],
        self_reflection=SelfReflection(positive=None, negative=None, follow_up_notes=None),
        reviewed=False,
    )


@pytest.fixture
def sample_tasks(sample_user_id, sample_category_id, sample_task_ids):
    """Sample tasks for tests."""
    return [
        Task(
            id=sample_task_ids[0],
            user_id=sample_user_id,
            title="Task 1",
            status=TaskStatus.PENDING,
            category_id=sample_category_id,
        ),
        Task(
            id=sample_task_ids[1],
            user_id=sample_user_id,
            title="Task 2",
            status=TaskStatus.DONE,
            category_id=sample_category_id,
        ),
        Task(
            id=sample_task_ids[2],
            user_id=sample_user_id,
            title="Task 3",
            status=TaskStatus.IN_PROGRESS,
            category_id=sample_category_id,
        ),
    ]


@pytest.fixture
def sample_category(sample_user_id, sample_category_id):
    """Sample category for tests."""
    return Category(
        id=sample_category_id,
        user=sample_user_id,
        name="Work",
        description="Work-related tasks",
        color="#FF0000",
    )


class TestDailyPlanService:
    """Test suite for DailyPlanService."""

    @pytest.mark.asyncio
    async def test_create_daily_plan_sets_reviewed_false(
        self, daily_plan_service, mock_engine, sample_user_id, sample_category_id
    ):
        """Test that create_daily_plan always sets reviewed to False."""
        # Setup
        plan_data = DailyPlanCreateRequest(
            plan_date=datetime(2024, 1, 1, tzinfo=timezone.utc),
            time_windows=[
                TimeWindowCreateRequest(
                    category_id=sample_category_id,
                    start_time=480,
                    end_time=600,
                    task_ids=[],
                )
            ],
        )

        mock_engine.find_one.return_value = None  # No existing plan
        mock_engine.save = AsyncMock()

        # Mock the validation methods
        daily_plan_service._validate_time_window_categories = AsyncMock()
        daily_plan_service._validate_task_categories_for_time_windows = AsyncMock()
        daily_plan_service._map_plan_to_response = AsyncMock(return_value=MagicMock(spec=DailyPlanResponse))

        # Execute
        await daily_plan_service.create_daily_plan(plan_data, sample_user_id)

        # Verify
        saved_plan = mock_engine.save.call_args[0][0]
        assert saved_plan.reviewed is False

    @pytest.mark.asyncio
    async def test_update_daily_plan_resets_reviewed_flag(
        self, daily_plan_service, mock_engine, sample_user_id, sample_daily_plan
    ):
        """Test that update_daily_plan resets reviewed flag to False when not approving."""
        # Setup
        sample_daily_plan.reviewed = True  # Start as reviewed
        mock_engine.find_one.return_value = sample_daily_plan
        mock_engine.save = AsyncMock()
        daily_plan_service._map_plan_to_response = AsyncMock(return_value=MagicMock(spec=DailyPlanResponse))

        update_data = DailyPlanUpdateRequest()

        # Execute
        await daily_plan_service.update_daily_plan(sample_daily_plan.id, update_data, sample_user_id)

        # Verify
        assert sample_daily_plan.reviewed is False

    @pytest.mark.asyncio
    async def test_update_daily_plan_preserves_reviewed_flag_when_approving(
        self, daily_plan_service, mock_engine, sample_user_id, sample_daily_plan
    ):
        """Test that update_daily_plan preserves reviewed flag when approving."""
        # Setup
        sample_daily_plan.reviewed = False  # Start as not reviewed
        mock_engine.find_one.return_value = sample_daily_plan
        mock_engine.save = AsyncMock()
        daily_plan_service._map_plan_to_response = AsyncMock(return_value=MagicMock(spec=DailyPlanResponse))

        update_data = DailyPlanUpdateRequest()

        # Execute
        await daily_plan_service.update_daily_plan(sample_daily_plan.id, update_data, sample_user_id, approve=True)

        # Verify
        assert sample_daily_plan.reviewed is False  # Should remain False since we're not actually approving

    @pytest.mark.asyncio
    async def test_approve_daily_plan_sets_reviewed_true(
        self, daily_plan_service, mock_engine, sample_user_id, sample_daily_plan
    ):
        """Test that approve_daily_plan sets reviewed to True when successful."""
        # Setup
        sample_daily_plan.reviewed = False
        mock_engine.find_one.return_value = sample_daily_plan
        mock_engine.save = AsyncMock()
        daily_plan_service._map_plan_to_response = AsyncMock(return_value=MagicMock(spec=DailyPlanResponse))

        # Mock merge/validation to return no conflicts
        daily_plan_service._process_and_validate_time_windows = MagicMock(return_value=([], [], []))

        # Execute
        result = await daily_plan_service.approve_daily_plan(sample_daily_plan.id, sample_user_id)

        # Verify
        assert sample_daily_plan.reviewed is True
        assert isinstance(result, PlanApprovalResponse)

    @pytest.mark.asyncio
    async def test_approve_daily_plan_fails_if_already_reviewed(
        self, daily_plan_service, mock_engine, sample_user_id, sample_daily_plan
    ):
        """Test that approve_daily_plan fails if plan is already reviewed."""
        # Setup
        sample_daily_plan.reviewed = True
        mock_engine.find_one.return_value = sample_daily_plan

        # Execute & Verify
        with pytest.raises(HTTPException) as exc_info:
            await daily_plan_service.approve_daily_plan(sample_daily_plan.id, sample_user_id)

        assert exc_info.value.status_code == 409
        assert "already reviewed" in str(exc_info.value.detail)


class TestCarryOverTimeWindow:
    """Test suite for carry_over_time_window functionality."""

    @pytest.mark.asyncio
    async def test_carry_over_successful_scenario(
        self,
        daily_plan_service,
        mock_engine,
        mock_task_service,
        sample_user_id,
        sample_category_id,
        sample_task_ids,
        sample_tasks,
    ):
        """Test successful carry-over of time window with unfinished tasks."""
        # Setup source plan
        source_plan = DailyPlan(
            id=ObjectId(),
            plan_date=datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
            user_id=sample_user_id,
            time_windows=[
                TimeWindow(
                    description="Morning tasks",
                    category_id=sample_category_id,
                    start_time=480,
                    end_time=600,
                    task_ids=sample_task_ids,
                )
            ],
            self_reflection=SelfReflection(),
            reviewed=False,
        )

        # Setup target date
        target_date = datetime(2025, 12, 31).date()

        # Mock database calls
        mock_engine.find_one.side_effect = [source_plan, None]  # Source exists, target doesn't
        mock_engine.save = AsyncMock()

        # Mock task service to return tasks with mixed status
        mock_task_service.get_tasks_by_ids = AsyncMock(return_value=sample_tasks)

        # Mock response mapping
        daily_plan_service._map_plan_to_response = AsyncMock(return_value=MagicMock(spec=DailyPlanResponse))

        # Create carry-over request
        time_window_id = f"{sample_category_id}_480_600"
        request = CarryOverTimeWindowRequest(
            source_plan_id=source_plan.id,
            time_window_id=time_window_id,
            target_date=target_date,
        )

        # Execute
        result = await daily_plan_service.carry_over_time_window(request, sample_user_id)

        # Verify
        assert isinstance(result, DailyPlanResponse)

        # Check that target plan was created and saved
        assert mock_engine.save.call_count == 2  # Source and target plans

        # Verify target plan has only unfinished tasks (Task 1 and Task 3)
        target_plan_call = mock_engine.save.call_args_list[0][0][0]  # First save call
        assert len(target_plan_call.time_windows) == 1
        assert len(target_plan_call.time_windows[0].task_ids) == 2  # Only unfinished tasks
        assert sample_task_ids[0] in target_plan_call.time_windows[0].task_ids  # Task 1 (PENDING)
        assert sample_task_ids[2] in target_plan_call.time_windows[0].task_ids  # Task 3 (IN_PROGRESS)
        assert sample_task_ids[1] not in target_plan_call.time_windows[0].task_ids  # Task 2 (DONE) excluded

        # Verify target plan is marked as requiring review
        assert target_plan_call.reviewed is False

    @pytest.mark.asyncio
    async def test_carry_over_to_existing_target_plan(
        self,
        daily_plan_service,
        mock_engine,
        mock_task_service,
        sample_user_id,
        sample_category_id,
        sample_task_ids,
        sample_tasks,
    ):
        """Test carry-over when target plan already exists."""
        # Setup source plan
        source_plan = DailyPlan(
            id=ObjectId(),
            plan_date=datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
            user_id=sample_user_id,
            time_windows=[
                TimeWindow(
                    description="Morning tasks",
                    category_id=sample_category_id,
                    start_time=480,
                    end_time=600,
                    task_ids=sample_task_ids[:1],  # Only one task
                )
            ],
            self_reflection=SelfReflection(),
            reviewed=False,
        )

        # Setup existing target plan
        target_plan = DailyPlan(
            id=ObjectId(),
            plan_date=datetime(2024, 1, 2, 0, 0, 0, tzinfo=timezone.utc),
            user_id=sample_user_id,
            time_windows=[],  # Empty initially
            self_reflection=SelfReflection(),
            reviewed=True,  # Already reviewed
        )

        # Setup target date
        target_date = datetime(2025, 12, 31).date()

        # Mock database calls
        mock_engine.find_one.side_effect = [source_plan, target_plan]
        mock_engine.save = AsyncMock()

        # Mock task service
        mock_task_service.get_tasks_by_ids = AsyncMock(return_value=[sample_tasks[0]])  # Only unfinished task

        # Mock response mapping
        daily_plan_service._map_plan_to_response = AsyncMock(return_value=MagicMock(spec=DailyPlanResponse))

        # Create carry-over request
        time_window_id = f"{sample_category_id}_480_600"
        request = CarryOverTimeWindowRequest(
            source_plan_id=source_plan.id,
            time_window_id=time_window_id,
            target_date=target_date,
        )

        # Execute
        result = await daily_plan_service.carry_over_time_window(request, sample_user_id)

        # Verify
        assert isinstance(result, DailyPlanResponse)

        # Check that target plan was updated and saved
        assert mock_engine.save.call_count == 2  # Source and target plans

        # Verify target plan now has the carried-over time window
        target_plan_call = mock_engine.save.call_args_list[0][0][0]
        assert len(target_plan_call.time_windows) == 1
        assert target_plan_call.time_windows[0].task_ids == sample_task_ids[:1]

        # Verify target plan is marked as requiring review (should be reset)
        assert target_plan_call.reviewed is False

    @pytest.mark.asyncio
    async def test_carry_over_source_plan_not_found(self, daily_plan_service, mock_engine, sample_user_id):
        """Test carry-over fails when source plan is not found."""
        # Setup
        mock_engine.find_one.return_value = None

        request = CarryOverTimeWindowRequest(
            source_plan_id=ObjectId(),
            time_window_id="some_id",
            target_date=datetime(2025, 12, 31).date(),
        )

        # Execute & Verify
        with pytest.raises(HTTPException) as exc_info:
            await daily_plan_service.carry_over_time_window(request, sample_user_id)

        assert exc_info.value.status_code == 404
        assert "Source daily plan not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_carry_over_time_window_not_found(
        self, daily_plan_service, mock_engine, sample_user_id, sample_category_id
    ):
        """Test carry-over fails when time window is not found in source plan."""
        # Setup source plan with different time window
        source_plan = DailyPlan(
            id=ObjectId(),
            plan_date=datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
            user_id=sample_user_id,
            time_windows=[
                TimeWindow(
                    description="Different time window",
                    category_id=sample_category_id,
                    start_time=720,  # Different time
                    end_time=840,
                    task_ids=[],
                )
            ],
            self_reflection=SelfReflection(),
            reviewed=False,
        )

        mock_engine.find_one.return_value = source_plan

        # Request for non-existent time window
        request = CarryOverTimeWindowRequest(
            source_plan_id=source_plan.id,
            time_window_id=f"{sample_category_id}_480_600",  # Different time window
            target_date=datetime(2025, 12, 31).date(),
        )

        # Execute & Verify
        with pytest.raises(HTTPException) as exc_info:
            await daily_plan_service.carry_over_time_window(request, sample_user_id)

        assert exc_info.value.status_code == 404
        assert "Time window not found" in str(exc_info.value.detail)

    @pytest.mark.asyncio
    async def test_carry_over_filters_completed_tasks_only(
        self, daily_plan_service, mock_engine, mock_task_service, sample_user_id, sample_category_id, sample_task_ids
    ):
        """Test that only unfinished tasks are carried over."""
        # Setup source plan
        source_plan = DailyPlan(
            id=ObjectId(),
            plan_date=datetime(2024, 1, 1, 0, 0, 0, tzinfo=timezone.utc),
            user_id=sample_user_id,
            time_windows=[
                TimeWindow(
                    description="Tasks to carry over",
                    category_id=sample_category_id,
                    start_time=480,
                    end_time=600,
                    task_ids=sample_task_ids,
                )
            ],
            self_reflection=SelfReflection(),
            reviewed=False,
        )

        # Setup tasks - all completed
        completed_tasks = [
            Task(
                id=task_id,
                user_id=sample_user_id,
                title=f"Task {i}",
                status=TaskStatus.DONE,
                category_id=sample_category_id,
            )
            for i, task_id in enumerate(sample_task_ids)
        ]

        # Mock database calls
        mock_engine.find_one.side_effect = [source_plan, None]
        mock_engine.save = AsyncMock()

        # Mock task service to return all completed tasks
        mock_task_service.get_tasks_by_ids = AsyncMock(return_value=completed_tasks)

        # Mock response mapping
        daily_plan_service._map_plan_to_response = AsyncMock(return_value=MagicMock(spec=DailyPlanResponse))

        # Create carry-over request
        time_window_id = f"{sample_category_id}_480_600"
        request = CarryOverTimeWindowRequest(
            source_plan_id=source_plan.id,
            time_window_id=time_window_id,
            target_date=datetime(2025, 12, 31).date(),
        )

        # Execute
        result = await daily_plan_service.carry_over_time_window(request, sample_user_id)

        # Verify
        assert isinstance(result, DailyPlanResponse)

        # Check that target plan has no tasks (all were completed)
        target_plan_call = mock_engine.save.call_args_list[0][0][0]
        assert len(target_plan_call.time_windows) == 1
        assert len(target_plan_call.time_windows[0].task_ids) == 0  # No unfinished tasks


class TestMergeAndValidationLogic:
    """Test suite for time window merge and validation logic."""

    def test_process_and_validate_no_time_windows(self, daily_plan_service):
        """Test processing empty time windows list."""
        result = daily_plan_service._process_and_validate_time_windows([])
        assert result == ([], [], [])

    def test_merge_overlapping_same_category_basic(self, daily_plan_service, sample_category_id):
        """Test basic merging of overlapping same-category time windows."""
        time_windows = [
            TimeWindow(
                description="Window 1",
                category_id=sample_category_id,
                start_time=480,  # 8:00
                end_time=600,  # 10:00
                task_ids=[ObjectId()],
            ),
            TimeWindow(
                description="Window 2",
                category_id=sample_category_id,
                start_time=540,  # 9:00 (overlaps)
                end_time=660,  # 11:00
                task_ids=[ObjectId()],
            ),
        ]

        merged, details, conflicts = daily_plan_service._process_and_validate_time_windows(time_windows)

        # Should merge into one window
        assert len(merged) == 1
        assert merged[0].start_time == 480  # Min start
        assert merged[0].end_time == 660  # Max end
        assert len(merged[0].task_ids) == 2  # Combined tasks
        assert len(details) == 1
        assert "Merged overlapping time windows" in details[0]
        assert len(conflicts) == 0

    def test_merge_adjacent_same_category(self, daily_plan_service, sample_category_id):
        """Test merging of adjacent (touching) same-category time windows."""
        time_windows = [
            TimeWindow(
                description="Morning",
                category_id=sample_category_id,
                start_time=480,  # 8:00
                end_time=600,  # 10:00
                task_ids=[ObjectId()],
            ),
            TimeWindow(
                description="Late morning",
                category_id=sample_category_id,
                start_time=600,  # 10:00 (adjacent)
                end_time=720,  # 12:00
                task_ids=[ObjectId()],
            ),
        ]

        merged, details, conflicts = daily_plan_service._process_and_validate_time_windows(time_windows)

        # Should merge into one window
        assert len(merged) == 1
        assert merged[0].start_time == 480
        assert merged[0].end_time == 720
        assert len(details) == 1
        assert len(conflicts) == 0

    def test_no_merge_different_categories(self, daily_plan_service, sample_category_id):
        """Test that different-category time windows are not merged."""
        category_id_2 = ObjectId()
        time_windows = [
            TimeWindow(
                description="Work",
                category_id=sample_category_id,
                start_time=480,
                end_time=600,
                task_ids=[ObjectId()],
            ),
            TimeWindow(
                description="Personal",
                category_id=category_id_2,
                start_time=540,  # Overlaps
                end_time=660,
                task_ids=[ObjectId()],
            ),
        ]

        merged, details, conflicts = daily_plan_service._process_and_validate_time_windows(time_windows)

        # Should not merge, but detect conflict
        assert len(merged) == 2  # Both windows preserved
        assert len(details) == 0  # No merges
        assert len(conflicts) == 1
        assert "overlap" in conflicts[0].lower()

    def test_detect_conflicts_different_categories(self, daily_plan_service, sample_category_id):
        """Test conflict detection for overlapping different-category windows."""
        category_id_2 = ObjectId()
        time_windows = [
            TimeWindow(
                description="Work morning",
                category_id=sample_category_id,
                start_time=480,  # 8:00
                end_time=600,  # 10:00
                task_ids=[],
            ),
            TimeWindow(
                description="Personal time",
                category_id=category_id_2,
                start_time=540,  # 9:00 (overlaps)
                end_time=660,  # 11:00
                task_ids=[],
            ),
            TimeWindow(
                description="Work afternoon",
                category_id=sample_category_id,
                start_time=720,  # 12:00 (no overlap)
                end_time=840,  # 2:00
                task_ids=[],
            ),
        ]

        merged, details, conflicts = daily_plan_service._process_and_validate_time_windows(time_windows)

        # Should detect one conflict
        assert len(conflicts) == 1
        assert "08:00-10:00" in conflicts[0]
        assert "09:00-11:00" in conflicts[0]

    def test_merge_multiple_overlapping_windows(self, daily_plan_service, sample_category_id):
        """Test merging multiple overlapping same-category windows."""
        time_windows = [
            TimeWindow(
                description="Early morning",
                category_id=sample_category_id,
                start_time=420,  # 7:00
                end_time=540,  # 9:00
                task_ids=[ObjectId()],
            ),
            TimeWindow(
                description="Mid morning",
                category_id=sample_category_id,
                start_time=480,  # 8:00
                end_time=600,  # 10:00
                task_ids=[ObjectId()],
            ),
            TimeWindow(
                description="Late morning",
                category_id=sample_category_id,
                start_time=540,  # 9:00
                end_time=660,  # 11:00
                task_ids=[ObjectId()],
            ),
        ]

        merged, details, conflicts = daily_plan_service._process_and_validate_time_windows(time_windows)

        # Should merge all three into one
        assert len(merged) == 1
        assert merged[0].start_time == 420  # Earliest start
        assert merged[0].end_time == 660  # Latest end
        assert len(merged[0].task_ids) == 3  # All tasks combined
        assert len(details) == 2  # Two merge operations
        assert len(conflicts) == 0

    def test_windows_overlap_edge_cases(self, daily_plan_service):
        """Test edge cases for window overlap detection."""
        # Same start time
        window1 = TimeWindow(description="", category_id=ObjectId(), start_time=480, end_time=600, task_ids=[])
        window2 = TimeWindow(description="", category_id=ObjectId(), start_time=480, end_time=540, task_ids=[])

        assert daily_plan_service._windows_overlap(window1, window2) is True

        # Same end time
        window3 = TimeWindow(description="", category_id=ObjectId(), start_time=420, end_time=480, task_ids=[])
        assert daily_plan_service._windows_overlap(window1, window3) is False

        # Touching but not overlapping
        window4 = TimeWindow(description="", category_id=ObjectId(), start_time=600, end_time=720, task_ids=[])
        assert daily_plan_service._windows_overlap(window1, window4) is False

        # Completely separate
        window5 = TimeWindow(description="", category_id=ObjectId(), start_time=720, end_time=840, task_ids=[])
        assert daily_plan_service._windows_overlap(window1, window5) is False

    def test_merge_preserves_all_tasks(self, daily_plan_service, sample_category_id):
        """Test that merging preserves all tasks from overlapping windows."""
        task_ids_1 = [ObjectId(), ObjectId()]
        task_ids_2 = [ObjectId(), ObjectId(), ObjectId()]

        time_windows = [
            TimeWindow(
                description="Window 1",
                category_id=sample_category_id,
                start_time=480,
                end_time=600,
                task_ids=task_ids_1,
            ),
            TimeWindow(
                description="Window 2",
                category_id=sample_category_id,
                start_time=540,
                end_time=660,
                task_ids=task_ids_2,
            ),
        ]

        merged, details, conflicts = daily_plan_service._process_and_validate_time_windows(time_windows)

        # Should have all 5 tasks (no duplicates removed in this simple case)
        assert len(merged) == 1
        assert len(merged[0].task_ids) == 5
        # Check that all original task IDs are present
        for task_id in task_ids_1 + task_ids_2:
            assert task_id in merged[0].task_ids

    def test_merge_combines_descriptions(self, daily_plan_service, sample_category_id):
        """Test that merging combines descriptions appropriately."""
        time_windows = [
            TimeWindow(
                description="Morning work",
                category_id=sample_category_id,
                start_time=480,
                end_time=600,
                task_ids=[],
            ),
            TimeWindow(
                description="Afternoon work",
                category_id=sample_category_id,
                start_time=540,
                end_time=660,
                task_ids=[],
            ),
        ]

        merged, details, conflicts = daily_plan_service._process_and_validate_time_windows(time_windows)

        assert len(merged) == 1
        assert merged[0].description == "Morning work; Afternoon work"

    def test_merge_handles_none_descriptions(self, daily_plan_service, sample_category_id):
        """Test merging when some windows have None descriptions."""
        time_windows = [
            TimeWindow(
                description=None,
                category_id=sample_category_id,
                start_time=480,
                end_time=600,
                task_ids=[],
            ),
            TimeWindow(
                description="Afternoon work",
                category_id=sample_category_id,
                start_time=540,
                end_time=660,
                task_ids=[],
            ),
        ]

        merged, details, conflicts = daily_plan_service._process_and_validate_time_windows(time_windows)

        assert len(merged) == 1
        assert merged[0].description == "Afternoon work"
