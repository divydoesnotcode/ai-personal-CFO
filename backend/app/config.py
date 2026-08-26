"""
Application configuration.

All environment-dependent configuration should be centralized here.
"""

from __future__ import annotations

from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Strongly typed application configuration."""

    APP_NAME: str = "AI Personal CFO"
    APP_VERSION: str = "0.1.0"

    ENVIRONMENT: str = "development"
    DEBUG: bool = False

    DATABASE_URL: str

    BACKEND_HOST: str = "0.0.0.0"
    BACKEND_PORT: int = 8000

    SECRET_KEY: str = Field(min_length=32)

    LLM_API_KEY: str | None = None
    LLM_MODEL: str | None = None

    CORS_ORIGINS: list[str] = [
        "http://localhost:3000",
    ]

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=True,
        extra="ignore",
    )


@lru_cache
def get_settings() -> Settings:
    """
    Return a cached settings instance.

    Caching ensures configuration is parsed once rather than repeatedly
    reading and validating environment variables.
    """

    return Settings()


settings = get_settings()
