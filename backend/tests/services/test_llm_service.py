from unittest.mock import AsyncMock, patch

import pytest

from app.clients.llm.base import LLMClient
from app.clients.llm.google_gemini import GoogleGeminiClient
from app.clients.llm.openai import OpenAIClient
from app.core.config import Settings
from app.core.exceptions import (
    LLMAPIKeyNotConfiguredError,
    LLMGenerationError,
    LLMInputValidationError,
    LLMServiceError,
)
from app.services.llm_service import LLMService

pytestmark = pytest.mark.asyncio


class TestLLMService:
    @pytest.fixture
    def mock_llm_client(self):
        return AsyncMock(spec=LLMClient)

    @pytest.fixture
    def llm_service(self, mock_llm_client):
        return LLMService(llm_client=mock_llm_client)

    @patch("app.clients.llm.openai.settings", spec=Settings)
    async def test_openai_client_missing_api_key(self, mock_settings):
        mock_settings.LLM_API_KEY = ""
        with pytest.raises(LLMAPIKeyNotConfiguredError):
            OpenAIClient()

    @patch("app.clients.llm.google_gemini.settings", spec=Settings)
    async def test_google_gemini_client_missing_api_key(self, mock_settings):
        mock_settings.LLM_API_KEY = ""
        with pytest.raises(LLMAPIKeyNotConfiguredError):
            GoogleGeminiClient()

    async def test_improve_text_success_default_prompt(self, llm_service, mock_llm_client):
        with patch("app.services.llm_service.settings", spec=Settings) as mock_settings:
            mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT = "Improve this:"
            mock_llm_client.generate_text.return_value = "Improved text"

            test_input = "test input"
            result = await llm_service.improve_text(text_to_process=test_input)

            expected_full_prompt = f"{mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT}\n\n---\n\n{test_input}"
            mock_llm_client.generate_text.assert_called_once_with(expected_full_prompt)
            assert result == "Improved text"

    async def test_improve_text_success_custom_prompt(self, llm_service, mock_llm_client):
        mock_llm_client.generate_text.return_value = "Improved by Custom Prompt"

        test_input = "custom test input"
        custom_prompt = "Custom override prompt:"
        result = await llm_service.improve_text(text_to_process=test_input, base_prompt_override=custom_prompt)

        expected_full_prompt = f"{custom_prompt}\n\n---\n\n{test_input}"
        mock_llm_client.generate_text.assert_called_once_with(expected_full_prompt)
        assert result == "Improved by Custom Prompt"

    async def test_improve_text_llm_generation_error(self, llm_service, mock_llm_client):
        mock_llm_client.generate_text.side_effect = LLMGenerationError(detail="LLM failed")

        with pytest.raises(LLMGenerationError, match="LLM failed"):
            await llm_service.improve_text(text_to_process="some text")

    async def test_improve_text_unexpected_error(self, llm_service, mock_llm_client):
        mock_llm_client.generate_text.side_effect = Exception("Unexpected error")

        with pytest.raises(
            LLMServiceError, match="An unexpected error occurred while contacting the LLM provider: Unexpected error"
        ):
            await llm_service.improve_text(text_to_process="some text")

    async def test_process_llm_action_improve_title_success(self, llm_service, mock_llm_client):
        mock_llm_client.generate_text.return_value = "Improved Title"
        with patch("app.services.llm_service.settings", spec=Settings) as mock_settings:
            mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT = (
                "Improve the following task title to make it more concise and informative:"
            )
            response = await llm_service.process_llm_action(action="improve_title", title="Old Title")
            assert response.improved_title == "Improved Title"
            mock_llm_client.generate_text.assert_called_once_with(
                f"{mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT}\n\n---\n\nOld Title"
            )

    async def test_process_llm_action_improve_title_no_title(self, llm_service):
        with pytest.raises(LLMInputValidationError, match="Title is required for 'improve_title' action."):
            await llm_service.process_llm_action(action="improve_title")

    async def test_process_llm_action_improve_description_success(self, llm_service, mock_llm_client):
        mock_llm_client.generate_text.return_value = "Improved Description"
        with patch("app.services.llm_service.settings", spec=Settings) as mock_settings:
            mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT = (
                "Improve the following task description to make it more concise and informative:"
            )
            response = await llm_service.process_llm_action(action="improve_description", description="Old Description")
            assert response.improved_description == "Improved Description"
            mock_llm_client.generate_text.assert_called_once_with(
                f"{mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT}\n\n---\n\nOld Description"
            )

    async def test_process_llm_action_improve_description_no_description(self, llm_service):
        with pytest.raises(LLMInputValidationError, match="Description is required for 'improve_description' action."):
            await llm_service.process_llm_action(action="improve_description")

    async def test_process_llm_action_generate_description_from_title_success(self, llm_service, mock_llm_client):
        mock_llm_client.generate_text.return_value = "Generated Description"
        with patch("app.services.llm_service.settings", spec=Settings) as mock_settings:
            mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT = (
                "Based on the following task title, generate a concise and informative task description:"
            )
            response = await llm_service.process_llm_action(action="generate_description_from_title", title="New Task")
            assert response.improved_description == "Generated Description"
            mock_llm_client.generate_text.assert_called_once_with(
                f"{mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT}\n\n---\n\nTask Title: New Task"
            )

    async def test_process_llm_action_generate_description_from_title_no_title(self, llm_service):
        with pytest.raises(
            LLMInputValidationError, match="Title is required for 'generate_description_from_title' action."
        ):
            await llm_service.process_llm_action(action="generate_description_from_title")

    async def test_process_llm_action_unknown_action(self, llm_service):
        with pytest.raises(LLMServiceError, match="Unknown or unsupported LLM action: unknown_action"):
            await llm_service.process_llm_action(action="unknown_action")
