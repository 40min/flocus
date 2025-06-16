from datetime import date
from typing import Optional  # Added date

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


# --- Resource Access Exceptions ---


class ResourceAccessException(HTTPException):
    """Base exception for resource access related errors"""

    pass


class NotOwnerException(ResourceAccessException):
    def __init__(self, resource: str = "resource", detail_override: Optional[str] = None):
        detail_to_use = detail_override if detail_override is not None else f"Not authorized to access this {resource}"
        super().__init__(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=detail_to_use,
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


class TimeWindowNameExistsException(DayTemplateServiceException):
    def __init__(self, name: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Active time window with name '{name}' already exists for this user.",
        )


class InvalidTimeWindowTimesException(DayTemplateServiceException):
    def __init__(self, detail: str = "end_time must be greater than start_time"):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=detail,
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


# --- Task Service Exceptions ---


class TaskServiceException(HTTPException):
    """Base exception for task service related errors"""

    pass


class TaskNotFoundException(TaskServiceException):
    """
    Exception raised when a task is not found.

    The `detail` message can be overridden. For instance, when a task
    is soft-deleted, the `TaskService` raises this exception with the
    detail message "Task has been deleted."
    """

    def __init__(self, task_id: Optional[ObjectId | str] = None, detail: Optional[str] = None):
        if detail is None:
            if task_id:
                detail = f"Task with ID '{task_id}' not found"
            else:
                detail = "Task not found"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
        )


class TaskTitleExistsException(TaskServiceException):
    def __init__(self, title: str):
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"An active task with title '{title}' already exists for this user",
        )


# --- Daily Plan Service Exceptions ---


class DailyPlanServiceException(HTTPException):
    """Base exception for daily plan service related errors"""

    pass


class DailyPlanNotFoundException(DailyPlanServiceException):
    def __init__(self, plan_date: Optional[date] = None, plan_id: Optional[ObjectId | str] = None):
        detail = "Daily plan not found"
        if plan_date:
            detail = f"Daily plan for date '{plan_date.isoformat()}' not found"
        elif plan_id:
            detail = f"Daily plan with ID '{str(plan_id)}' not found"
        super().__init__(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=detail,
        )


class DailyPlanExistsException(DailyPlanServiceException):
    def __init__(self, date_value: date):  # Renamed date to date_value to avoid conflict
        super().__init__(
            status_code=status.HTTP_409_CONFLICT,
            detail=f"Daily plan for date '{date_value.isoformat()}' already exists for this user",
        )


class TaskCategoryMismatchException(DailyPlanServiceException):
    """Raised when a task's category does not match the category of its assigned time window."""

    def __init__(self, detail: str = "Task category does not match Time Window category."):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


# --- Mapper Exceptions ---


class MapperException(Exception):
    """Base exception for data mapping errors that indicate an internal inconsistency."""

    pass


class MissingCategoryInMappingError(MapperException):
    def __init__(self, category_id: ObjectId, template_id: ObjectId):
        super().__init__(
            f"Category with ID '{category_id}' was not found in the provided categories map "
            f"during mapping for DayTemplate ID '{template_id}'. "
            "This indicates an internal inconsistency, as the service layer should pre-fetch all necessary categories."
        )


# --- LLM Service Exceptions ---


class LLMServiceError(HTTPException):
    """Base exception for LLM service related errors"""

    def __init__(self, status_code: int, detail: str):
        super().__init__(status_code=status_code, detail=detail)


class TaskDataMissingError(LLMServiceError):
    """Raised when required task data (e.g., title for generation) is missing for an LLM action."""

    def __init__(self, detail: str = "Required task data is missing for LLM action."):
        super().__init__(status_code=status.HTTP_400_BAD_REQUEST, detail=detail)


class LLMGenerationError(LLMServiceError):
    """Raised when an error occurs during the LLM text generation/improvement process itself."""

    def __init__(self, detail: str = "Error during LLM text generation."):
        # This could be a 500 if it's an unexpected LLM provider error,
        # or a 502/503 if it's a gateway/service unavailable issue from the LLM provider.
        # For simplicity, using 500 for now, but can be refined.
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)


class LLMAPIKeyNotConfiguredError(LLMServiceError):
    """Raised when the LLM API key is not configured."""

    def __init__(self, detail: str = "LLM API key is not configured."):
        super().__init__(status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, detail=detail)
