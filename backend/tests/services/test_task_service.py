from datetime import datetime, timedelta, timezone
from unittest.mock import MagicMock

import pytest
from odmantic import ObjectId

from app.api.schemas.task import TaskPriority, TaskResponse
from app.services.task_service import TaskService


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
