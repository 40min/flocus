from datetime import time as time_type
from typing import Optional

from odmantic import ObjectId
from pydantic import BaseModel, ConfigDict

from .category import CategoryResponse  # Import CategoryResponse


class TimeWindowBase(BaseModel):
    start_time: time_type
    end_time: time_type
    category: ObjectId  # Reference Category by ObjectId


class TimeWindowCreateRequest(TimeWindowBase):
    pass


class TimeWindowUpdateRequest(BaseModel):  # Allow partial updates
    start_time: Optional[time_type] = None
    end_time: Optional[time_type] = None
    category: Optional[ObjectId] = None  # Allow updating category reference


class TimeWindowResponse(TimeWindowBase):
    id: ObjectId  # Use ObjectId for the ID
    user: ObjectId  # Changed from user_id to user, type is ObjectId
    category: CategoryResponse  # Nested category details

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)
