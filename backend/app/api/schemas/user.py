from pydantic import EmailStr, BaseModel, Field as PydanticField
from typing import Optional
from bson import ObjectId

class UserBase(BaseModel):
    """Base schema for user data shared between requests and responses"""
    email: EmailStr = PydanticField(..., description="User's email address")
    first_name: str = PydanticField(..., min_length=1, description="User's first name")
    last_name: str = PydanticField(..., min_length=1, description="User's last name")

class UserCreateRequest(UserBase):
    """Schema for user creation requests"""
    username: str = PydanticField(..., min_length=3, description="Unique username")
    password: str = PydanticField(..., min_length=8, description="User's password")

class UserUpdateRequest(BaseModel):
    """Schema for user update requests"""
    email: Optional[EmailStr] = None
    first_name: Optional[str] = PydanticField(None, min_length=1)
    last_name: Optional[str] = PydanticField(None, min_length=1)
    password: Optional[str] = PydanticField(None, min_length=8)

class UserResponse(UserBase):
    """Schema for user responses"""
    id: str
    username: str

    class Config:
        from_attributes = True
        json_encoders = {
            # Convert ObjectId to str for JSON serialization
            ObjectId: lambda v: str(v)
        }