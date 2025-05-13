from datetime import time as time_type

from odmantic import Model, Reference  # Keep Reference
from pydantic import ConfigDict

from app.db.models.category import Category
from app.db.models.user import User


class TimeWindow(Model):
    """Database model for Time Windows"""

    start_time: time_type
    end_time: time_type
    category: Category = Reference()  # Corrected reference definition
    user: User = Reference()  # Corrected reference definition

    model_config = ConfigDict(collection="time_windows")
