from typing import Optional

from app.api.schemas.llm import LLMImprovementResponse
from app.clients.llm.base import LLMClient
from app.core.config import settings
from app.core.enums import LLMActionType
from app.core.exceptions import LLMGenerationError, LLMInputValidationError, LLMServiceError


class LLMService:
    def __init__(self, llm_client: LLMClient):
        self.llm_client = llm_client

    async def process_llm_action(
        self, action: LLMActionType, title: Optional[str] = None, description: Optional[str] = None
    ) -> LLMImprovementResponse:
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
                base_prompt_override = (
                    "Improve the following task description to make it more concise and informative. "
                    "Ensure the output is in markdown format, preserving any existing markdown links or formatting."
                )
                improved_text = await self.improve_text(text_to_improve, base_prompt_override)
                response.improved_description = improved_text
            case LLMActionType.GENERATE_DESCRIPTION_FROM_TITLE:
                if not title:
                    raise LLMInputValidationError("Title is required for 'generate_description_from_title' action.")
                text_to_improve = f"Task Title: {title}"
                base_prompt_override = (
                    "Based on the following task title, generate a concise and informative task description. "
                    "Ensure the output is in markdown format, including any relevant links or formatting."
                )
                improved_text = await self.improve_text(text_to_improve, base_prompt_override)
                response.improved_description = improved_text
            case _:
                raise LLMServiceError(status_code=400, detail=f"Unknown or unsupported LLM action: {action}")

        return response

    async def improve_text(self, text_to_process: str, base_prompt_override: Optional[str] = None) -> str:
        prompt_to_use = base_prompt_override or settings.LLM_TEXT_IMPROVEMENT_PROMPT
        full_prompt_for_llm = f"{prompt_to_use}\n\n---\n\n{text_to_process}"

        try:
            return await self.llm_client.generate_text(full_prompt_for_llm)
        except LLMGenerationError as e:
            raise e
        except Exception as e:
            raise LLMServiceError(
                status_code=500, detail=f"An unexpected error occurred while contacting the LLM provider: {str(e)}"
            )
