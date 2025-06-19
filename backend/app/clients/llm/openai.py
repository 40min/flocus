import openai

from app.clients.llm.base import LLMClient
from app.core.config import settings
from app.core.exceptions import LLMAPIKeyNotConfiguredError, LLMGenerationError


class OpenAIClient(LLMClient):
    def __init__(self):
        if not settings.LLM_API_KEY:
            raise LLMAPIKeyNotConfiguredError()
        self.client = openai.AsyncOpenAI(api_key=settings.LLM_API_KEY)
        self.model_name = settings.LLM_MODEL_NAME if settings.LLM_MODEL_NAME else "gpt-4.1-nano"

    async def generate_text(self, prompt: str) -> str:
        try:
            response = await self.client.chat.completions.create(
                model=self.model_name, messages=[{"role": "user", "content": prompt}]
            )
            if response.choices and response.choices[0].message and response.choices[0].message.content:
                suggestion = response.choices[0].message.content.strip()
                if suggestion.startswith("Error:"):
                    raise LLMGenerationError(detail=suggestion)
                return suggestion
            else:
                raise LLMGenerationError(detail="OpenAI API call failed to return a valid response.")
        except openai.APIError as e:
            raise LLMGenerationError(detail=f"OpenAI API error: {str(e)}")
        except Exception as e:
            raise LLMGenerationError(detail=f"An unexpected error occurred with OpenAI: {str(e)}")
