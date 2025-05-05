from odmantic import Model, Field as ODMField
from pydantic import EmailStr, ConfigDict

class User(Model):
    """Database model for users"""
    username: str = ODMField(unique=True)
    email: EmailStr
    first_name: str
    last_name: str
    hashed_password: str
    is_active: bool = ODMField(default=True)
    is_verified: bool = ODMField(default=False)

    model_config = ConfigDict(collection="users")