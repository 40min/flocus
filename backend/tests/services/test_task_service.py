from unittest.mock import AsyncMock, MagicMock

import pytest
from odmantic import ObjectId

from app.api.schemas.task import LLMSuggestionResponse
from app.core.enums import LLMActionType
from app.core.exceptions import LLMGenerationError, LLMServiceError, TaskDataMissingError
from app.db.models.task import Task as TaskModel  # Renamed to TaskModel to avoid conflict
from app.services.llm_service import LLMService
from app.services.task_service import TaskService

pytestmark = pytest.mark.asyncio


class TestTaskServicePrepareLLMSuggestion:

    @pytest.fixture
    def mock_llm_service(self) -> LLMService:
        service = MagicMock(spec=LLMService)
        service.improve_text = AsyncMock()
        return service

    @pytest.fixture
    def task_service(self, mock_llm_service: LLMService) -> TaskService:
        return TaskService(engine=MagicMock(), llm_service=mock_llm_service)

    @pytest.fixture
    def sample_task(self) -> TaskModel:
        return TaskModel(
            id=ObjectId(), title="Original Task Title", description="Original task description.", user_id=ObjectId()
        )

    async def test_prepare_llm_suggestion_improve_title_success(
        self, task_service: TaskService, mock_llm_service: LLMService, sample_task: TaskModel
    ):
        mock_llm_service.improve_text.return_value = "Improved Title"

        response = await task_service.prepare_llm_suggestion(
            task=sample_task,
            action=LLMActionType.IMPROVE_TITLE,
        )

        assert isinstance(response, LLMSuggestionResponse)
        assert response.suggestion == "Improved Title"
        assert response.original_text == sample_task.title
        assert response.field_to_update == "title"
        mock_llm_service.improve_text.assert_called_once_with(
            text_to_process=sample_task.title,
            base_prompt_override="Improve the following task title to make it more concise and informative:",
        )

    async def test_prepare_llm_suggestion_improve_description_success(
        self, task_service: TaskService, mock_llm_service: LLMService, sample_task: TaskModel
    ):
        mock_llm_service.improve_text.return_value = "Improved Description"

        response = await task_service.prepare_llm_suggestion(
            task=sample_task,
            action=LLMActionType.IMPROVE_DESCRIPTION,
        )

        assert response.suggestion == "Improved Description"
        assert response.original_text == sample_task.description
        assert response.field_to_update == "description"
        mock_llm_service.improve_text.assert_called_once_with(
            text_to_process=sample_task.description,
            base_prompt_override="Improve the following task description to make it more concise and informative:",
        )

    async def test_prepare_llm_suggestion_improve_empty_description(
        self, task_service: TaskService, mock_llm_service: LLMService, sample_task: TaskModel
    ):
        sample_task.description = None  # Test with empty description
        mock_llm_service.improve_text.return_value = "Generated based on empty input"

        response = await task_service.prepare_llm_suggestion(
            task=sample_task,
            action=LLMActionType.IMPROVE_DESCRIPTION,
        )
        assert response.suggestion == "Generated based on empty input"
        assert response.original_text is None
        assert response.field_to_update == "description"
        mock_llm_service.improve_text.assert_called_once_with(
            text_to_process="",  # Should pass empty string
            base_prompt_override="Improve the following task description to make it more concise and informative:",
        )

    async def test_prepare_llm_suggestion_generate_description_success(
        self, task_service: TaskService, mock_llm_service: LLMService, sample_task: TaskModel
    ):
        mock_llm_service.improve_text.return_value = "Generated Description"
        expected_text_for_llm = f"Task Title: {sample_task.title}"
        expected_base_prompt = "Based on the following task title, generate a concise and informative task description:"

        response = await task_service.prepare_llm_suggestion(
            task=sample_task,
            action=LLMActionType.GENERATE_DESCRIPTION_FROM_TITLE,
        )

        assert response.suggestion == "Generated Description"
        assert response.original_text is None
        assert response.field_to_update == "description"
        mock_llm_service.improve_text.assert_called_once_with(
            text_to_process=expected_text_for_llm, base_prompt_override=expected_base_prompt
        )

    async def test_improve_title_missing_title_raises_error(
        self, task_service: TaskService, mock_llm_service: LLMService, sample_task: TaskModel
    ):
        sample_task.title = ""  # Empty title
        with pytest.raises(TaskDataMissingError, match="Task title is missing for 'improve_title' action."):
            await task_service.prepare_llm_suggestion(
                task=sample_task,
                action=LLMActionType.IMPROVE_TITLE,
            )

    async def test_generate_description_missing_title_raises_error(
        self, task_service: TaskService, mock_llm_service: LLMService, sample_task: TaskModel
    ):
        sample_task.title = ""  # Empty title
        with pytest.raises(
            TaskDataMissingError, match="Task title is missing for 'generate_description_from_title' action."
        ):
            await task_service.prepare_llm_suggestion(
                task=sample_task,
                action=LLMActionType.GENERATE_DESCRIPTION_FROM_TITLE,
            )

    async def test_llm_service_returns_error_string_raises_llm_generation_error(
        self, task_service: TaskService, mock_llm_service: LLMService, sample_task: TaskModel
    ):
        mock_llm_service.improve_text.return_value = "Error: API key missing"
        with pytest.raises(LLMGenerationError, match="Error: API key missing"):
            await task_service.prepare_llm_suggestion(
                task=sample_task,
                action=LLMActionType.IMPROVE_TITLE,
            )

    async def test_llm_service_raises_llmserviceerror_propagates(
        self, task_service: TaskService, mock_llm_service: LLMService, sample_task: TaskModel
    ):
        # Test that if LLMService itself raises a specific LLMServiceError, it's re-raised
        custom_detail = "A specific LLM Service Error"
        mock_llm_service.improve_text.side_effect = LLMServiceError(status_code=503, detail=custom_detail)
        with pytest.raises(LLMServiceError, match=custom_detail) as exc_info:
            await task_service.prepare_llm_suggestion(
                task=sample_task,
                action=LLMActionType.IMPROVE_TITLE,
            )
        assert exc_info.value.status_code == 503

    async def test_llm_service_raises_unexpected_exception_raises_llm_generation_error(
        self, task_service: TaskService, mock_llm_service: LLMService, sample_task: TaskModel
    ):
        mock_llm_service.improve_text.side_effect = Exception("Unexpected crash")
        expected_error_detail = "An unexpected error occurred while generating LLM suggestion: Unexpected crash"
        with pytest.raises(LLMGenerationError, match=expected_error_detail):
            await task_service.prepare_llm_suggestion(
                task=sample_task,
                action=LLMActionType.IMPROVE_TITLE,
            )
