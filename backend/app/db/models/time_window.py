from datetime import time as time_type

from odmantic import Model, Reference
from pydantic import ConfigDict

from .category import Category  # Import Category for the reference


class TimeWindow(Model):
    """Database model for Time Windows"""

    start_time: time_type
    end_time: time_type
    category: Reference[Category]  # Link to Category

    model_config = ConfigDict(collection="time_windows")
