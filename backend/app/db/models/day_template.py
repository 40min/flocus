from typing import List, Optional

from bson import ObjectId
from odmantic import Field, Index, Model  # Reference removed
from pydantic import ConfigDict

# from app.db.models.time_window import TimeWindow # No longer needed for direct type hint
# from app.db.models.user import User # No longer needed for direct type hint


class DayTemplate(Model):
    """Database model for Day Templates"""

    name: str = Field(index=True)  # Removed unique=True, kept index for querying
    description: Optional[str] = None
    time_windows: List[ObjectId] = Field(default_factory=list)  # List of ObjectId references to TimeWindow
    user: ObjectId  # Was: user: User = Reference()

    model_config = ConfigDict(
        collection="day_templates", indexes=[Index("user", "name", unique=True)]  # Use field names as strings
    )
