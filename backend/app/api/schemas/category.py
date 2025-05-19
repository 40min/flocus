from typing import Optional

from odmantic import ObjectId
from pydantic import BaseModel, ConfigDict, Field


class CategoryBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    color: Optional[str] = Field(None, max_length=7)  # e.g., #RRGGBB
    # user field will be added to specific request/response schemas


class CategoryCreateRequest(CategoryBase):
    # user: ObjectId # This field is implicitly handled by the service layer using current_user
    pass


class CategoryUpdateRequest(BaseModel):  # Allow partial updates for all fields
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    color: Optional[str] = Field(None, max_length=7)
    # user: Optional[ObjectId] = None # User of a category is not typically updatable


class CategoryResponse(CategoryBase):
    id: ObjectId  # Use ObjectId for the ID
    user_id: ObjectId = Field(..., alias="user")
    is_deleted: bool = False

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)
