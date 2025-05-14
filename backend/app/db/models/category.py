from typing import Optional

from bson import ObjectId
from odmantic import Field, Model  # Reference removed
from pydantic import ConfigDict

# from app.db.models.user import User # No longer needed for direct type hint


class Category(Model):
    """Database model for Categories"""

    name: str = Field(unique=True, index=True)
    description: Optional[str] = None
    color: Optional[str] = None  # e.g., #RRGGBB
    user: ObjectId  # Was: user: User = Reference()

    model_config = ConfigDict(collection="categories")
