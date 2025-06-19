import google.generativeai as genai

from app.clients.llm.base import LLMClient
from app.core.config import settings
from app.core.exceptions import LLMAPIKeyNotConfiguredError, LLMGenerationError


class GoogleGeminiClient(LLMClient):
    def __init__(self):
        if not settings.LLM_API_KEY:
            raise LLMAPIKeyNotConfiguredError()
        genai.configure(api_key=settings.LLM_API_KEY)
        self.model_name = settings.LLM_MODEL_NAME if settings.LLM_MODEL_NAME else "gemini-2.5-flash-lite-preview-06-17"
        self.model = genai.GenerativeModel(self.model_name)

    async def generate_text(self, prompt: str) -> str:
        try:
            response = await self.model.generate_content_async(prompt)
            if response.text:
                suggestion = response.text.strip()
                if suggestion.startswith("Error:"):
                    raise LLMGenerationError(detail=suggestion)
                return suggestion
            else:
                raise LLMGenerationError(detail="GoogleGemini API call failed to return valid text.")
        except (genai.types.BlockedPromptException, genai.types.StopCandidateException) as e:
            raise LLMGenerationError(detail=f"Google Gemini API error: {str(e)}")
        except Exception as e:
            raise LLMGenerationError(detail=f"An unexpected error occurred with Google Gemini: {str(e)}")
