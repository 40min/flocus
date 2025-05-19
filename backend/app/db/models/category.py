from typing import Optional

from bson import ObjectId
from odmantic import Index, Model  # Added Index import


class Category(Model):
    """Database model for Categories"""

    name: str
    description: Optional[str] = None
    color: Optional[str] = None  # e.g., #RRGGBB
    user: ObjectId
    is_deleted: bool = False

    model_config = {
        "collection": "categories",
        "indexes": lambda: [
            Index(Category.user, Category.name, Category.is_deleted, unique=True),
        ],
    }
