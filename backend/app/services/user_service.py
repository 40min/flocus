from datetime import timedelta
from typing import Optional

from bson import ObjectId
from fastapi import Depends  # Removed HTTPException, status
from jose import jwt
from odmantic import AIOEngine

from app.api.schemas.user import UserCreateRequest, UserUpdateRequest
from app.core.config import settings
from app.core.exceptions import ForbiddenException  # Renamed from AuthorizationException
from app.core.exceptions import InvalidCredentialsException  # Renamed from AuthenticationException
from app.core.exceptions import (
    EmailAlreadyExistsException,
    InvalidTokenException,
    UsernameAlreadyExistsException,
    UserNotFoundException,
)
from app.core.security import create_access_token, hash_password, verify_password
from app.db.connection import get_database
from app.db.models.user import User


class UserService:
    def __init__(self, db: AIOEngine = Depends(get_database)):
        self.db = db

    async def register_user(self, user_data: UserCreateRequest) -> User:
        existing_user = await self.db.find_one(User, User.username == user_data.username)
        if existing_user:
            raise UsernameAlreadyExistsException(username=user_data.username)

        existing_user_email = await self.db.find_one(User, User.email == user_data.email)
        if existing_user_email:
            raise EmailAlreadyExistsException(email=user_data.email)

        hashed_pwd = hash_password(user_data.password)
        user = User(
            username=user_data.username,
            email=user_data.email,
            first_name=user_data.first_name,
            last_name=user_data.last_name,
            hashed_password=hashed_pwd,
        )
        created_user = await self.db.save(user)
        return created_user

    async def login_user(self, username: str, password: str) -> str:  # Return type changed to str
        user = await self.db.find_one(User, User.username == username)
        if not user or not verify_password(password, user.hashed_password):
            raise InvalidCredentialsException()  # Use default detail

        access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        access_token = create_access_token(data={"sub": user.username}, expires_delta=access_token_expires)
        return access_token  # Return only the token

    async def get_current_user_from_token(self, token: str) -> User:  # Return type changed to User
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            username: Optional[str] = payload.get("sub")
            if username is None:
                raise InvalidTokenException(detail="Could not validate credentials (username missing in token)")
        except jwt.ExpiredSignatureError:
            raise InvalidTokenException(detail="Token has expired")
        except jwt.JWTError:
            raise InvalidTokenException(detail="Could not validate credentials (JWTError)")

        user = await self.db.find_one(User, User.username == username)
        if user is None:
            raise UserNotFoundException(detail="User not found (from token)")
        return user

    async def get_user_by_id(self, user_id: ObjectId) -> User:  # Return type changed to User
        user = await self.db.find_one(User, User.id == user_id)
        if user is None:
            raise UserNotFoundException(detail="User not found")
        return user

    async def update_user_by_id(
        self, user_id: ObjectId, user_data: UserUpdateRequest, current_user_id: str
    ) -> User:  # Return type changed to User
        existing_user = await self.db.find_one(User, User.id == user_id)
        if existing_user is None:
            raise UserNotFoundException(detail="User not found for update")

        if str(existing_user.id) != current_user_id:
            raise ForbiddenException(detail="Not authorized to update this user")

        if user_data.email and user_data.email != existing_user.email:
            # Check if the new email is taken by another user
            email_taken_by_other_user = await self.db.find_one(
                User, (User.email == user_data.email) & (User.id != user_id)
            )
            if email_taken_by_other_user:
                raise EmailAlreadyExistsException(email=user_data.email)
            existing_user.email = user_data.email

        if user_data.first_name is not None:
            existing_user.first_name = user_data.first_name
        if user_data.last_name is not None:
            existing_user.last_name = user_data.last_name
        if user_data.password:  # Ensure password is not empty string before hashing
            existing_user.hashed_password = hash_password(user_data.password)

        updated_user = await self.db.save(existing_user)
        return updated_user

    async def delete_user_by_id(self, user_id: ObjectId, current_user_id: str) -> None:  # Return type changed to None
        user_to_delete = await self.db.find_one(User, User.id == user_id)
        if user_to_delete is None:
            raise UserNotFoundException(detail="User not found for deletion")

        if str(user_to_delete.id) != current_user_id:
            raise ForbiddenException(detail="Not authorized to delete this user")

        await self.db.delete(user_to_delete)
        # No return value needed, controller will return 204 No Content or a success message
