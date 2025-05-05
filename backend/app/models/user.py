from odmantic import Model, Field as ODMField
from pydantic import EmailStr, BaseModel, Field as PydanticField, ConfigDict
from typing import Optional

# REST API Schemas
class UserBase(BaseModel):
    """Base schema for user data shared between requests and responses"""
    email: EmailStr = PydanticField(..., description="User's email address")
    first_name: str = PydanticField(..., min_length=1, description="User's first name")
    last_name: str = PydanticField(..., min_length=1, description="User's last name")

class UserCreate(UserBase):
    """Schema for user creation requests"""
    username: str = PydanticField(..., min_length=3, description="Unique username")
    password: str = PydanticField(..., min_length=8, description="User's password")

class UserUpdate(BaseModel):
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

# Database Models
class User(Model):
    """Database model for users"""
    username: str = ODMField(unique=True)
    email: EmailStr
    first_name: str
    last_name: str
    hashed_password: str
    
    model_config = ConfigDict(collection="users")