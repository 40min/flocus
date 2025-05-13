from typing import Optional

from odmantic import Field, Model, Reference  # Keep Reference
from pydantic import ConfigDict

from app.db.models.user import User


class Category(Model):
    """Database model for Categories"""

    name: str = Field(unique=True, index=True)
    description: Optional[str] = None
    color: Optional[str] = None  # e.g., #RRGGBB
    user: User = Reference()  # Corrected reference definition

    model_config = ConfigDict(collection="categories")
