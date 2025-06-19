from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from odmantic import AIOEngine

from app.api.endpoints import categories, daily_plans, day_templates, tasks, users
from app.core.config import settings
from app.core.logging_config import setup_logging
from app.core.middleware import error_handling_middleware


@asynccontextmanager
async def lifespan(app: FastAPI):
    setup_logging()
    app.state.motor_client = AsyncIOMotorClient(settings.MONGODB_URL)
    app.state.engine = AIOEngine(client=app.state.motor_client, database=settings.MONGODB_DATABASE_NAME)
    yield
    app.state.motor_client.close()


app = FastAPI(lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allow_headers=["Content-Type", "Authorization", "X-Requested-With"],
)

app.middleware("http")(error_handling_middleware)

app.include_router(users.router, prefix=f"{settings.API_V1_STR}/users", tags=["users"])
app.include_router(day_templates.router, prefix=f"{settings.API_V1_STR}/day-templates", tags=["day-templates"])
app.include_router(categories.router, prefix=f"{settings.API_V1_STR}/categories", tags=["categories"])
app.include_router(tasks.router, prefix=f"{settings.API_V1_STR}/tasks", tags=["tasks"])
app.include_router(daily_plans.router, prefix=f"{settings.API_V1_STR}/daily-plans", tags=["daily-plans"])
