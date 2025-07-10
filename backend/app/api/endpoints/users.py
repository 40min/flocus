from bson import ObjectId
from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from app.api.schemas.user import UserCreateRequest, UserResponse, UserUpdateRequest
from app.core.config import settings
from app.core.dependencies import get_current_active_user_id, get_current_user, get_validated_user_id
from app.services.user_service import UserService

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/users/login")


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
async def register(
    user_data: UserCreateRequest,
    user_service: UserService = Depends(UserService),
):
    created_user: UserResponse = await user_service.register_user(user_data=user_data)
    return created_user


@router.post("/login", response_model=dict)  # response_model can be more specific if a schema exists
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_service: UserService = Depends(UserService),
):
    access_token = await user_service.login_user(username=form_data.username, password=form_data.password)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    current_user: UserResponse = Depends(get_current_user),
):
    return current_user


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: ObjectId = Depends(get_validated_user_id),
    user_service: UserService = Depends(UserService),
):
    user: UserResponse = await user_service.get_user_by_id(user_id=user_id)
    return user


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_data: UserUpdateRequest,
    user_id: ObjectId = Depends(get_validated_user_id),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
    user_service: UserService = Depends(UserService),
):
    updated_user: UserResponse = await user_service.update_user_by_id(
        user_id=user_id, user_data=user_data, current_user_id=current_user_id
    )
    return updated_user


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: ObjectId = Depends(get_validated_user_id),
    current_user_id: ObjectId = Depends(get_current_active_user_id),
    user_service: UserService = Depends(UserService),
):
    await user_service.delete_user_by_id(user_id=user_id, current_user_id=current_user_id)
    return None  # For 204 No Content
