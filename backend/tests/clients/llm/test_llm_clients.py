from unittest.mock import AsyncMock, MagicMock, patch

import google.generativeai as genai
import openai
import pytest

from app.clients.llm.google_gemini import GoogleGeminiClient
from app.clients.llm.openai import OpenAIClient
from app.core.config import Settings
from app.core.exceptions import LLMAPIKeyNotConfiguredError, LLMGenerationError


@pytest.fixture
def mock_settings_with_api_key():
    with (
        patch("app.clients.llm.openai.settings", spec=Settings) as mock_openai_settings,
        patch("app.clients.llm.google_gemini.settings", spec=Settings) as mock_gemini_settings,
    ):
        mock_openai_settings.LLM_API_KEY = "test_openai_key"
        mock_openai_settings.LLM_MODEL_NAME = "gpt-4.1-nano"
        mock_gemini_settings.LLM_API_KEY = "test_gemini_key"
        mock_gemini_settings.LLM_MODEL_NAME = "gemini-2.5-flash-lite-preview-06-17"
        yield


@pytest.fixture
def mock_settings_without_api_key():
    with (
        patch("app.clients.llm.openai.settings", spec=Settings) as mock_openai_settings,
        patch("app.clients.llm.google_gemini.settings", spec=Settings) as mock_gemini_settings,
    ):
        mock_openai_settings.LLM_API_KEY = ""
        mock_gemini_settings.LLM_API_KEY = ""
        yield


class TestOpenAIClient:
    async def test_initialization_success(self, mock_settings_with_api_key):
        client = OpenAIClient()
        assert client.client is not None
        assert client.model_name == "gpt-4.1-nano"

    async def test_initialization_no_api_key(self, mock_settings_without_api_key):
        with pytest.raises(LLMAPIKeyNotConfiguredError):
            OpenAIClient()

    @patch("openai.AsyncOpenAI")
    async def test_generate_text_success(self, mock_async_openai, mock_settings_with_api_key):
        mock_client_instance = mock_async_openai.return_value
        mock_client_instance.chat.completions.create = AsyncMock(
            return_value=MagicMock(choices=[MagicMock(message=MagicMock(content="Generated text."))])
        )
        client = OpenAIClient()
        result = await client.generate_text("Test prompt")
        assert result == "Generated text."
        mock_client_instance.chat.completions.create.assert_called_once_with(
            model="gpt-4.1-nano", messages=[{"role": "user", "content": "Test prompt"}]
        )

    @patch("openai.AsyncOpenAI")
    async def test_generate_text_api_error(self, mock_async_openai, mock_settings_with_api_key):
        mock_client_instance = mock_async_openai.return_value
        # Added 'body=None' to APIError instantiation
        mock_client_instance.chat.completions.create.side_effect = openai.APIError("API Error", request=None, body=None)
        client = OpenAIClient()
        with pytest.raises(LLMGenerationError, match="OpenAI API error: API Error"):
            await client.generate_text("Test prompt")

    @patch("openai.AsyncOpenAI")
    async def test_generate_text_empty_response(self, mock_async_openai, mock_settings_with_api_key):
        mock_client_instance = mock_async_openai.return_value
        mock_client_instance.chat.completions.create = AsyncMock(return_value=MagicMock(choices=[]))
        client = OpenAIClient()
        with pytest.raises(LLMGenerationError, match="OpenAI API call failed to return a valid response."):
            await client.generate_text("Test prompt")

    @patch("openai.AsyncOpenAI")
    async def test_generate_text_error_prefix_in_response(self, mock_async_openai, mock_settings_with_api_key):
        mock_client_instance = mock_async_openai.return_value
        mock_client_instance.chat.completions.create = AsyncMock(
            return_value=MagicMock(choices=[MagicMock(message=MagicMock(content="Error: Something went wrong."))])
        )
        client = OpenAIClient()
        with pytest.raises(LLMGenerationError, match="Error: Something went wrong."):
            await client.generate_text("Test prompt")

    @patch("openai.AsyncOpenAI")
    async def test_generate_text_unexpected_exception(self, mock_async_openai, mock_settings_with_api_key):
        mock_client_instance = mock_async_openai.return_value
        mock_client_instance.chat.completions.create.side_effect = Exception("Unexpected error")
        client = OpenAIClient()
        with pytest.raises(LLMGenerationError, match="An unexpected error occurred with OpenAI: Unexpected error"):
            await client.generate_text("Test prompt")


class TestGoogleGeminiClient:
    async def test_initialization_success(self, mock_settings_with_api_key):
        with patch("google.generativeai.configure") as mock_configure:
            client = GoogleGeminiClient()
            assert client.model is not None
            assert client.model_name == "gemini-2.5-flash-lite-preview-06-17"
            mock_configure.assert_called_once_with(api_key="test_gemini_key")

    async def test_initialization_no_api_key(self, mock_settings_without_api_key):
        with pytest.raises(LLMAPIKeyNotConfiguredError):
            GoogleGeminiClient()

    @patch("google.generativeai.GenerativeModel")
    async def test_generate_text_success(self, mock_generative_model, mock_settings_with_api_key):
        mock_model_instance = mock_generative_model.return_value
        mock_model_instance.generate_content_async = AsyncMock(return_value=MagicMock(text="Generated text."))
        client = GoogleGeminiClient()
        result = await client.generate_text("Test prompt")
        assert result == "Generated text."
        mock_model_instance.generate_content_async.assert_called_once_with("Test prompt")

    @patch("google.generativeai.GenerativeModel")
    async def test_generate_text_blocked_prompt_exception(self, mock_generative_model, mock_settings_with_api_key):
        mock_model_instance = mock_generative_model.return_value
        mock_model_instance.generate_content_async.side_effect = genai.types.BlockedPromptException("Blocked")
        client = GoogleGeminiClient()
        with pytest.raises(LLMGenerationError, match="Google Gemini API error: Blocked"):
            await client.generate_text("Test prompt")

    @patch("google.generativeai.GenerativeModel")
    async def test_generate_text_stop_candidate_exception(self, mock_generative_model, mock_settings_with_api_key):
        mock_model_instance = mock_generative_model.return_value
        mock_model_instance.generate_content_async.side_effect = genai.types.StopCandidateException("Stopped")
        client = GoogleGeminiClient()
        with pytest.raises(LLMGenerationError, match="Google Gemini API error: Stopped"):
            await client.generate_text("Test prompt")

    @patch("google.generativeai.GenerativeModel")
    async def test_generate_text_empty_response(self, mock_generative_model, mock_settings_with_api_key):
        mock_model_instance = mock_generative_model.return_value
        mock_model_instance.generate_content_async = AsyncMock(return_value=MagicMock(text=""))
        client = GoogleGeminiClient()
        with pytest.raises(LLMGenerationError, match="GoogleGemini API call failed to return valid text."):
            await client.generate_text("Test prompt")

    @patch("google.generativeai.GenerativeModel")
    async def test_generate_text_error_prefix_in_response(self, mock_generative_model, mock_settings_with_api_key):
        mock_model_instance = mock_generative_model.return_value
        mock_model_instance.generate_content_async = AsyncMock(
            return_value=MagicMock(text="Error: Something went wrong.")
        )
        client = GoogleGeminiClient()
        with pytest.raises(LLMGenerationError, match="Error: Something went wrong."):
            await client.generate_text("Test prompt")

    @patch("google.generativeai.GenerativeModel")
    async def test_generate_text_unexpected_exception(self, mock_generative_model, mock_settings_with_api_key):
        mock_model_instance = mock_generative_model.return_value
        mock_model_instance.generate_content_async.side_effect = Exception("Unexpected error")
        client = GoogleGeminiClient()
        with pytest.raises(
            LLMGenerationError, match="An unexpected error occurred with Google Gemini: Unexpected error"
        ):
            await client.generate_text("Test prompt")
