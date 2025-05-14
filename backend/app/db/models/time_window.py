from bson import ObjectId
from odmantic import Model  # Reference removed
from pydantic import ConfigDict

# from app.db.models.category import Category # No longer needed for direct type hint
# from app.db.models.user import User # No longer needed for direct type hint


class TimeWindow(Model):
    """Database model for Time Windows"""

    name: str
    start_time: int  # Changed to integer (minutes from start of day)
    end_time: int  # Changed to integer (minutes from start of day)
    category: ObjectId  # Was: category: Category = Reference()
    user: ObjectId  # Was: user: User = Reference()

    model_config = ConfigDict(collection="time_windows")
