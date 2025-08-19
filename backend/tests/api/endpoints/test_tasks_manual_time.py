from unittest.mock import patch

import pytest
from fastapi import status
from httpx import AsyncClient

from app.api.schemas.task import TaskStatus, TaskUpdateRequest
from app.core.config import settings
from app.db.models.task import Task
from app.mappers.task_mapper import TaskMapper

API_V1_STR = settings.API_V1_STR
TASKS_ENDPOINT = f"{API_V1_STR}/tasks"

pytestmark = pytest.mark.asyncio


class TestTasksAPIManualTime:
    """Test task API endpoints with manual time addition functionality."""

    async def test_update_task_with_valid_add_lasts_minutes(
        self, async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: Task
    ):
        """Test PATCH /tasks/{task_id} with valid add_lasts_minutes."""
        task_id = user_one_task_model.id

        with patch("app.services.task_service.TaskService.update_task") as mock_update_task:
            # Mock the service response
            updated_task = user_one_task_model.model_copy()
            updated_task.statistics.lasts_minutes = 45  # Assume 30 + 15
            mock_update_task.return_value = TaskMapper.to_response(updated_task, None)

            response = await async_client.patch(
                f"{TASKS_ENDPOINT}/{task_id}", headers=auth_headers_user_one, json={"add_lasts_minutes": 15}
            )

            assert response.status_code == status.HTTP_200_OK
            response_data = response.json()
            assert "statistics" in response_data
            assert response_data["statistics"]["lasts_minutes"] == 45

            # Verify service was called with correct parameters
            mock_update_task.assert_called_once()
            call_args = mock_update_task.call_args
            task_data = call_args[1]["task_data"]
            assert isinstance(task_data, TaskUpdateRequest)
            assert task_data.add_lasts_minutes == 15

    async def test_update_task_with_zero_add_lasts_minutes(
        self, async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: Task
    ):
        """Test PATCH /tasks/{task_id} with zero add_lasts_minutes."""
        task_id = user_one_task_model.id

        with patch("app.services.task_service.TaskService.update_task") as mock_update_task:
            # Mock the service response
            mock_update_task.return_value = TaskMapper.to_response(user_one_task_model, None)

            response = await async_client.patch(
                f"{TASKS_ENDPOINT}/{task_id}", headers=auth_headers_user_one, json={"add_lasts_minutes": 0}
            )

            # Should not return validation error for zero
            assert response.status_code != status.HTTP_422_UNPROCESSABLE_ENTITY

            # Verify service was called
            mock_update_task.assert_called_once()
            call_args = mock_update_task.call_args
            task_data = call_args[1]["task_data"]
            assert task_data.add_lasts_minutes == 0

    async def test_update_task_with_negative_add_lasts_minutes_validation_error(
        self, async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: Task
    ):
        """Test PATCH /tasks/{task_id} with negative add_lasts_minutes returns validation error."""
        task_id = user_one_task_model.id

        response = await async_client.patch(
            f"{TASKS_ENDPOINT}/{task_id}", headers=auth_headers_user_one, json={"add_lasts_minutes": -5}
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_data = response.json()
        assert "detail" in error_data

        # Check that the error is about the add_lasts_minutes field
        errors = error_data["detail"]
        assert any(
            error["loc"] == ["body", "add_lasts_minutes"] and "greater_than_equal" in error["type"] for error in errors
        )

    async def test_update_task_with_invalid_type_add_lasts_minutes(
        self, async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: Task
    ):
        """Test PATCH /tasks/{task_id} with invalid type for add_lasts_minutes."""
        task_id = user_one_task_model.id

        response = await async_client.patch(
            f"{TASKS_ENDPOINT}/{task_id}", headers=auth_headers_user_one, json={"add_lasts_minutes": "invalid"}
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_data = response.json()
        assert "detail" in error_data

    async def test_update_task_with_add_lasts_minutes_and_other_fields(
        self, async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: Task
    ):
        """Test PATCH /tasks/{task_id} with add_lasts_minutes and other fields."""
        task_id = user_one_task_model.id

        with patch("app.services.task_service.TaskService.update_task") as mock_update_task:
            # Mock the service response
            updated_task = user_one_task_model.model_copy()
            updated_task.title = "Updated Title"
            updated_task.status = TaskStatus.IN_PROGRESS
            updated_task.statistics.lasts_minutes = 50  # Assume some calculation
            mock_update_task.return_value = TaskMapper.to_response(updated_task, None)

            response = await async_client.patch(
                f"{TASKS_ENDPOINT}/{task_id}",
                headers=auth_headers_user_one,
                json={"title": "Updated Title", "status": "in_progress", "add_lasts_minutes": 20},
            )

            assert response.status_code == status.HTTP_200_OK
            response_data = response.json()
            assert response_data["title"] == "Updated Title"
            assert response_data["status"] == "in_progress"

            # Verify service was called with correct parameters
            mock_update_task.assert_called_once()
            call_args = mock_update_task.call_args
            task_data = call_args[1]["task_data"]
            assert task_data.title == "Updated Title"
            assert task_data.status == TaskStatus.IN_PROGRESS
            assert task_data.add_lasts_minutes == 20

    async def test_update_task_without_add_lasts_minutes(
        self, async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: Task
    ):
        """Test PATCH /tasks/{task_id} without add_lasts_minutes field."""
        task_id = user_one_task_model.id

        with patch("app.services.task_service.TaskService.update_task") as mock_update_task:
            # Mock the service response
            updated_task = user_one_task_model.model_copy()
            updated_task.title = "Updated Title"
            mock_update_task.return_value = TaskMapper.to_response(updated_task, None)

            response = await async_client.patch(
                f"{TASKS_ENDPOINT}/{task_id}", headers=auth_headers_user_one, json={"title": "Updated Title"}
            )

            # Should work fine without add_lasts_minutes
            assert response.status_code == status.HTTP_200_OK

            # Verify service was called and add_lasts_minutes is None
            mock_update_task.assert_called_once()
            call_args = mock_update_task.call_args
            task_data = call_args[1]["task_data"]
            assert task_data.add_lasts_minutes is None

    async def test_update_task_validation_error_response_format(
        self, async_client: AsyncClient, auth_headers_user_one: dict[str, str], user_one_task_model: Task
    ):
        """Test that validation errors for add_lasts_minutes have proper format."""
        task_id = user_one_task_model.id

        response = await async_client.patch(
            f"{TASKS_ENDPOINT}/{task_id}", headers=auth_headers_user_one, json={"add_lasts_minutes": -10}
        )

        assert response.status_code == status.HTTP_422_UNPROCESSABLE_ENTITY
        error_data = response.json()

        # Verify error structure
        assert "detail" in error_data
        assert isinstance(error_data["detail"], list)

        # Find the add_lasts_minutes error
        add_time_error = next(
            (error for error in error_data["detail"] if error["loc"] == ["body", "add_lasts_minutes"]), None
        )
        assert add_time_error is not None
        assert "greater_than_equal" in add_time_error["type"]
        assert "msg" in add_time_error
