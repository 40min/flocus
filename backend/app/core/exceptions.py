from typing import Optional

from fastapi import HTTPException, status
from odmantic import ObjectId


class UserServiceException(HTTPException):
    """Base exception for user service related errors"""

    pass


class UserNotFoundException(UserServiceException):
    def __init__(self, detail: str = "User not found"):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
        )


class EmailAlreadyExistsException(UserServiceException):
    def __init__(self, email: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with email {email} already exists",
        )


class InvalidCredentialsException(UserServiceException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )


class NotAuthenticatedException(UserServiceException):
    def __init__(self):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )


class ForbiddenException(UserServiceException):
    def __init__(self, detail: str = "The user doesn't have enough privileges"):
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail,
        )


class UnprocessableEntityException(UserServiceException):
    def __init__(self, detail: str = "Unprocessable Entity"):
        super().__init__(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=detail,
        )


class UsernameAlreadyExistsException(UserServiceException):
    def __init__(self, username: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"User with username {username} already exists",
        )


class InvalidTokenException(UserServiceException):
    def __init__(self, detail: str = "Invalid token"):
        super().__init__(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=detail,
            headers={"WWW-Authenticate": "Bearer"},
        )


# --- Day Template Service Exceptions ---


class DayTemplateServiceException(HTTPException):
    """Base exception for day template service related errors"""

    pass


class DayTemplateNameExistsException(DayTemplateServiceException):
    def __init__(self, name: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Day template with name '{name}' already exists for this user",
        )


class TimeWindowNotFoundException(DayTemplateServiceException):
    def __init__(self, time_window_id: ObjectId | str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Time window with ID '{time_window_id}' not found",
        )


class DayTemplateNotFoundException(DayTemplateServiceException):
    def __init__(self, template_id: ObjectId | str):
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Day template with ID '{template_id}' not found",
        )


class CategoryNotFoundException(DayTemplateServiceException):
    def __init__(self, category_id: Optional[ObjectId | str] = None, detail: Optional[str] = None):
        if detail is None:
            detail = f"Category with ID '{category_id}' not found" if category_id else "Category not found"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
        )


class NotOwnerException(
    DayTemplateServiceException
):  # Or a more generic base? For now, under DayTemplateServiceException
    def __init__(self, resource: str = "resource", detail_override: Optional[str] = None):  # Add detail_override
        detail_to_use = detail_override if detail_override is not None else f"Not authorized to access this {resource}"
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail_to_use,  # Use the determined detail
        )


class TimeWindowNameExistsException(DayTemplateServiceException):
    def __init__(self, name: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Active time window with name '{name}' already exists for this user.",
        )


# --- Category Service Exceptions ---


class CategoryServiceException(HTTPException):
    """Base exception for category service related errors"""

    pass


class CategoryNameExistsException(CategoryServiceException):
    def __init__(self, name: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST, detail=f"Category with name '{name}' already exists for this user"
        )
