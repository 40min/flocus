from typing import List, Optional

from odmantic import Field, Model, Reference
from pydantic import ConfigDict

from .time_window import TimeWindow  # Import TimeWindow for the reference


class DayTemplate(Model):
    """Database model for Day Templates"""

    name: str = Field(unique=True, index=True)
    description: Optional[str] = None
    time_windows: List[Reference[TimeWindow]] = []  # List of references to TimeWindows

    model_config = ConfigDict(collection="day_templates")
