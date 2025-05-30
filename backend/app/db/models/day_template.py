from typing import List, Optional

from bson import ObjectId
from odmantic import EmbeddedModel, Field, Index, Model  # Added Index import, EmbeddedModel


class EmbeddedTimeWindowSchema(EmbeddedModel):
    """Schema for TimeWindows embedded within DayTemplates."""

    id: ObjectId = Field(default_factory=ObjectId)
    name: str
    start_time: int  # Minutes since midnight
    end_time: int  # Minutes since midnight
    category_id: ObjectId


class DayTemplate(Model):
    """Database model for Day Templates"""

    name: str
    description: Optional[str] = None
    time_windows: List[EmbeddedTimeWindowSchema] = Field(default_factory=list)
    user: ObjectId

    model_config = {
        "collection": "day_templates",
        "indexes": lambda: [
            Index(DayTemplate.user, DayTemplate.name, unique=True),
        ],
    }
