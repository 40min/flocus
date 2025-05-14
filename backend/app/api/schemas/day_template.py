from typing import List, Optional

from odmantic import ObjectId
from pydantic import BaseModel, ConfigDict, Field, computed_field

from app.db.models.user import User

from .time_window import TimeWindowResponse


class DayTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)


class DayTemplateCreateRequest(DayTemplateBase):
    time_windows: List[ObjectId] = Field(..., min_length=1)  # Require at least one


class DayTemplateUpdateRequest(BaseModel):  # Allow partial updates
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    time_windows: Optional[List[ObjectId]] = None  # Allow updating associated time windows by ObjectId


class DayTemplateResponse(DayTemplateBase):
    id: ObjectId
    user: User  # Add the user field, will be populated by from_attributes
    time_windows: List[TimeWindowResponse] = []

    @computed_field(return_type=ObjectId)
    def user_id(self) -> ObjectId:

        return self.user.id

    model_config = ConfigDict(
        from_attributes=True,
        arbitrary_types_allowed=True,
        fields={"user": {"exclude": True}},  # Exclude the 'user' object from response if only 'user_id' is needed
    )
