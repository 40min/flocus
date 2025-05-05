from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api.endpoints import users
from app.core.middleware import error_handling_middleware

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

app.middleware("http")(error_handling_middleware)

# Include users router with proper prefix, making login endpoint available at /users/login
app.include_router(users.router, prefix="/users", tags=["users"])