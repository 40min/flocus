from odmantic import Field as ODMField
from odmantic import Model
from pydantic import ConfigDict, EmailStr


class User(Model):
    """Database model for users"""

    username: str = ODMField(unique=True)
    email: EmailStr = ODMField(unique=True)
    first_name: str
    last_name: str
    hashed_password: str
    is_active: bool = ODMField(default=True)
    is_verified: bool = ODMField(default=False)

    model_config = ConfigDict(collection="users")
