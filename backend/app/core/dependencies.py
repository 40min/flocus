from bson import ObjectId
from bson.errors import InvalidId
from fastapi import HTTPException, Path, Query, Body


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


def get_validated_user_id(user_id: str = Path(..., alias="user_id", description="The ID of the user to retrieve.")) -> ObjectId:
    """Dependency function to get and validate the user_id path parameter."""
    return validate_object_id(user_id)