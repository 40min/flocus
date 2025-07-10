from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException, Path
from fastapi.security import OAuth2PasswordBearer

from app.api.schemas.user import UserResponse
from app.clients.llm.base import LLMClient
from app.clients.llm.google_gemini import GoogleGeminiClient
from app.clients.llm.openai import OpenAIClient
from app.core.config import settings
from app.core.enums import LLMProvider
from app.core.exceptions import LLMServiceError
from app.services.llm_service import LLMService
from app.services.user_service import UserService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/users/login")


async def get_current_user(
    token: str = Depends(oauth2_scheme), user_service: UserService = Depends(UserService)
) -> UserResponse:
    """
    Dependency to get the current authenticated user from a token.
    """
    return await user_service.get_current_user_from_token(token)


async def get_current_active_user_id(current_user: UserResponse = Depends(get_current_user)) -> ObjectId:
    """
    Dependency to get the ID of the current authenticated and active user.
    Placeholder for active check if needed in future.
    """
    return current_user.id


def validate_object_id(id_value: str) -> ObjectId:
    """
    Validates if a string is a valid MongoDB ObjectId and returns it.

    Args:
        id_value: The string value to validate.

    Raises:
        HTTPException (400): If the id_value is not a valid ObjectId format.

    Returns:
        The validated ObjectId instance.
    """
    try:
        return ObjectId(id_value)
    except InvalidId:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid ID format: '{id_value}'. ID must be a 24-character hexadecimal string.",
        )


def get_validated_user_id(
    user_id: str = Path(..., alias="user_id", description="The ID of the user to retrieve.")
) -> ObjectId:
    """Dependency function to get and validate a user_id from a path parameter."""
    return validate_object_id(user_id)


def get_llm_client() -> LLMClient:
    if settings.LLM_PROVIDER == str(LLMProvider.OPENAI):
        return OpenAIClient()
    elif settings.LLM_PROVIDER == str(LLMProvider.GOOGLE_GEMINI):
        return GoogleGeminiClient()
    else:
        raise LLMServiceError(status_code=500, detail=f"Unknown LLM_PROVIDER: {settings.LLM_PROVIDER}")


def get_llm_service(llm_client: LLMClient = Depends(get_llm_client)) -> LLMService:
    return LLMService(llm_client)
