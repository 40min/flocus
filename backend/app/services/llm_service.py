from typing import Optional

import google.generativeai as genai
import openai

from app.core.config import settings
from app.core.enums import LLMProvider
from app.core.exceptions import LLMAPIKeyNotConfiguredError, LLMGenerationError, LLMServiceError


class LLMService:

    async def improve_text(self, text_to_process: str, base_prompt_override: Optional[str] = None) -> str:
        if not settings.LLM_API_KEY:
            raise LLMAPIKeyNotConfiguredError()

        prompt_to_use = base_prompt_override or settings.LLM_TEXT_IMPROVEMENT_PROMPT
        # Using a separator to clearly distinguish the instruction/prompt from the text to be processed.
        # The specific separator "---" is arbitrary but clear.
        full_prompt_for_llm = f"{prompt_to_use}\n\n---\n\n{text_to_process}"

        try:
            match settings.LLM_PROVIDER:
                case str(LLMProvider.OPENAI):
                    openai_model_name = settings.LLM_MODEL_NAME if settings.LLM_MODEL_NAME else "gpt-3.5-turbo"
                    client = openai.AsyncOpenAI(api_key=settings.LLM_API_KEY)
                    response = await client.chat.completions.create(
                        model=openai_model_name, messages=[{"role": "user", "content": full_prompt_for_llm}]
                    )
                    if response.choices and response.choices[0].message and response.choices[0].message.content:
                        return response.choices[0].message.content.strip()
                    else:
                        raise LLMGenerationError(detail="OpenAI API call failed to return a valid response.")
                case str(LLMProvider.GOOGLE_GEMINI):
                    gemini_model_name = settings.LLM_MODEL_NAME if settings.LLM_MODEL_NAME else "gemini-pro"
                    genai.configure(api_key=settings.LLM_API_KEY)
                    model = genai.GenerativeModel(gemini_model_name)
                    response = await model.generate_content_async(full_prompt_for_llm)
                    # Ensure response.text is not None before stripping
                    if response.text:
                        return response.text.strip()
                    else:
                        raise LLMGenerationError(detail="GoogleGemini API call failed to return valid text.")
                case _:
                    raise LLMServiceError(status_code=500, detail=f"Unknown LLM_PROVIDER: {settings.LLM_PROVIDER}")

        except (openai.APIError, genai.types.BlockedPromptException, genai.types.StopCandidateException) as e:
            raise LLMGenerationError(detail=f"LLM provider API error: {str(e)}")
        except Exception as e:
            raise LLMServiceError(
                status_code=500, detail=f"An unexpected error occurred while contacting the LLM provider: {str(e)}"
            )
