from typing import Optional

from odmantic import Field, Model
from pydantic import ConfigDict


class Category(Model):
    """Database model for Categories"""

    name: str = Field(unique=True, index=True)
    description: Optional[str] = None
    color: Optional[str] = None  # e.g., #RRGGBB

    model_config = ConfigDict(collection="categories")
