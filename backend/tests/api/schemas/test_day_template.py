from typing import Optional

import pytest
from odmantic import ObjectId
from pydantic import ValidationError

from app.api.schemas.day_template import DayTemplateCreateRequest, DayTemplateUpdateRequest
from app.api.schemas.time_window import TimeWindowInputSchema


def create_time_window(description: Optional[str], start_time: int, end_time: int) -> TimeWindowInputSchema:
    return TimeWindowInputSchema(
        description=description, start_time=start_time, end_time=end_time, category_id=ObjectId()
    )


class TestDayTemplateCreateRequestValidation:
    def test_create_with_no_time_windows_succeeds(self):
        data = {"name": "Test Template No Windows"}
        try:
            DayTemplateCreateRequest(**data)
        except ValidationError as e:
            pytest.fail(f"Validation failed unexpectedly: {e}")

    def test_create_with_one_time_window_succeeds(self):
        data = {"name": "Test Template One Window", "time_windows": [create_time_window("Morning", 0, 60)]}
        try:
            DayTemplateCreateRequest(**data)
        except ValidationError as e:
            pytest.fail(f"Validation failed unexpectedly: {e}")

    def test_create_with_non_overlapping_time_windows_succeeds(self):
        data = {
            "name": "Test Non Overlap",
            "time_windows": [create_time_window("Morning", 0, 60), create_time_window("Afternoon", 60, 120)],
        }
        try:
            DayTemplateCreateRequest(**data)
        except ValidationError as e:
            pytest.fail(f"Validation failed unexpectedly: {e}")

    def test_create_with_non_overlapping_shuffled_time_windows_succeeds(self):
        data = {
            "name": "Test Non Overlap Shuffled",
            "time_windows": [create_time_window("Afternoon", 120, 180), create_time_window("Morning", 0, 60)],
        }
        try:
            DayTemplateCreateRequest(**data)
        except ValidationError as e:
            pytest.fail(f"Validation failed unexpectedly: {e}")

    def test_create_with_overlapping_time_windows_fails(self):
        data = {
            "name": "Test Overlap",
            "time_windows": [create_time_window("Work", 0, 60), create_time_window("Meeting", 30, 90)],
        }
        with pytest.raises(ValidationError) as excinfo:
            DayTemplateCreateRequest(**data)
        assert "Time windows overlap" in str(excinfo.value)

    def test_create_with_contained_time_window_fails(self):
        data = {
            "name": "Test Containment",
            "time_windows": [create_time_window("Outer", 0, 120), create_time_window("Inner", 30, 90)],
        }
        with pytest.raises(ValidationError) as excinfo:
            DayTemplateCreateRequest(**data)
        assert "Time windows overlap" in str(excinfo.value)

    def test_create_with_identical_time_windows_fails(self):
        data = {
            "name": "Test Identical",
            "time_windows": [create_time_window("Duplicate 1", 0, 60), create_time_window("Duplicate 2", 0, 60)],
        }
        with pytest.raises(ValidationError) as excinfo:
            DayTemplateCreateRequest(**data)
        assert "Time windows overlap" in str(excinfo.value)


class TestDayTemplateUpdateRequestValidation:
    def test_update_with_no_time_windows_field_succeeds(self):
        data = {"name": "Test Update No Windows Field"}
        try:
            DayTemplateUpdateRequest(**data)
        except ValidationError as e:
            pytest.fail(f"Validation failed unexpectedly: {e}")

    def test_update_with_time_windows_none_succeeds(self):
        data = {"name": "Test Update Windows None", "time_windows": None}
        try:
            DayTemplateUpdateRequest(**data)
        except ValidationError as e:
            pytest.fail(f"Validation failed unexpectedly: {e}")

    def test_update_with_empty_time_windows_list_succeeds(self):
        data = {"name": "Test Update Empty Windows List", "time_windows": []}
        try:
            DayTemplateUpdateRequest(**data)
        except ValidationError as e:
            pytest.fail(f"Validation failed unexpectedly: {e}")

    def test_update_with_one_time_window_succeeds(self):
        data = {"name": "Test Update One Window", "time_windows": [create_time_window("Morning", 0, 60)]}
        try:
            DayTemplateUpdateRequest(**data)
        except ValidationError as e:
            pytest.fail(f"Validation failed unexpectedly: {e}")

    def test_update_with_non_overlapping_time_windows_succeeds(self):
        data = {
            "name": "Test Update Non Overlap",
            "time_windows": [create_time_window("Morning", 0, 60), create_time_window("Afternoon", 60, 120)],
        }
        try:
            DayTemplateUpdateRequest(**data)
        except ValidationError as e:
            pytest.fail(f"Validation failed unexpectedly: {e}")

    def test_update_with_overlapping_time_windows_fails(self):
        data = {
            "name": "Test Update Overlap",
            "time_windows": [create_time_window("Work", 0, 60), create_time_window("Meeting", 30, 90)],
        }
        with pytest.raises(ValidationError) as excinfo:
            DayTemplateUpdateRequest(**data)
        assert "Time windows overlap" in str(excinfo.value)

    def test_update_with_contained_time_window_fails(self):
        data = {
            "name": "Test Update Containment",
            "time_windows": [create_time_window("Outer", 0, 120), create_time_window("Inner", 30, 90)],
        }
        with pytest.raises(ValidationError) as excinfo:
            DayTemplateUpdateRequest(**data)
        assert "Time windows overlap" in str(excinfo.value)

    def test_update_with_identical_time_windows_fails(self):
        data = {
            "name": "Test Update Identical",
            "time_windows": [create_time_window("Duplicate 1", 0, 60), create_time_window("Duplicate 2", 0, 60)],
        }
        with pytest.raises(ValidationError) as excinfo:
            DayTemplateUpdateRequest(**data)
        assert "Time windows overlap" in str(excinfo.value)
