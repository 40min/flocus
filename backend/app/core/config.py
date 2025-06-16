from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.enums import LLMProvider


class Settings(BaseSettings):
    MONGODB_URL: str = "mongodb://localhost:27017"
    MONGODB_DATABASE_NAME: str = "flocus"
    API_V1_STR: str = "/api/v1"
    SECRET_KEY: str
    ALGORITHM: str = "HS256"  # Added algorithm for JWT
    react_app_api_base_url: str = "https://api.example.com"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 1 week
    LOG_LEVEL: str = "INFO"  # Default log level
    ALLOWED_ORIGINS: list[str] = ["http://localhost:3000", "http://127.0.0.1:3000"]  # Default development origins

    # LLM Settings
    LLM_PROVIDER: str = "OpenAI"
    LLM_API_KEY: str = ""
    LLM_TEXT_IMPROVEMENT_PROMPT: str = "Improve the following text:"
    LLM_MODEL_NAME: str = ""  # Optional: Specify a model name, e.g., "gpt-4", "gemini-1.5-pro-latest"

    @field_validator("LLM_PROVIDER")
    def validate_llm_provider(cls, v: str) -> str:
        if v not in [provider.value for provider in LLMProvider]:
            raise ValueError("LLM_PROVIDER must be 'OpenAI' or 'GoogleGemini'")
        return v

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
