from bson import ObjectId
from bson.errors import InvalidId
from fastapi import Depends, HTTPException, Path
from fastapi.security import OAuth2PasswordBearer

from app.db.models.user import User
from app.services.user_service import UserService

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/users/login")  # Adjusted tokenUrl based on typical structure


async def get_current_user(
    token: str = Depends(oauth2_scheme), user_service: UserService = Depends(UserService)
) -> User:
    """
    Dependency to get the current authenticated user from a token.
    """
    return await user_service.get_current_user_from_token(token)


async def get_current_active_user_id(current_user: User = Depends(get_current_user)) -> ObjectId:
    """
    Dependency to get the ID of the current authenticated and active user.
    Placeholder for active check if needed in future.
    """
    # if not current_user.is_active: # Assuming User model has is_active
    #     raise HTTPException(status_code=400, detail="Inactive user")
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
