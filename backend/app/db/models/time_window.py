from bson import ObjectId
from odmantic import Field, Index, Model  # Added Index import, Field

# from app.db.models.category import Category # No longer needed for direct type hint
# from app.db.models.user import User # No longer needed for direct type hint


class TimeWindow(Model):
    """Database model for Time Windows"""

    name: str
    start_time: int  # Changed to integer (minutes from start of day)
    end_time: int  # Changed to integer (minutes from start of day)
    category: ObjectId
    user: ObjectId
    day_template_id: ObjectId  # Added field for the parent DayTemplate
    is_deleted: bool = Field(default=False)

    model_config = {
        "collection": "time_windows",
        "indexes": lambda: [
            Index(TimeWindow.user, TimeWindow.name, TimeWindow.is_deleted, unique=True),
            Index(TimeWindow.day_template_id),
        ],
    }
