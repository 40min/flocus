from unittest.mock import AsyncMock, MagicMock, patch

import google.generativeai as genai
import openai
import pytest

from app.core.config import Settings
from app.core.exceptions import LLMAPIKeyNotConfiguredError, LLMGenerationError, LLMServiceError
from app.services.llm_service import LLMService

# Mark all tests in this file as asyncio
pytestmark = pytest.mark.asyncio


class TestLLMService:

    @patch("app.services.llm_service.settings", spec=Settings)
    async def test_improve_text_missing_api_key(self, mock_settings):
        mock_settings.LLM_API_KEY = ""
        mock_settings.LLM_PROVIDER = "OpenAI"  # Provider doesn't matter here
        mock_settings.LLM_MODEL_NAME = ""  # Does not matter here
        mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT = "Does not matter here"

        service = LLMService()
        service.settings = mock_settings  # Ensure service uses the mocked settings

        with pytest.raises(LLMAPIKeyNotConfiguredError):
            await service.improve_text(text_to_process="some text")

    @patch("openai.AsyncOpenAI")
    @patch("app.services.llm_service.settings", spec=Settings)
    async def test_improve_text_openai_provider_success_default_prompt_and_model(
        self, mock_settings, mock_async_openai_client
    ):
        mock_settings.LLM_PROVIDER = "OpenAI"
        mock_settings.LLM_API_KEY = "fake_openai_key"
        mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT = "Improve this:"
        mock_settings.LLM_MODEL_NAME = ""  # Use default model

        mock_openai_instance = AsyncMock()
        mock_chat_completions_create = AsyncMock()
        mock_chat_completions_create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content="Improved by OpenAI"))]
        )
        mock_openai_instance.chat.completions.create = mock_chat_completions_create
        mock_async_openai_client.return_value = mock_openai_instance

        service = LLMService()
        service.settings = mock_settings

        test_input = "test input"
        # Test with default prompt (no base_prompt_override)
        result = await service.improve_text(text_to_process=test_input)

        mock_async_openai_client.assert_called_once_with(api_key="fake_openai_key")
        expected_full_prompt = f"{mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT}\n\n---\n\n{test_input}"
        mock_openai_instance.chat.completions.create.assert_called_once_with(
            model="gpt-3.5-turbo", messages=[{"role": "user", "content": expected_full_prompt}]  # Default model
        )
        assert result == "Improved by OpenAI"

    @patch("openai.AsyncOpenAI")
    @patch("app.services.llm_service.settings", spec=Settings)
    async def test_improve_text_openai_provider_returns_error_string_raises_llm_generation_error(
        self, mock_settings, mock_async_openai_client
    ):
        mock_settings.LLM_PROVIDER = "OpenAI"
        mock_settings.LLM_API_KEY = "fake_openai_key"
        mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT = "Improve this:"
        mock_settings.LLM_MODEL_NAME = ""

        mock_openai_instance = AsyncMock()
        mock_chat_completions_create = AsyncMock()
        mock_chat_completions_create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content="Error: API key missing"))]
        )
        mock_openai_instance.chat.completions.create = mock_chat_completions_create
        mock_async_openai_client.return_value = mock_openai_instance

        service = LLMService()
        service.settings = mock_settings

        with pytest.raises(LLMGenerationError, match="Error: API key missing"):
            await service.improve_text(text_to_process="test input")

    @patch("openai.AsyncOpenAI")
    @patch("app.services.llm_service.settings", spec=Settings)
    async def test_improve_text_openai_provider_no_content_raises_llm_generation_error(
        self, mock_settings, mock_async_openai_client
    ):
        mock_settings.LLM_PROVIDER = "OpenAI"
        mock_settings.LLM_API_KEY = "fake_openai_key"
        mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT = "Improve this:"
        mock_settings.LLM_MODEL_NAME = ""

        mock_openai_instance = AsyncMock()
        mock_chat_completions_create = AsyncMock()
        mock_chat_completions_create.return_value = MagicMock(choices=[MagicMock(message=MagicMock(content=None))])
        mock_openai_instance.chat.completions.create = mock_chat_completions_create
        mock_async_openai_client.return_value = mock_openai_instance

        service = LLMService()
        service.settings = mock_settings

        with pytest.raises(LLMGenerationError, match="OpenAI API call failed to return a valid response."):
            await service.improve_text(text_to_process="test input")

    @patch("openai.AsyncOpenAI")
    @patch("app.services.llm_service.settings", spec=Settings)
    async def test_improve_text_openai_provider_custom_prompt_and_model(self, mock_settings, mock_async_openai_client):
        mock_settings.LLM_PROVIDER = "OpenAI"
        mock_settings.LLM_API_KEY = "fake_openai_key"
        mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT = "This is default but should be overridden"
        mock_settings.LLM_MODEL_NAME = "gpt-4-custom"

        mock_openai_instance = AsyncMock()
        mock_chat_completions_create = AsyncMock()
        mock_chat_completions_create.return_value = MagicMock(
            choices=[MagicMock(message=MagicMock(content="Improved by Custom OpenAI"))]
        )
        mock_openai_instance.chat.completions.create = mock_chat_completions_create
        mock_async_openai_client.return_value = mock_openai_instance

        service = LLMService()
        service.settings = mock_settings

        test_input = "custom test input"
        custom_prompt = "Custom override prompt:"
        # Test with base_prompt_override
        result = await service.improve_text(text_to_process=test_input, base_prompt_override=custom_prompt)

        mock_async_openai_client.assert_called_once_with(api_key="fake_openai_key")
        expected_full_prompt = f"{custom_prompt}\n\n---\n\n{test_input}"
        mock_openai_instance.chat.completions.create.assert_called_once_with(
            model="gpt-4-custom", messages=[{"role": "user", "content": expected_full_prompt}]  # Custom model
        )
        assert result == "Improved by Custom OpenAI"

    @patch("google.generativeai.GenerativeModel")
    @patch("google.generativeai.configure")
    @patch("app.services.llm_service.settings", spec=Settings)
    async def test_improve_text_google_gemini_provider_success_default_prompt_and_model(
        self, mock_settings, mock_genai_configure, mock_genai_model
    ):
        mock_settings.LLM_PROVIDER = "GoogleGemini"
        mock_settings.LLM_API_KEY = "fake_gemini_key"
        mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT = "Improve this gem:"
        mock_settings.LLM_MODEL_NAME = ""  # Use default model

        mock_gemini_instance = AsyncMock()
        mock_gemini_instance.generate_content_async.return_value = MagicMock(text="Improved by Gemini")
        mock_genai_model.return_value = mock_gemini_instance

        service = LLMService()
        service.settings = mock_settings

        test_input = "gemini test"
        result = await service.improve_text(text_to_process=test_input)  # Default prompt

        mock_genai_configure.assert_called_once_with(api_key="fake_gemini_key")
        mock_genai_model.assert_called_once_with("gemini-pro")  # Default model
        expected_full_prompt = f"{mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT}\n\n---\n\n{test_input}"
        mock_gemini_instance.generate_content_async.assert_called_once_with(expected_full_prompt)
        assert result == "Improved by Gemini"

    @patch("google.generativeai.GenerativeModel")
    @patch("google.generativeai.configure")
    @patch("app.services.llm_service.settings", spec=Settings)
    async def test_improve_text_google_gemini_provider_returns_error_string_raises_llm_generation_error(
        self, mock_settings, mock_genai_configure, mock_genai_model
    ):
        mock_settings.LLM_PROVIDER = "GoogleGemini"
        mock_settings.LLM_API_KEY = "fake_gemini_key"
        mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT = "Improve this gem:"
        mock_settings.LLM_MODEL_NAME = ""

        mock_gemini_instance = AsyncMock()
        mock_gemini_instance.generate_content_async.return_value = MagicMock(text="Error: Gemini API Error")
        mock_genai_model.return_value = mock_gemini_instance

        service = LLMService()
        service.settings = mock_settings

        with pytest.raises(LLMGenerationError, match="Error: Gemini API Error"):
            await service.improve_text(text_to_process="gemini test")

    @patch("google.generativeai.GenerativeModel")
    @patch("google.generativeai.configure")
    @patch("app.services.llm_service.settings", spec=Settings)
    async def test_improve_text_google_gemini_provider_no_content_raises_llm_generation_error(
        self, mock_settings, mock_genai_configure, mock_genai_model
    ):
        mock_settings.LLM_PROVIDER = "GoogleGemini"
        mock_settings.LLM_API_KEY = "fake_gemini_key"
        mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT = "Improve this gem:"
        mock_settings.LLM_MODEL_NAME = ""

        mock_gemini_instance = AsyncMock()
        mock_gemini_instance.generate_content_async.return_value = MagicMock(text=None)
        mock_genai_model.return_value = mock_gemini_instance

        service = LLMService()
        service.settings = mock_settings

        with pytest.raises(LLMGenerationError, match="GoogleGemini API call failed to return valid text."):
            await service.improve_text(text_to_process="gemini test")

    @patch("app.services.llm_service.settings", spec=Settings)
    async def test_improve_text_unknown_provider(self, mock_settings):
        mock_settings.LLM_PROVIDER = "UnknownProvider"
        mock_settings.LLM_API_KEY = "fake_key"
        mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT = "This prompt does not matter for this test"
        mock_settings.LLM_MODEL_NAME = ""

        service = LLMService()
        service.settings = mock_settings

        with pytest.raises(LLMServiceError) as excinfo:
            await service.improve_text(text_to_process="some text")
        assert "Unknown LLM_PROVIDER: UnknownProvider" in str(excinfo.value.detail)

    @patch("openai.AsyncOpenAI")
    @patch("app.services.llm_service.settings", spec=Settings)
    async def test_improve_text_openai_api_error(self, mock_settings, mock_async_openai_client):
        mock_settings.LLM_PROVIDER = "OpenAI"
        mock_settings.LLM_API_KEY = "fake_openai_key"
        mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT = "Improve this:"
        mock_settings.LLM_MODEL_NAME = ""

        mock_openai_instance = AsyncMock()
        mock_openai_instance.chat.completions.create.side_effect = openai.APIError(
            "OpenAI API Error", request=MagicMock(), body=MagicMock()
        )
        mock_async_openai_client.return_value = mock_openai_instance

        service = LLMService()
        service.settings = mock_settings

        with pytest.raises(LLMGenerationError) as excinfo:
            await service.improve_text(text_to_process="test input")
        assert "LLM provider API error: OpenAI API Error" in str(excinfo.value.detail)

    @patch("google.generativeai.GenerativeModel")
    @patch("google.generativeai.configure")
    @patch("app.services.llm_service.settings", spec=Settings)
    async def test_improve_text_google_gemini_api_error(self, mock_settings, mock_genai_configure, mock_genai_model):
        mock_settings.LLM_PROVIDER = "GoogleGemini"
        mock_settings.LLM_API_KEY = "fake_gemini_key"
        mock_settings.LLM_TEXT_IMPROVEMENT_PROMPT = "Improve this gem:"
        mock_settings.LLM_MODEL_NAME = ""

        mock_gemini_instance = AsyncMock()
        mock_gemini_instance.generate_content_async.side_effect = genai.types.BlockedPromptException("Gemini API Error")
        mock_genai_model.return_value = mock_gemini_instance

        service = LLMService()
        service.settings = mock_settings

        with pytest.raises(LLMGenerationError) as excinfo:
            await service.improve_text(text_to_process="gemini test")
        assert "LLM provider API error: Gemini API Error" in str(excinfo.value.detail)
