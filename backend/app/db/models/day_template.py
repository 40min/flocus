from typing import List, Optional

from bson import ObjectId
from odmantic import Field, Index, Model  # Added Index import

# from app.db.models.time_window import TimeWindow # No longer needed for direct type hint
# from app.db.models.user import User # No longer needed for direct type hint


class DayTemplate(Model):
    """Database model for Day Templates"""

    name: str
    description: Optional[str] = None
    time_windows: List[ObjectId] = Field(default_factory=list)  # List of ObjectId references to TimeWindow
    user: ObjectId

    model_config = {
        "collection": "day_templates",
        "indexes": lambda: [
            Index(DayTemplate.user, DayTemplate.name, unique=True),
        ],
    }
