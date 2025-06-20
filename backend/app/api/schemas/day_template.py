from typing import List, Optional

from odmantic import ObjectId
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.api.schemas.time_window import TimeWindowInputSchema, TimeWindowResponse
from app.api.schemas.utils import ensure_time_windows_do_not_overlap


class DayTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)


class DayTemplateCreateRequest(DayTemplateBase):
    time_windows: List[TimeWindowInputSchema] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_time_windows_do_not_overlap(self) -> "DayTemplateCreateRequest":
        ensure_time_windows_do_not_overlap(self.time_windows)
        return self


class DayTemplateUpdateRequest(BaseModel):  # Allow partial updates
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    time_windows: Optional[List[TimeWindowInputSchema]] = None  # Replace entire list of time windows

    @model_validator(mode="after")
    def check_time_windows_do_not_overlap(self) -> "DayTemplateUpdateRequest":
        if self.time_windows is not None:
            ensure_time_windows_do_not_overlap(self.time_windows)
        return self


class DayTemplateResponse(DayTemplateBase):
    id: ObjectId
    user_id: ObjectId  # Changed from user: UserResponse
    time_windows: List[TimeWindowResponse] = []

    # @computed_field removed as user_id is now a direct field

    model_config = ConfigDict(
        from_attributes=True,  # Will pick up template.user.id if template.user is a User model
        arbitrary_types_allowed=True,
    )
