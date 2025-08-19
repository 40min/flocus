from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from odmantic import ObjectId

from app.api.schemas.task import TaskPriority, TaskStatus, TaskUpdateRequest
from app.db.models.task import Task, TaskStatistics
from app.services.task_service import TaskService
from app.services.user_daily_stats_service import UserDailyStatsService


@pytest.fixture
def user_id() -> ObjectId:
    return ObjectId()


@pytest.fixture
def mock_user_daily_stats_service():
    mock = MagicMock(spec=UserDailyStatsService)
    mock.increment_time = AsyncMock()
    return mock


@pytest.fixture
def task_service(mock_user_daily_stats_service) -> tuple[TaskService, MagicMock]:
    engine_mock = MagicMock()
    engine_mock.find_one = AsyncMock()
    engine_mock.save = AsyncMock(side_effect=lambda obj: obj)
    service = TaskService(engine=engine_mock, user_daily_stats_service=mock_user_daily_stats_service)
    return service, engine_mock


@pytest.fixture
def sample_task(user_id: ObjectId) -> Task:
    """Create a sample task for testing."""
    now = datetime.now(timezone.utc)
    return Task(
        id=ObjectId(),
        user_id=user_id,
        title="Test Task",
        status=TaskStatus.PENDING,
        statistics=TaskStatistics(lasts_minutes=30),  # Task already has 30 minutes
        created_at=now,
        updated_at=now,
    )


@pytest.mark.asyncio
class TestTaskServiceManualTimeAddition:
    """Test TaskService manual time addition logic with various scenarios."""

    async def test_add_manual_time_to_existing_task(self, task_service, user_id: ObjectId, sample_task: Task):
        """Test adding manual time to a task that already has working time."""
        service, engine_mock = task_service
        engine_mock.find_one.return_value = sample_task

        update_data = TaskUpdateRequest(add_lasts_minutes=15)
        updated_task = await service.update_task(sample_task.id, update_data, user_id)

        # Should add 15 minutes to existing 30 minutes
        assert updated_task.statistics.lasts_minutes == 45
        engine_mock.save.assert_called_once()

    async def test_add_manual_time_to_task_with_zero_time(self, task_service, user_id: ObjectId, sample_task: Task):
        """Test adding manual time to a task with zero working time."""
        service, engine_mock = task_service
        sample_task.statistics.lasts_minutes = 0
        engine_mock.find_one.return_value = sample_task

        update_data = TaskUpdateRequest(add_lasts_minutes=25)
        updated_task = await service.update_task(sample_task.id, update_data, user_id)

        assert updated_task.statistics.lasts_minutes == 25
        engine_mock.save.assert_called_once()

    async def test_add_zero_manual_time(self, task_service, user_id: ObjectId, sample_task: Task):
        """Test adding zero manual time (should not change existing time)."""
        service, engine_mock = task_service
        original_time = sample_task.statistics.lasts_minutes
        engine_mock.find_one.return_value = sample_task

        update_data = TaskUpdateRequest(add_lasts_minutes=0)
        updated_task = await service.update_task(sample_task.id, update_data, user_id)

        # Time should remain unchanged
        assert updated_task.statistics.lasts_minutes == original_time
        engine_mock.save.assert_called_once()

    async def test_add_large_manual_time(self, task_service, user_id: ObjectId, sample_task: Task):
        """Test adding large manual time value."""
        service, engine_mock = task_service
        engine_mock.find_one.return_value = sample_task

        update_data = TaskUpdateRequest(add_lasts_minutes=480)  # 8 hours
        updated_task = await service.update_task(sample_task.id, update_data, user_id)

        # Should add 480 minutes to existing 30 minutes
        assert updated_task.statistics.lasts_minutes == 510
        engine_mock.save.assert_called_once()

    async def test_manual_time_with_empty_statistics(self, task_service, user_id: ObjectId, sample_task: Task):
        """Test adding manual time to task with empty statistics."""
        service, engine_mock = task_service
        # Reset statistics to default empty state
        sample_task.statistics = TaskStatistics()
        engine_mock.find_one.return_value = sample_task

        update_data = TaskUpdateRequest(add_lasts_minutes=20)
        updated_task = await service.update_task(sample_task.id, update_data, user_id)

        # Should add time to empty statistics
        assert updated_task.statistics is not None
        assert updated_task.statistics.lasts_minutes == 20
        engine_mock.save.assert_called_once()

    async def test_manual_time_with_other_field_updates(self, task_service, user_id: ObjectId, sample_task: Task):
        """Test adding manual time along with other field updates."""
        service, engine_mock = task_service
        # Mock that no existing task with the new title exists
        engine_mock.find_one.side_effect = [
            sample_task,
            None,
        ]  # First call returns task, second returns None for title check

        update_data = TaskUpdateRequest(
            title="Updated Task Title",
            description="Updated description",
            priority=TaskPriority.HIGH,
            add_lasts_minutes=10,
        )
        updated_task = await service.update_task(sample_task.id, update_data, user_id)

        # All fields should be updated
        assert updated_task.title == "Updated Task Title"
        assert updated_task.description == "Updated description"
        assert updated_task.priority == TaskPriority.HIGH
        assert updated_task.statistics.lasts_minutes == 40  # 30 + 10
        engine_mock.save.assert_called_once()

    async def test_manual_time_with_status_change_to_in_progress(
        self, task_service, user_id: ObjectId, sample_task: Task
    ):
        """Test adding manual time while changing status to IN_PROGRESS."""
        service, engine_mock = task_service
        engine_mock.find_one.return_value = sample_task

        time_now = datetime.now(timezone.utc)
        with patch("app.services.task_service.datetime") as mock_dt:
            mock_dt.now.return_value = time_now

            update_data = TaskUpdateRequest(status=TaskStatus.IN_PROGRESS, add_lasts_minutes=15)
            updated_task = await service.update_task(sample_task.id, update_data, user_id)

        # Manual time should be added and status change should set timestamps
        assert updated_task.statistics.lasts_minutes == 45  # 30 + 15
        assert updated_task.status == TaskStatus.IN_PROGRESS
        assert updated_task.statistics.was_taken_at is not None
        engine_mock.save.assert_called_once()

    async def test_manual_time_with_status_change_from_in_progress(
        self, task_service, user_id: ObjectId, sample_task: Task
    ):
        """Test adding manual time while changing status from IN_PROGRESS to DONE."""
        service, engine_mock = task_service

        # Set up task as IN_PROGRESS
        start_time = datetime.now(timezone.utc) - timedelta(minutes=20)
        sample_task.status = TaskStatus.IN_PROGRESS
        sample_task.statistics.was_taken_at = start_time
        sample_task.updated_at = start_time
        engine_mock.find_one.return_value = sample_task

        stop_time = datetime.now(timezone.utc)
        with patch("app.services.task_service.datetime") as mock_dt:
            mock_dt.now.return_value = stop_time

            update_data = TaskUpdateRequest(status=TaskStatus.DONE, add_lasts_minutes=10)
            updated_task = await service.update_task(sample_task.id, update_data, user_id)

        # Manual time (10) + existing time (30) + timer duration (20) = 60 minutes
        assert updated_task.statistics.lasts_minutes == 60
        assert updated_task.status == TaskStatus.DONE
        assert updated_task.statistics.was_stopped_at is not None
        engine_mock.save.assert_called_once()

    async def test_none_add_lasts_minutes_does_not_affect_time(
        self, task_service, user_id: ObjectId, sample_task: Task
    ):
        """Test that None add_lasts_minutes does not change existing time."""
        service, engine_mock = task_service
        original_time = sample_task.statistics.lasts_minutes
        # Mock that no existing task with the new title exists
        engine_mock.find_one.side_effect = [
            sample_task,
            None,
        ]  # First call returns task, second returns None for title check

        update_data = TaskUpdateRequest(title="Another Updated Title")  # No add_lasts_minutes
        updated_task = await service.update_task(sample_task.id, update_data, user_id)

        assert updated_task.statistics.lasts_minutes == original_time
        assert updated_task.title == "Another Updated Title"
        engine_mock.save.assert_called_once()

    async def test_manual_time_accumulation_over_multiple_updates(
        self, task_service, user_id: ObjectId, sample_task: Task
    ):
        """Test that manual time accumulates correctly over multiple updates."""
        service, engine_mock = task_service
        engine_mock.find_one.return_value = sample_task

        # First update: add 10 minutes
        update_data1 = TaskUpdateRequest(add_lasts_minutes=10)
        await service.update_task(sample_task.id, update_data1, user_id)
        assert sample_task.statistics.lasts_minutes == 40  # 30 + 10

        # Second update: add 5 minutes
        update_data2 = TaskUpdateRequest(add_lasts_minutes=5)
        await service.update_task(sample_task.id, update_data2, user_id)
        assert sample_task.statistics.lasts_minutes == 45  # 40 + 5

        # Third update: add 15 minutes
        update_data3 = TaskUpdateRequest(add_lasts_minutes=15)
        updated_task = await service.update_task(sample_task.id, update_data3, user_id)
        assert updated_task.statistics.lasts_minutes == 60  # 45 + 15

        assert engine_mock.save.call_count == 3

    async def test_manual_time_with_timer_integration(
        self, task_service, user_id: ObjectId, sample_task: Task, mock_user_daily_stats_service
    ):
        """Test manual time addition works correctly with timer integration."""
        service, engine_mock = task_service

        # Start with task in IN_PROGRESS
        start_time = datetime.now(timezone.utc) - timedelta(minutes=30)
        sample_task.status = TaskStatus.IN_PROGRESS
        sample_task.statistics.was_taken_at = start_time
        sample_task.updated_at = start_time
        engine_mock.find_one.return_value = sample_task

        stop_time = datetime.now(timezone.utc)
        with patch("app.services.task_service.datetime") as mock_dt:
            mock_dt.now.return_value = stop_time

            # Add manual time while stopping the timer
            update_data = TaskUpdateRequest(status=TaskStatus.DONE, add_lasts_minutes=20)
            updated_task = await service.update_task(sample_task.id, update_data, user_id)

        # Manual time (20) + existing time (30) + timer duration (30) = 80 minutes
        assert updated_task.statistics.lasts_minutes == 80

        # Verify user daily stats was called for timer duration
        mock_user_daily_stats_service.increment_time.assert_called_once()
        args = mock_user_daily_stats_service.increment_time.call_args[0]
        assert args[0] == user_id
        # Timer duration should be ~30 minutes = 1800 seconds
        assert 1790 <= args[1] <= 1810

    async def test_manual_time_preserves_other_statistics(self, task_service, user_id: ObjectId, sample_task: Task):
        """Test that adding manual time preserves other statistics fields."""
        service, engine_mock = task_service

        # Set up task with existing statistics
        now = datetime.now(timezone.utc)
        sample_task.statistics.was_started_at = now - timedelta(hours=1)
        sample_task.statistics.was_taken_at = now - timedelta(minutes=30)
        sample_task.statistics.was_stopped_at = now - timedelta(minutes=10)
        engine_mock.find_one.return_value = sample_task

        update_data = TaskUpdateRequest(add_lasts_minutes=25)
        updated_task = await service.update_task(sample_task.id, update_data, user_id)

        # Manual time should be added
        assert updated_task.statistics.lasts_minutes == 55  # 30 + 25

        # Other statistics should be preserved
        assert updated_task.statistics.was_started_at == sample_task.statistics.was_started_at
        assert updated_task.statistics.was_taken_at == sample_task.statistics.was_taken_at
        assert updated_task.statistics.was_stopped_at == sample_task.statistics.was_stopped_at
        engine_mock.save.assert_called_once()
