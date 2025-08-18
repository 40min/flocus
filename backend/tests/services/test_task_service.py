from datetime import datetime, timedelta, timezone
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from odmantic import ObjectId

from app.api.schemas.task import TaskPriority, TaskResponse, TaskStatus, TaskUpdateRequest
from app.db.models.task import Task, TaskStatistics
from app.services.task_service import TaskService
from app.services.user_daily_stats_service import UserDailyStatsService


@pytest.fixture
def task_service():
    engine_mock = MagicMock()
    service = TaskService(engine=engine_mock)
    return service


def create_task_response(**kwargs):
    defaults = {
        "id": ObjectId(),
        "user_id": ObjectId(),
        "title": "Test Task",
        "created_at": datetime.now(timezone.utc),
        "updated_at": datetime.now(timezone.utc),
        "status": "pending",
    }
    defaults.update(kwargs)
    return TaskResponse(**defaults)


def test_sort_tasks_by_priority_asc(task_service: TaskService):
    tasks = [
        create_task_response(priority=TaskPriority.HIGH),
        create_task_response(priority=TaskPriority.LOW),
        create_task_response(priority=TaskPriority.URGENT),
        create_task_response(priority=None),
        create_task_response(priority=TaskPriority.MEDIUM),
    ]

    sorted_tasks = task_service._sort_tasks_by_priority(tasks, "asc")
    assert [t.priority for t in sorted_tasks] == [None, "low", "medium", "high", "urgent"]


def test_sort_tasks_by_priority_desc(task_service: TaskService):
    tasks = [
        create_task_response(priority=TaskPriority.HIGH),
        create_task_response(priority=TaskPriority.LOW),
        create_task_response(priority=TaskPriority.URGENT),
        create_task_response(priority=None),
        create_task_response(priority=TaskPriority.MEDIUM),
    ]

    sorted_tasks = task_service._sort_tasks_by_priority(tasks, "desc")
    assert [t.priority for t in sorted_tasks] == ["urgent", "high", "medium", "low", None]


def test_sort_tasks_by_due_date_asc(task_service: TaskService):
    now = datetime.now(timezone.utc)
    tasks = [
        create_task_response(title="Task 1", due_date=now + timedelta(days=1)),
        create_task_response(title="Task 2", due_date=None),
        create_task_response(title="Task 3", due_date=now - timedelta(days=1)),
    ]

    sorted_tasks = task_service._sort_tasks_by_due_date(tasks, "asc")
    assert [t.title for t in sorted_tasks] == ["Task 3", "Task 1", "Task 2"]


def test_sort_tasks_by_due_date_desc(task_service: TaskService):
    now = datetime.now(timezone.utc)
    tasks = [
        create_task_response(title="Task 1", due_date=now + timedelta(days=1)),
        create_task_response(title="Task 2", due_date=None),
        create_task_response(title="Task 3", due_date=now - timedelta(days=1)),
    ]

    sorted_tasks = task_service._sort_tasks_by_due_date(tasks, "desc")
    assert [t.title for t in sorted_tasks] == ["Task 1", "Task 3", "Task 2"]


@pytest.mark.asyncio
class TestTaskStatisticsCalculations:
    @pytest.fixture
    def user_id(self) -> ObjectId:
        return ObjectId()

    @pytest.fixture
    def mock_user_daily_stats_service(self):
        mock = MagicMock(spec=UserDailyStatsService)
        mock.increment_time = AsyncMock()
        return mock

    @pytest.fixture
    def task_service(self, mock_user_daily_stats_service) -> tuple[TaskService, MagicMock]:
        engine_mock = MagicMock()
        engine_mock.find_one = AsyncMock()
        engine_mock.save = AsyncMock(side_effect=lambda obj: obj)
        service = TaskService(engine=engine_mock, user_daily_stats_service=mock_user_daily_stats_service)
        return service, engine_mock

    @pytest.fixture
    def task(self, user_id: ObjectId) -> Task:
        # A fresh task in PENDING state with default statistics
        now = datetime.now(timezone.utc)
        return Task(
            id=ObjectId(),
            user_id=user_id,
            title="Test Task for Stats",
            status=TaskStatus.PENDING,
            statistics=TaskStatistics(),
            created_at=now,
            updated_at=now,
        )

    async def test_pending_to_in_progress_first_start(self, task_service, user_id: ObjectId, task: Task):
        service, engine_mock = task_service
        engine_mock.find_one.return_value = task

        time_now = datetime.now(timezone.utc)
        with patch("app.services.task_service.datetime") as mock_dt:
            mock_dt.now.return_value = time_now

            update_data = TaskUpdateRequest(status=TaskStatus.IN_PROGRESS)
            updated_task_response = await service.update_task(task.id, update_data, user_id)

        stats = updated_task_response.statistics
        assert stats.was_started_at is not None
        assert abs((stats.was_started_at - time_now).total_seconds()) < 1
        assert stats.was_taken_at is not None
        assert abs((stats.was_taken_at - time_now).total_seconds()) < 1
        assert stats.lasts_minutes == 0
        engine_mock.save.assert_called_once()

    async def test_in_progress_to_done_calculates_duration(self, task_service, user_id: ObjectId, task: Task):
        service, engine_mock = task_service
        start_time = datetime.now(timezone.utc) - timedelta(minutes=15)
        task.status = TaskStatus.IN_PROGRESS
        task.statistics = TaskStatistics(was_started_at=start_time, was_taken_at=start_time, lasts_minutes=0)
        engine_mock.find_one.return_value = task

        stop_time = datetime.now(timezone.utc)
        with patch("app.services.task_service.datetime") as mock_dt:
            mock_dt.now.return_value = stop_time

            update_data = TaskUpdateRequest(status=TaskStatus.DONE)
            updated_task_response = await service.update_task(task.id, update_data, user_id)

        stats = updated_task_response.statistics
        assert stats.was_stopped_at is not None
        assert abs((stats.was_stopped_at - stop_time).total_seconds()) < 1
        assert stats.lasts_minutes == 15
        engine_mock.save.assert_called_once()

    async def test_reopening_task_from_done_to_in_progress(self, task_service, user_id: ObjectId, task: Task):
        service, engine_mock = task_service
        first_start = datetime.now(timezone.utc) - timedelta(hours=1)
        first_stop = first_start + timedelta(minutes=20)
        task.status = TaskStatus.DONE
        task.statistics = TaskStatistics(
            was_started_at=first_start, was_taken_at=first_start, was_stopped_at=first_stop, lasts_minutes=20
        )
        engine_mock.find_one.return_value = task

        reopen_time = datetime.now(timezone.utc)
        with patch("app.services.task_service.datetime") as mock_dt:
            mock_dt.now.return_value = reopen_time

            update_data = TaskUpdateRequest(status=TaskStatus.IN_PROGRESS)
            updated_task_response = await service.update_task(task.id, update_data, user_id)

        stats = updated_task_response.statistics
        assert abs((stats.was_started_at - first_start).total_seconds()) < 1
        assert abs((stats.was_taken_at - reopen_time).total_seconds()) < 1
        assert abs((stats.was_stopped_at - first_stop).total_seconds()) < 1
        assert stats.lasts_minutes == 20
        engine_mock.save.assert_called_once()

    async def test_full_cycle_accumulates_duration(self, task_service, user_id: ObjectId, task: Task):
        service, engine_mock = task_service
        engine_mock.find_one.return_value = task  # task starts as PENDING

        # 1. PENDING -> IN_PROGRESS
        time1_start = datetime.now(timezone.utc)
        with patch("app.services.task_service.datetime") as mock_dt:
            mock_dt.now.return_value = time1_start
            await service.update_task(task.id, TaskUpdateRequest(status=TaskStatus.IN_PROGRESS), user_id)

        # 2. IN_PROGRESS -> PENDING (work for 30 mins)
        time2_stop = time1_start + timedelta(minutes=30)
        with patch("app.services.task_service.datetime") as mock_dt:
            mock_dt.now.return_value = time2_stop
            await service.update_task(task.id, TaskUpdateRequest(status=TaskStatus.PENDING), user_id)
        assert task.statistics.lasts_minutes == 30

        # 3. PENDING -> IN_PROGRESS (re-open)
        time3_restart = time2_stop + timedelta(hours=1)
        with patch("app.services.task_service.datetime") as mock_dt:
            mock_dt.now.return_value = time3_restart
            await service.update_task(task.id, TaskUpdateRequest(status=TaskStatus.IN_PROGRESS), user_id)
        assert task.statistics.lasts_minutes == 30  # Should not change on restart

        # 4. IN_PROGRESS -> DONE (work for 15 mins)
        time4_final_stop = time3_restart + timedelta(minutes=15)
        with patch("app.services.task_service.datetime") as mock_dt:
            mock_dt.now.return_value = time4_final_stop
            final_task_response = await service.update_task(task.id, TaskUpdateRequest(status=TaskStatus.DONE), user_id)

        stats = final_task_response.statistics
        assert abs((stats.was_started_at - time1_start).total_seconds()) < 1
        assert abs((stats.was_taken_at - time3_restart).total_seconds()) < 1
        assert abs((stats.was_stopped_at - time4_final_stop).total_seconds()) < 1
        assert stats.lasts_minutes == (30 + 15)
        assert engine_mock.save.call_count == 4

    async def test_no_status_change_does_not_affect_stats(self, task_service, user_id: ObjectId, task: Task):
        service, engine_mock = task_service
        initial_stats_dump = task.statistics.model_dump()
        engine_mock.find_one.return_value = task

        with patch("app.services.task_service.datetime") as mock_dt:
            mock_dt.now.return_value = datetime.now(timezone.utc) + timedelta(hours=1)

            update_data = TaskUpdateRequest()
            updated_task_response = await service.update_task(task.id, update_data, user_id)

        # Statistics should be identical
        assert updated_task_response.statistics.model_dump() == initial_stats_dump
        engine_mock.save.assert_called_once()

    async def test_update_from_in_progress_to_done_tracks_time(
        self, task_service, user_id, task: Task, mock_user_daily_stats_service: MagicMock
    ):
        service, engine_mock = task_service
        task.status = TaskStatus.IN_PROGRESS
        task.updated_at = datetime.now(timezone.utc) - timedelta(seconds=45)
        engine_mock.find_one.return_value = task

        update_data = TaskUpdateRequest(status=TaskStatus.DONE)

        time_now = datetime.now(timezone.utc)
        with patch("app.services.task_service.datetime") as mock_dt:
            mock_dt.now.return_value = time_now
            await service.update_task(task.id, update_data, user_id)

        mock_user_daily_stats_service.increment_time.assert_awaited_once()
        args, kwargs = mock_user_daily_stats_service.increment_time.call_args
        assert args[0] == user_id
        assert isinstance(args[1], int)
        # Check if the duration is approximately 45 seconds
        assert 44 < args[1] < 46

    async def test_update_from_pending_to_done_does_not_track_time(
        self, task_service, user_id, task: Task, mock_user_daily_stats_service: MagicMock
    ):
        service, engine_mock = task_service
        task.status = TaskStatus.PENDING
        task.updated_at = datetime.now(timezone.utc) - timedelta(minutes=10)
        engine_mock.find_one.return_value = task

        update_data = TaskUpdateRequest(status=TaskStatus.DONE)

        await service.update_task(task.id, update_data, user_id)

        mock_user_daily_stats_service.increment_time.assert_not_called()
