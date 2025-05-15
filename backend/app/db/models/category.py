from typing import Optional

from bson import ObjectId
from odmantic import Index, Model  # Added Index import


class Category(Model):
    """Database model for Categories"""

    name: str
    description: Optional[str] = None
    color: Optional[str] = None  # e.g., #RRGGBB
    user: ObjectId

    model_config = {
        "collection": "categories",
        "indexes": lambda: [
            Index(Category.user, Category.name, unique=True),
        ],
    }
