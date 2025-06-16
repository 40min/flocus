from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from odmantic import AIOEngine

from app.api.endpoints import categories, daily_plans, day_templates, tasks, users  # Uncommented daily_plans
from app.core.config import settings  # Import settings
from app.core.logging_config import setup_logging
from app.core.middleware import error_handling_middleware
from app.core.exceptions import TaskDataMissingError, LLMGenerationError, LLMServiceError # Added
from fastapi import Request # Added
from fastapi.responses import JSONResponse # Added


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

# Exception Handlers for LLM Service
@app.exception_handler(TaskDataMissingError)
async def task_data_missing_exception_handler(request: Request, exc: TaskDataMissingError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}, # Matching FastAPI's default error schema
    )

@app.exception_handler(LLMGenerationError)
async def llm_generation_exception_handler(request: Request, exc: LLMGenerationError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}, # Matching FastAPI's default error schema
    )

# Optional: Generic handler for other LLMServiceErrors if not caught by more specific handlers
@app.exception_handler(LLMServiceError)
async def llm_service_exception_handler(request: Request, exc: LLMServiceError):
    return JSONResponse(
        status_code=exc.status_code,
        content={"detail": exc.detail}, # Matching FastAPI's default error schema
    )

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

# Include categories router with API version prefix
app.include_router(categories.router, prefix=f"{settings.API_V1_STR}/categories", tags=["categories"])

# Include tasks router with API version prefix
app.include_router(tasks.router, prefix=f"{settings.API_V1_STR}/tasks", tags=["tasks"])

# Include daily plans router with API version prefix
app.include_router(daily_plans.router, prefix=f"{settings.API_V1_STR}/daily-plans", tags=["daily-plans"])  # Uncommented
