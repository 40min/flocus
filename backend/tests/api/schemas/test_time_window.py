import pytest
from odmantic import ObjectId
from pydantic import ValidationError

from app.api.schemas.time_window import TimeWindowCreateRequest, TimeWindowUpdateRequest


@pytest.fixture
def user_id() -> ObjectId:
    return ObjectId()


@pytest.fixture
def category_id() -> ObjectId:
    return ObjectId()


# Tests for TimeWindowCreateRequest
def test_time_window_create_request_valid(user_id: ObjectId, category_id: ObjectId):
    data = {
        "name": "Morning Focus",
        "start_time": 540,  # 9:00 AM
        "end_time": 720,  # 12:00 PM
        "category": category_id,
        "day_template_id": ObjectId(),
    }
    assert TimeWindowCreateRequest(**data)


def test_time_window_create_request_end_time_less_than_start_time(user_id: ObjectId, category_id: ObjectId):
    data = {
        "name": "Invalid Window",
        "start_time": 720,  # 12:00 PM
        "end_time": 540,  # 9:00 AM
        "category": category_id,
        "day_template_id": ObjectId(),
    }
    with pytest.raises(ValidationError) as exc_info:
        TimeWindowCreateRequest(**data)
    assert "end_time must be greater than start_time" in str(exc_info.value)


def test_time_window_create_request_end_time_equal_to_start_time(user_id: ObjectId, category_id: ObjectId):
    data = {
        "name": "Zero Duration Window",
        "start_time": 600,  # 10:00 AM
        "end_time": 600,  # 10:00 AM
        "category": category_id,
        "day_template_id": ObjectId(),
    }
    with pytest.raises(ValidationError) as exc_info:
        TimeWindowCreateRequest(**data)
    assert "end_time must be greater than start_time" in str(exc_info.value)


def test_time_window_create_request_invalid_time_range_start(user_id: ObjectId, category_id: ObjectId):
    data = {
        "name": "Invalid Start",
        "start_time": -10,
        "end_time": 100,
        "category": category_id,
        "user": user_id,
    }
    with pytest.raises(ValidationError) as exc_info:
        TimeWindowCreateRequest(**data)
    assert "Time must be between 0 and 1439 minutes (inclusive)." in str(exc_info.value)


def test_time_window_create_request_invalid_time_range_end(user_id: ObjectId, category_id: ObjectId):
    data = {
        "name": "Invalid End",
        "start_time": 100,
        "end_time": 1500,
        "category": category_id,
        "user": user_id,
    }
    with pytest.raises(ValidationError) as exc_info:
        TimeWindowCreateRequest(**data)
    assert "Time must be between 0 and 1439 minutes (inclusive)." in str(exc_info.value)


# Tests for TimeWindowUpdateRequest
def test_time_window_update_request_valid_times(user_id: ObjectId, category_id: ObjectId):
    data = {"start_time": 300, "end_time": 400}  # 5:00 AM to 6:40 AM
    assert TimeWindowUpdateRequest(**data)


def test_time_window_update_request_end_time_less_than_start_time():
    data = {"start_time": 400, "end_time": 300}
    with pytest.raises(ValidationError) as exc_info:
        TimeWindowUpdateRequest(**data)
    assert "end_time must be greater than start_time" in str(exc_info.value)


def test_time_window_update_request_end_time_equal_to_start_time():
    data = {"start_time": 300, "end_time": 300}
    with pytest.raises(ValidationError) as exc_info:
        TimeWindowUpdateRequest(**data)
    assert "end_time must be greater than start_time" in str(exc_info.value)


def test_time_window_update_request_only_start_time():
    data = {"start_time": 300}
    assert TimeWindowUpdateRequest(**data)  # Should be valid as end_time is None


def test_time_window_update_request_only_end_time():
    data = {"end_time": 400}
    assert TimeWindowUpdateRequest(**data)  # Should be valid as start_time is None


def test_time_window_update_request_no_times():
    data = {"name": "Updated Name"}
    assert TimeWindowUpdateRequest(**data)  # Should be valid


def test_time_window_update_request_invalid_time_range_start():
    data = {"start_time": -10, "end_time": 100}
    with pytest.raises(ValidationError) as exc_info:
        TimeWindowUpdateRequest(**data)
    assert "Time must be between 0 and 1439 minutes (inclusive)." in str(exc_info.value)


def test_time_window_update_request_invalid_time_range_end():
    data = {"start_time": 100, "end_time": 2000}
    with pytest.raises(ValidationError) as exc_info:
        TimeWindowUpdateRequest(**data)
    assert "Time must be between 0 and 1439 minutes (inclusive)." in str(exc_info.value)


def test_time_window_update_request_all_fields_none():
    data = {
        "name": None,
        "start_time": None,
        "end_time": None,
        "category": None,
        "user": None,
    }
    # This should be valid as all fields are optional and None is acceptable
    assert TimeWindowUpdateRequest(**data)


def test_time_window_update_request_partial_update_with_valid_times(user_id: ObjectId, category_id: ObjectId):
    data = {
        "name": "Evening Review",
        "start_time": 1200,  # 8:00 PM
        "end_time": 1260,  # 9:00 PM
        # category and user are not provided for update
    }
    assert TimeWindowUpdateRequest(**data)


def test_time_window_update_request_partial_update_start_time_only(user_id: ObjectId, category_id: ObjectId):
    # Assuming an existing window, and we only update start_time
    # The validator should not fail if end_time is not provided in the update request
    data = {
        "start_time": 1200,  # 8:00 PM
    }
    assert TimeWindowUpdateRequest(**data)


def test_time_window_update_request_partial_update_end_time_only(user_id: ObjectId, category_id: ObjectId):
    # Assuming an existing window, and we only update end_time
    # The validator should not fail if start_time is not provided in the update request
    data = {
        "end_time": 1260,  # 9:00 PM
    }
    assert TimeWindowUpdateRequest(**data)
