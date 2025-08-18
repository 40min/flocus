from datetime import datetime, timedelta, timezone

import pytest
from odmantic import ObjectId

from app.api.schemas.task import TaskResponse, TaskStatisticsSchema, _serialize_datetime_to_iso_z


def test_serialize_datetime_to_iso_z_naive_datetime():
    """Test with a naive datetime object (assumed UTC)."""
    dt_naive = datetime(2023, 10, 26, 10, 30, 15, 123456)
    expected_iso_z = "2023-10-26T10:30:15.123Z"
    assert _serialize_datetime_to_iso_z(dt_naive) == expected_iso_z


def test_serialize_datetime_to_iso_z_aware_datetime_utc():
    """Test with a timezone-aware datetime object already in UTC."""
    dt_aware_utc = datetime(2023, 10, 26, 10, 30, 15, 123456, tzinfo=timezone.utc)
    expected_iso_z = "2023-10-26T10:30:15.123Z"
    assert _serialize_datetime_to_iso_z(dt_aware_utc) == expected_iso_z


def test_serialize_datetime_to_iso_z_aware_datetime_non_utc():
    """Test with a timezone-aware datetime object in a non-UTC timezone."""
    # Example: UTC+2
    dt_aware_non_utc = datetime(2023, 10, 26, 12, 30, 15, 123456, tzinfo=timezone(timedelta(hours=2)))
    # Expected: 2023-10-26T10:30:15.123Z (converted to UTC)
    expected_iso_z = "2023-10-26T10:30:15.123Z"
    assert _serialize_datetime_to_iso_z(dt_aware_non_utc) == expected_iso_z


def test_serialize_datetime_to_iso_z_microseconds_boundary_zero():
    """Test with microseconds at zero."""
    dt_naive = datetime(2023, 10, 26, 10, 30, 15, 0)
    expected_iso_z = "2023-10-26T10:30:15.000Z"
    assert _serialize_datetime_to_iso_z(dt_naive) == expected_iso_z


def test_serialize_datetime_to_iso_z_microseconds_boundary_max():
    """Test with microseconds at maximum (999999)."""
    dt_naive = datetime(2023, 10, 26, 10, 30, 15, 999999)
    # .999999 should be rounded/truncated to .999Z
    expected_iso_z = "2023-10-26T10:30:15.999Z"
    assert _serialize_datetime_to_iso_z(dt_naive) == expected_iso_z


def test_serialize_datetime_to_iso_z_different_dates():
    """Test with different dates to ensure general applicability."""
    dt_naive_1 = datetime(2000, 1, 1, 0, 0, 0, 1000)
    expected_iso_z_1 = "2000-01-01T00:00:00.001Z"
    assert _serialize_datetime_to_iso_z(dt_naive_1) == expected_iso_z_1

    dt_aware_utc_2 = datetime(1995, 5, 23, 23, 59, 59, 999000, tzinfo=timezone.utc)
    expected_iso_z_2 = "1995-05-23T23:59:59.999Z"
    assert _serialize_datetime_to_iso_z(dt_aware_utc_2) == expected_iso_z_2


@pytest.mark.parametrize(
    "dt_input, expected_output",
    [
        (datetime(2024, 6, 4, 12, 0, 0, 0), "2024-06-04T12:00:00.000Z"),
        (datetime(2024, 6, 4, 12, 0, 0, 123000, tzinfo=timezone.utc), "2024-06-04T12:00:00.123Z"),
        (
            datetime(2024, 6, 4, 10, 0, 0, 456000, tzinfo=timezone(timedelta(hours=-2))),
            "2024-06-04T12:00:00.456Z",
        ),  # UTC-2 to UTC
        (
            datetime(2024, 6, 4, 14, 0, 0, 789000, tzinfo=timezone(timedelta(hours=2))),
            "2024-06-04T12:00:00.789Z",
        ),  # UTC+2 to UTC
    ],
)
def test_serialize_datetime_to_iso_z_parametrized(dt_input, expected_output):
    """Parametrized test for various datetime inputs."""
    assert _serialize_datetime_to_iso_z(dt_input) == expected_output


# Test TaskResponse and TaskStatisticsSchema to ensure the encoder is applied
def test_task_response_serialization():
    """Test that TaskResponse correctly serializes datetime fields."""
    now = datetime.now(timezone.utc)
    task_data = {
        "id": ObjectId(),
        "user_id": ObjectId(),
        "title": "Test Task",
        "description": "Test Description",
        "status": "pending",
        "priority": "medium",
        "due_date": now + timedelta(days=1),
        "category_id": ObjectId(),
        "is_deleted": False,
        "created_at": now - timedelta(hours=1),
        "updated_at": now,
        "statistics": {
            "was_started_at": now - timedelta(minutes=30),
            "was_taken_at": now - timedelta(minutes=20),
            "was_stopped_at": now - timedelta(minutes=10),
            "lasts_min": 20,
        },
    }
    task_response = TaskResponse(**task_data)
    json_output = task_response.model_dump_json()

    # Check a few key datetime fields
    assert f'"due_date":"{_serialize_datetime_to_iso_z(task_data["due_date"])}"' in json_output
    assert f'"created_at":"{_serialize_datetime_to_iso_z(task_data["created_at"])}"' in json_output
    assert f'"updated_at":"{_serialize_datetime_to_iso_z(task_data["updated_at"])}"' in json_output
    assert (
        f'"was_started_at":"{_serialize_datetime_to_iso_z(task_data["statistics"]["was_started_at"])}"' in json_output
    )
    assert f'"was_taken_at":"{_serialize_datetime_to_iso_z(task_data["statistics"]["was_taken_at"])}"' in json_output
    assert (
        f'"was_stopped_at":"{_serialize_datetime_to_iso_z(task_data["statistics"]["was_stopped_at"])}"' in json_output
    )


def test_task_statistics_schema_serialization_with_none():
    """Test TaskStatisticsSchema with None values for datetimes."""
    stats_data = {
        "was_started_at": None,
        "was_taken_at": None,
        "was_stopped_at": None,
        "lasts_min": 0,
    }
    stats_schema = TaskStatisticsSchema(**stats_data)
    json_output = stats_schema.model_dump_json()

    assert '"was_started_at":null' in json_output
    assert '"was_taken_at":null' in json_output
    assert '"was_stopped_at":null' in json_output
    assert '"lasts_minutes":0' in json_output


def test_task_response_serialization_with_none_datetimes():
    """Test TaskResponse with None values for optional datetime fields."""
    now = datetime.now(timezone.utc)
    task_data = {
        "id": ObjectId(),
        "user_id": ObjectId(),
        "title": "Test Task No Dates",
        "status": "pending",
        "priority": "medium",
        "due_date": None,  # Optional field
        "created_at": now,  # Required
        "updated_at": now,  # Required
        "statistics": None,  # Optional field
    }
    task_response = TaskResponse(**task_data)
    json_output = task_response.model_dump_json()

    assert '"due_date":null' in json_output
    assert f'"created_at":"{_serialize_datetime_to_iso_z(now)}"' in json_output
    assert f'"updated_at":"{_serialize_datetime_to_iso_z(now)}"' in json_output
    assert '"statistics":null' in json_output
