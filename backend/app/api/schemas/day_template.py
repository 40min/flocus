from typing import List, Optional

from odmantic import ObjectId
from pydantic import BaseModel, ConfigDict, Field

from .time_window import TimeWindowResponse  # Import TimeWindowResponse


class DayTemplateBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)


class DayTemplateCreateRequest(DayTemplateBase):
    time_windows: List[ObjectId] = []  # List of TimeWindow ObjectIds to associate


class DayTemplateUpdateRequest(BaseModel):  # Allow partial updates
    name: Optional[str] = Field(None, min_length=1, max_length=100)
    description: Optional[str] = Field(None, max_length=255)
    time_windows: Optional[List[ObjectId]] = None  # Allow updating associated time windows by ObjectId


class DayTemplateResponse(DayTemplateBase):
    id: ObjectId  # Use ObjectId for the ID
    time_windows: List[TimeWindowResponse] = []  # Include full TimeWindow details

    model_config = ConfigDict(from_attributes=True, arbitrary_types_allowed=True)
