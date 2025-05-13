from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from odmantic import AIOEngine

from app.api.endpoints import day_templates, users  # Add day_templates import
from app.core.config import settings  # Import settings
from app.core.logging_config import setup_logging
from app.core.middleware import error_handling_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Setup logging first
    setup_logging()

    # Setup database connection
    app.state.motor_client = AsyncIOMotorClient(settings.MONGODB_URL)
    app.state.engine = AIOEngine(client=app.state.motor_client, database=settings.MONGODB_DATABASE_NAME)
    yield
    # Cleanup
    app.state.motor_client.close()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,  # Use origins from settings
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],  # Restrict methods
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],  # Restrict headers
)

app.middleware("http")(error_handling_middleware)

# Include users router with API version prefix
app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])

# Include day templates router with API version prefix
app.include_router(day_templates.router, prefix=f"{settings.API_V1_STR}/day-templates", tags=["day-templates"])
