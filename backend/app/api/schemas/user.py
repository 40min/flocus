from typing import Optional

from bson import ObjectId
from pydantic import BaseModel, ConfigDict, EmailStr
from pydantic import Field as PydanticField
from pydantic import field_validator


class UserBase(BaseModel):
    """Base schema for user data shared between requests and responses"""

    email: EmailStr = PydanticField(..., description="User's email address")
    first_name: str = PydanticField(..., min_length=1, description="User's first name")
    last_name: str = PydanticField(..., min_length=1, description="User's last name")


class UserCreateRequest(UserBase):
    """Schema for user creation requests"""

    username: str = PydanticField(..., min_length=3, description="Unique username")
    password: str = PydanticField(..., min_length=8, description="User's password")

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: str) -> str:
        return value.lower()


class UserUpdateRequest(BaseModel):
    """Schema for user update requests"""

    email: Optional[EmailStr] = None
    first_name: Optional[str] = PydanticField(None, min_length=1)
    last_name: Optional[str] = PydanticField(None, min_length=1)
    password: Optional[str] = PydanticField(None, min_length=8)

    @field_validator("email")
    @classmethod
    def normalize_email(cls, value: Optional[EmailStr]) -> Optional[EmailStr]:
        if value:
            return value.lower()
        return value


class UserResponse(UserBase):
    """Schema for user responses"""

    id: str  # Keep as str, validation will handle conversion
    username: str

    @field_validator("id", mode="before")
    @classmethod
    def convert_objectid_to_str(cls, value):
        if isinstance(value, ObjectId):
            return str(value)
        return value

    model_config = ConfigDict(
        from_attributes=True,
        # json_encoders are for serialization, not validation input
        # ObjectId to str conversion for output is still good.
        json_encoders={
            ObjectId: lambda v: str(v),
        },
    )
