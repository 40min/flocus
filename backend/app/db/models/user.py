from odmantic import EmbeddedModel
from odmantic import Field as ODMField
from odmantic import Model
from pydantic import ConfigDict, EmailStr


class UserPreferences(EmbeddedModel):
    """User-specific preferences"""

    pomodoro_timeout_minutes: int = ODMField(default=25)
    system_notifications_enabled: bool = ODMField(default=True)


class User(Model):
    """Database model for users"""

    username: str = ODMField(unique=True)
    email: EmailStr = ODMField(unique=True)
    preferences: UserPreferences = ODMField(default_factory=UserPreferences)
    first_name: str
    last_name: str
    hashed_password: str
    is_active: bool = ODMField(default=True)
    is_verified: bool = ODMField(default=False)

    model_config = ConfigDict(collection="users")
