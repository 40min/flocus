from odmantic import Model, Reference  # Keep Reference
from pydantic import ConfigDict

from app.db.models.category import Category
from app.db.models.user import User


class TimeWindow(Model):
    """Database model for Time Windows"""

    name: str
    start_time: int  # Changed to integer (minutes from start of day)
    end_time: int  # Changed to integer (minutes from start of day)
    category: Category = Reference()
    user: User = Reference()

    model_config = ConfigDict(collection="time_windows")
