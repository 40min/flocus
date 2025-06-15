import os
from typing import List, Optional

from fastmcp import FastMCP
from motor.motor_asyncio import AsyncIOMotorClient
from odmantic import AIOEngine, ObjectId
from pydantic import Field

from app.api.schemas.category import CategoryCreateRequest, CategoryResponse, CategoryUpdateRequest
from app.api.schemas.task import TaskCreateRequest, TaskPriority, TaskResponse, TaskStatus, TaskUpdateRequest
from app.core.config import settings
from app.services.category_service import CategoryService
from app.services.task_service import TaskService

# TODO: Implement proper user authentication for MCP tools.
MCP_USER_ID = os.getenv("MCP_USER_ID")
USER_ID = ObjectId(MCP_USER_ID)

# Initialize FastMCP server
server = FastMCP("Flocus Backend MCP Server")

motor_client = AsyncIOMotorClient(settings.MONGODB_URL)
engine = AIOEngine(client=motor_client, database=settings.MONGODB_DATABASE_NAME)


@server.tool
async def create_category(
    name: str = Field(..., description="Name of the category"),
    description: Optional[str] = Field(None, description="Description of the category"),
) -> CategoryResponse:
    """Create a new category."""
    service = CategoryService(engine)
    category_data = CategoryCreateRequest(name=name, description=description)
    return await service.create_category(category_data=category_data, current_user_id=USER_ID)


@server.tool
async def get_category_by_id(
    category_id: str = Field(..., description="ID of the category to retrieve"),
) -> CategoryResponse:
    """Get a specific category by ID."""
    service = CategoryService(engine)
    return await service.get_category_by_id(category_id=ObjectId(category_id), current_user_id=USER_ID)


@server.tool
async def get_all_categories() -> List[CategoryResponse]:
    """Get all categories for the current user."""
    service = CategoryService(engine)
    return await service.get_all_categories(current_user_id=USER_ID)


@server.tool
async def update_category(
    category_id: str = Field(..., description="ID of the category to update"),
    name: Optional[str] = Field(None, description="New name for the category"),
    description: Optional[str] = Field(None, description="New description for the category"),
) -> CategoryResponse:
    """Update an existing category."""
    service = CategoryService(engine)
    category_data = CategoryUpdateRequest(name=name, description=description)
    return await service.update_category(
        category_id=ObjectId(category_id), category_data=category_data, current_user_id=USER_ID
    )


@server.tool
async def delete_category(
    category_id: str = Field(..., description="ID of the category to delete"),
) -> bool:
    """Delete a category."""
    service = CategoryService(engine)
    return await service.delete_category(category_id=ObjectId(category_id), current_user_id=USER_ID)


@server.tool
async def create_task(
    title: str = Field(..., description="Title of the task"),
    description: Optional[str] = Field(None, description="Description of the task"),
    status: Optional[TaskStatus] = Field(None, description="Status of the task"),
    priority: Optional[TaskPriority] = Field(None, description="Priority of the task"),
    due_date: Optional[str] = Field(None, description="Due date of the task (ISO format)"),
    category_id: Optional[str] = Field(None, description="ID of the category for the task"),
) -> TaskResponse:
    """Create a new task."""
    service = TaskService(engine)
    task_data = TaskCreateRequest(
        title=title,
        description=description,
        status=status,
        priority=priority,
        due_date=due_date,
        category_id=ObjectId(category_id) if category_id else None,
    )
    return await service.create_task(task_data=task_data, current_user_id=USER_ID)


@server.tool
async def get_task_by_id(
    task_id: str = Field(..., description="ID of the task to retrieve"),
) -> TaskResponse:
    """Get a specific task by ID."""
    service = TaskService(engine)
    return await service.get_task_by_id(task_id=ObjectId(task_id), current_user_id=USER_ID)


@server.tool
async def get_all_tasks(
    status_filter: Optional[TaskStatus] = Field(None, description="Filter tasks by status"),
    priority_filter: Optional[TaskPriority] = Field(None, description="Filter tasks by priority"),
    category_id_filter: Optional[str] = Field(None, description="Filter tasks by category ID"),
    sort_by: Optional[str] = Field(
        "due_date", description="Field to sort by (e.g., 'due_date', 'priority', 'created_at')"
    ),
    sort_order: Optional[str] = Field("asc", description="Sort order ('asc' or 'desc')"),
) -> List[TaskResponse]:
    """Get all tasks for the current user with optional filters and sorting."""
    service = TaskService(engine)
    return await service.get_all_tasks(
        current_user_id=USER_ID,
        status_filter=status_filter,
        priority_filter=priority_filter,
        category_id_filter=ObjectId(category_id_filter) if category_id_filter else None,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@server.tool
async def update_task(
    task_id: str = Field(..., description="ID of the task to update"),
    title: Optional[str] = Field(None, description="New title for the task"),
    description: Optional[str] = Field(None, description="New description for the task"),
    status: Optional[TaskStatus] = Field(None, description="New status for the task"),
    priority: Optional[TaskPriority] = Field(None, description="New priority for the task"),
    due_date: Optional[str] = Field(None, description="New due date for the task (ISO format)"),
    category_id: Optional[str] = Field(None, description="New category ID for the task"),
) -> TaskResponse:
    """Update an existing task."""
    service = TaskService(engine)
    task_data = TaskUpdateRequest(
        title=title,
        description=description,
        status=status,
        priority=priority,
        due_date=due_date,
        category_id=ObjectId(category_id) if category_id else None,
    )
    return await service.update_task(task_id=ObjectId(task_id), task_data=task_data, current_user_id=USER_ID)


@server.tool
async def delete_task(
    task_id: str = Field(..., description="ID of the task to delete"),
) -> bool:
    """Delete a task."""
    service = TaskService(engine)
    return await service.delete_task(task_id=ObjectId(task_id), current_user_id=USER_ID)


if __name__ == "__main__":
    server.run()
