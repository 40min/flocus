from typing import List, Optional

from odmantic import ObjectId
from pydantic import BaseModel, ConfigDict, Field

from .time_window import TimeWindowInputSchema, TimeWindowResponse


class DayTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)


class DayTemplateCreateRequest(DayTemplateBase):
    time_windows: List[TimeWindowInputSchema] = Field(default_factory=list)


class DayTemplateUpdateRequest(BaseModel):  # Allow partial updates
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    time_windows: Optional[List[TimeWindowInputSchema]] = None  # Replace entire list of time windows


class DayTemplateResponse(DayTemplateBase):
    id: ObjectId
    user_id: ObjectId  # Changed from user: UserResponse
    time_windows: List[TimeWindowResponse] = []

    # @computed_field removed as user_id is now a direct field

    model_config = ConfigDict(
        from_attributes=True,  # Will pick up template.user.id if template.user is a User model
        arbitrary_types_allowed=True,
    )
