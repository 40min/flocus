from typing import Optional

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, EmailStr
from pydantic import Field as PydanticField
from pydantic import field_serializer


class UserBase(BaseModel):
    """Base schema for user data shared between requests and responses"""

    email: EmailStr = PydanticField(..., description="User's email address")
    first_name: str = PydanticField(..., min_length=1, description="User's first name")
    last_name: str = PydanticField(..., min_length=1, description="User's last name")


class UserCreateRequest(UserBase):
    """Schema for user creation requests"""

    username: str = PydanticField(..., min_length=3, description="Unique username")
    password: str = PydanticField(..., min_length=8, description="User's password")

    @field_serializer("email")
    def serialize_email_to_lower(self, value: str, info) -> str:
        return value.lower()


class UserUpdateRequest(BaseModel):
    """Schema for user update requests"""

    email: Optional[EmailStr] = None
    first_name: Optional[str] = PydanticField(None, min_length=1)
    last_name: Optional[str] = PydanticField(None, min_length=1)
    password: Optional[str] = PydanticField(None, min_length=8)

    @field_serializer("email")
    def serialize_email_to_lower(self, value: Optional[EmailStr], info) -> Optional[EmailStr]:
        if value:
            return value.lower()
        return value


class UserResponse(UserBase):
    """Schema for user responses"""

    id: ObjectId
    username: str

    @field_serializer("id")
    def serialize_id_to_string(self, id_value: ObjectId, info) -> str:
        """Convert ObjectId to string for serialization."""
        return str(id_value)

    model_config = ConfigDict(
        from_attributes=True,
        arbitrary_types_allowed=True,
    )
