from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from datetime import timedelta
from jose import jwt

from app.api.schemas.user import UserCreate, UserUpdate, UserResponse
from app.db.models.user import User
from app.db.connection import get_database
from app.core.security import create_access_token, verify_password, hash_password
from app.core.config import ACCESS_TOKEN_EXPIRE_MINUTES
from odmantic import AIOEngine

router = APIRouter()
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/users/login")

@router.post("/register", status_code=status.HTTP_201_CREATED, response_model=UserResponse)
async def register(user_data: UserCreate, database: AIOEngine = Depends(get_database)):
    # Check if user already exists by username
    existing_user = await database.find_one(User, {"username": user_data.username})
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )

    # Create new user with hashed password
    hashed_password = hash_password(user_data.password)
    user = User(
        username=user_data.username,
        email=user_data.email,
        first_name=user_data.first_name,
        last_name=user_data.last_name,
        hashed_password=hashed_password
    )
    created_user = await database.save(user)
    return created_user

@router.post("/login", response_model=dict)
async def login(form_data: OAuth2PasswordRequestForm = Depends(), database: AIOEngine = Depends(get_database)):
    user = await database.find_one(User, {"username": form_data.username})
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    return {"access_token": access_token, "token_type": "bearer"}

@router.get("/me", response_model=UserResponse)
async def get_current_user(token: str = Depends(oauth2_scheme), database: AIOEngine = Depends(get_database)):
    try:
        
        payload = jwt.decode(token, "YOUR_SECRET_KEY", algorithms=["HS256"])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials",
            )
    except Exception:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
        )
    
    user = await database.find_one(User, {"username": username})
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.get("/", response_model=List[UserResponse])
async def get_all_users(current_user: User = Depends(get_current_user), database: AIOEngine = Depends(get_database)):
    users = await database.find(User)
    return users

@router.get("/{user_id}", response_model=UserResponse)
async def get_user(user_id: str, current_user: User = Depends(get_current_user), database: AIOEngine = Depends(get_database)):
    user = await database.find_one(User, User.id == user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.put("/{user_id}", response_model=UserResponse)
async def update_user(
    user_id: str, 
    user_data: UserUpdate, 
    current_user: User = Depends(get_current_user),
    database: AIOEngine = Depends(get_database)
):
    existing_user = await database.find_one(User, User.id == user_id)
    if existing_user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only allow users to update their own data
    if str(existing_user.id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to update this user")
    
    # Check if new username is provided and already taken
    if user_data.email != existing_user.email:
        email_taken = await database.find_one(User, {"email": user_data.email})
        if email_taken:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already taken"
            )
    
    # Update fields if provided
    if user_data.email is not None:
    existing_user.email = user_data.email
if user_data.first_name is not None:
    existing_user.first_name = user_data.first_name
if user_data.last_name is not None:
    existing_user.last_name = user_data.last_name
    if user_data.password:
        existing_user.hashed_password = hash_password(user_data.password)
    
    updated_user = await database.save(existing_user)
    return updated_user

@router.delete("/{user_id}", response_model=dict)
async def delete_user(user_id: str, current_user: User = Depends(get_current_user), database: AIOEngine = Depends(get_database)):
    user = await database.find_one(User, User.id == user_id)
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Only allow users to delete their own account
    if str(user.id) != str(current_user.id):
        raise HTTPException(status_code=403, detail="Not authorized to delete this user")
    
    await database.delete(user)
    return {"detail": "User successfully deleted"}