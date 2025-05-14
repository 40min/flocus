from typing import List, Optional

from odmantic import Field, Index, Model, Reference  # Added Index
from pydantic import ConfigDict

from app.db.models.time_window import TimeWindow
from app.db.models.user import User


class DayTemplate(Model):
    """Database model for Day Templates"""

    name: str = Field(index=True)  # Removed unique=True, kept index for querying
    description: Optional[str] = None
    time_windows: List[TimeWindow] = Field(default_factory=list)  # List of referenced TimeWindow objects
    user: User = Reference()  # Corrected reference definition

    model_config = ConfigDict(
        collection="day_templates", indexes=[Index("user", "name", unique=True)]  # Use field names as strings
    )
