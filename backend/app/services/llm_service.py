from typing import Optional

import google.generativeai as genai
import openai

from app.api.schemas.llm import LLMImprovementResponse # Added back
from app.core.config import settings
from app.core.enums import LLMActionType, LLMProvider
from app.core.exceptions import (
    LLMAPIKeyNotConfiguredError,
    LLMGenerationError,
    LLMInputValidationError,
    LLMServiceError,
)


class LLMService:

    async def process_llm_action(
        self, action: LLMActionType, title: Optional[str] = None, description: Optional[str] = None
    ) -> LLMImprovementResponse: # Changed back to LLMImprovementResponse
        text_to_improve = ""
        base_prompt_override = None
        response = LLMImprovementResponse()

        match action:
            case LLMActionType.IMPROVE_TITLE:
                if not title:
                    raise LLMInputValidationError("Title is required for 'improve_title' action.")
                text_to_improve = title
                base_prompt_override = "Improve the following task title to make it more concise and informative:"
                improved_text = await self.improve_text(text_to_improve, base_prompt_override)
                response.improved_title = improved_text
            case LLMActionType.IMPROVE_DESCRIPTION:
                if description is None:
                    raise LLMInputValidationError("Description is required for 'improve_description' action.")
                text_to_improve = description
                base_prompt_override = "Improve the following task description to make it more concise and informative:"
                improved_text = await self.improve_text(text_to_improve, base_prompt_override)
                response.improved_description = improved_text
            case LLMActionType.GENERATE_DESCRIPTION_FROM_TITLE:
                if not title:
                    raise LLMInputValidationError(
                        "Title is required for 'generate_description_from_title' action."
                    )
                text_to_improve = f"Task Title: {title}"
                base_prompt_override = (
                    "Based on the following task title, generate a concise and informative task description:"
                )
                improved_text = await self.improve_text(text_to_improve, base_prompt_override)
                response.improved_description = improved_text
            case _:
                # This case should ideally not be reached if action is validated at API level,
                # but as a safeguard:
                # Using LLMServiceError directly as this is not an input validation but an unknown state.
                raise LLMServiceError(status_code=400, detail=f"Unknown or unsupported LLM action: {action}")

        return response

    async def _call_openai(self, full_prompt_for_llm: str) -> str:
        openai_model_name = settings.LLM_MODEL_NAME if settings.LLM_MODEL_NAME else "gpt-3.5-turbo"
        client = openai.AsyncOpenAI(api_key=settings.LLM_API_KEY)
        response = await client.chat.completions.create(
            model=openai_model_name, messages=[{"role": "user", "content": full_prompt_for_llm}]
        )
        if response.choices and response.choices[0].message and response.choices[0].message.content:
            suggestion = response.choices[0].message.content.strip()
            if suggestion.startswith("Error:"):
                raise LLMGenerationError(detail=suggestion)
            return suggestion
        else:
            raise LLMGenerationError(detail="OpenAI API call failed to return a valid response.")

    async def _call_google_gemini(self, full_prompt_for_llm: str) -> str:
        gemini_model_name = settings.LLM_MODEL_NAME if settings.LLM_MODEL_NAME else "gemini-pro"
        genai.configure(api_key=settings.LLM_API_KEY)
        model = genai.GenerativeModel(gemini_model_name)
        response = await model.generate_content_async(full_prompt_for_llm)
        # Ensure response.text is not None before stripping
        if response.text:
            suggestion = response.text.strip()
            if suggestion.startswith("Error:"):
                raise LLMGenerationError(detail=suggestion)
            return suggestion
        else:
            raise LLMGenerationError(detail="GoogleGemini API call failed to return valid text.")

    async def improve_text(self, text_to_process: str, base_prompt_override: Optional[str] = None) -> str:
        if not settings.LLM_API_KEY:
            raise LLMAPIKeyNotConfiguredError()

        prompt_to_use = base_prompt_override or settings.LLM_TEXT_IMPROVEMENT_PROMPT
        # Using a separator to clearly distinguish the instruction/prompt from the text to be processed.
        # The specific separator "---" is arbitrary but clear.
        full_prompt_for_llm = f"{prompt_to_use}\n\n---\n\n{text_to_process}"

        try:
            if settings.LLM_PROVIDER == str(LLMProvider.OPENAI):
                return await self._call_openai(full_prompt_for_llm)
            elif settings.LLM_PROVIDER == str(LLMProvider.GOOGLE_GEMINI):
                return await self._call_google_gemini(full_prompt_for_llm)
            else:
                raise LLMServiceError(status_code=500, detail=f"Unknown LLM_PROVIDER: {settings.LLM_PROVIDER}")

        except (LLMGenerationError, LLMAPIKeyNotConfiguredError, LLMServiceError) as e:
            # Re-raise known exceptions directly
            raise e
        except (openai.APIError, genai.types.BlockedPromptException, genai.types.StopCandidateException) as e:
            raise LLMGenerationError(detail=f"LLM provider API error: {str(e)}")
        except Exception as e:
            # Catch any other exceptions and wrap them in LLMServiceError
            raise LLMServiceError(
                status_code=500, detail=f"An unexpected error occurred while contacting the LLM provider: {str(e)}"
            )
