from bson import ObjectId
from fastapi import APIRouter, Depends, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

from app.api.schemas.user import UserCreateRequest, UserResponse, UserUpdateRequest
from app.core.config import settings
from app.core.dependencies import get_validated_user_id
from app.db.models.user import User
from app.services.user_service import UserService

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl=f"{settings.API_V1_STR}/users/login")


@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
async def register(
    user_data: UserCreateRequest,
    user_service: UserService = Depends(UserService),
):
    created_user: User = await user_service.register_user(user_data=user_data)
    return UserResponse.model_validate(created_user)


@router.post("/login", response_model=dict)  # response_model can be more specific if a schema exists
async def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    user_service: UserService = Depends(UserService),
):
    access_token = await user_service.login_user(username=form_data.username, password=form_data.password)
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def get_current_user(
    token: str = Depends(oauth2_scheme),  # The middleware will handle token validation exceptions
    user_service: UserService = Depends(UserService),
):
    current_user: User = await user_service.get_current_user_from_token(token=token)
    return UserResponse.model_validate(current_user)


@router.get("/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: ObjectId = Depends(get_validated_user_id),
    user_service: UserService = Depends(UserService),
):
    user: User = await user_service.get_user_by_id(user_id=user_id)
    return UserResponse.model_validate(user)


@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_data: UserUpdateRequest,
    user_id: ObjectId = Depends(get_validated_user_id),
    current_user_token: str = Depends(oauth2_scheme),  # Renamed for clarity, or get current_user directly
    user_service: UserService = Depends(UserService),
):
    # The middleware will handle exceptions from get_current_user_from_token
    current_user_obj: User = await user_service.get_current_user_from_token(token=current_user_token)

    updated_user: User = await user_service.update_user_by_id(
        user_id=user_id, user_data=user_data, current_user_id=str(current_user_obj.id)
    )
    return UserResponse.model_validate(updated_user)


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_user(
    user_id: ObjectId = Depends(get_validated_user_id),
    current_user_token: str = Depends(oauth2_scheme),  # Renamed for clarity
    user_service: UserService = Depends(UserService),
):
    # The middleware will handle exceptions from get_current_user_from_token
    current_user_obj: User = await user_service.get_current_user_from_token(token=current_user_token)

    await user_service.delete_user_by_id(user_id=user_id, current_user_id=str(current_user_obj.id))
    return None  # For 204 No Content
