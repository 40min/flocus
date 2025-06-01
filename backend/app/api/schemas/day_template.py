from typing import List, Optional

from odmantic import ObjectId
from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.api.schemas.time_window import TimeWindowInputSchema, TimeWindowResponse


# Helper function to validate time window overlaps
def _ensure_time_windows_do_not_overlap(time_windows_list: List[TimeWindowInputSchema]) -> None:
    """Checks if any time windows in the list overlap. Raises ValueError if they do."""
    if not time_windows_list or len(time_windows_list) < 2:
        return  # No overlap possible with 0 or 1 window

    # Sort by start_time to check adjacent windows
    sorted_windows = sorted(time_windows_list, key=lambda tw: tw.start_time)

    for i in range(len(sorted_windows) - 1):
        current_window = sorted_windows[i]
        next_window = sorted_windows[i + 1]
        # Check for overlap: next window starts before current one ends
        if next_window.start_time < current_window.end_time:
            raise ValueError(
                f"Time windows overlap: '{current_window.name}' ({current_window.start_time}-{current_window.end_time})"
                f" and '{next_window.name}' ({next_window.start_time}-{next_window.end_time})"
            )


class DayTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)


class DayTemplateCreateRequest(DayTemplateBase):
    time_windows: List[TimeWindowInputSchema] = Field(default_factory=list)

    @model_validator(mode="after")
    def check_time_windows_do_not_overlap(self) -> "DayTemplateCreateRequest":
        _ensure_time_windows_do_not_overlap(self.time_windows)
        return self


class DayTemplateUpdateRequest(BaseModel):  # Allow partial updates
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    time_windows: Optional[List[TimeWindowInputSchema]] = None  # Replace entire list of time windows

    @model_validator(mode="after")
    def check_time_windows_do_not_overlap(self) -> "DayTemplateUpdateRequest":
        if self.time_windows is not None:
            _ensure_time_windows_do_not_overlap(self.time_windows)
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
