from bson import ObjectId
from odmantic import Field, Index, Model


class TimeWindow(Model):
    """Database model for Time Windows"""

    name: str
    start_time: int
    end_time: int
    category: ObjectId
    user: ObjectId
    day_template_id: ObjectId
    is_deleted: bool = Field(default=False)

    model_config = {
        "collection": "time_windows",
        "indexes": lambda: [
            Index(TimeWindow.user, TimeWindow.name, TimeWindow.is_deleted, unique=True),
            Index(TimeWindow.day_template_id),
            Index(TimeWindow.user, TimeWindow.is_deleted),
        ],
    }
