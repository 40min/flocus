import pytest
from pydantic import ValidationError

from app.api.schemas.task import TaskUpdateRequest


class TestTaskUpdateRequestValidation:
    """Test TaskUpdateRequest validation with add_lasts_minutes field."""

    def test_task_update_request_negative_add_lasts_minutes_validation(self):
        """Test TaskUpdateRequest rejects negative add_lasts_minutes values."""
        with pytest.raises(ValidationError) as exc_info:
            TaskUpdateRequest(add_lasts_minutes=-1)

        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["type"] == "greater_than_equal"
        assert errors[0]["loc"] == ("add_lasts_minutes",)

        with pytest.raises(ValidationError) as exc_info:
            TaskUpdateRequest(add_lasts_minutes=-30)

        errors = exc_info.value.errors()
        assert len(errors) == 1
        assert errors[0]["type"] == "greater_than_equal"

    def test_task_update_request_validation_constraints(self):
        """Test validation constraints for add_lasts_minutes field."""
        # Test minimum value constraint (ge=0)
        request = TaskUpdateRequest(add_lasts_minutes=0)
        assert request.add_lasts_minutes == 0

        # Test that negative values are rejected
        with pytest.raises(ValidationError):
            TaskUpdateRequest(add_lasts_minutes=-1)

    def test_task_update_request_type_validation(self):
        """Test type validation for add_lasts_minutes field."""
        # Test with valid integer
        request = TaskUpdateRequest(add_lasts_minutes=30)
        assert isinstance(request.add_lasts_minutes, int)

        # Test with string that can be converted to int
        request = TaskUpdateRequest(add_lasts_minutes="45")
        assert request.add_lasts_minutes == 45
        assert isinstance(request.add_lasts_minutes, int)

        # Test with invalid string
        with pytest.raises(ValidationError):
            TaskUpdateRequest(add_lasts_minutes="invalid")

        # Test with float that has fractional part (should raise validation error)
        with pytest.raises(ValidationError):
            TaskUpdateRequest(add_lasts_minutes=30.5)

        # Test with float that is whole number (should work)
        request = TaskUpdateRequest(add_lasts_minutes=30.0)
        assert request.add_lasts_minutes == 30
        assert isinstance(request.add_lasts_minutes, int)
