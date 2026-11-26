from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    DATABASE_URL: str = "postgresql+asyncpg://enrolment:enrolment@localhost:5433/enrolment"
    REDIS_URL: str = "redis://localhost:6380/0"

    JWT_SECRET: str = "change-me-to-a-long-random-secret-in-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    SMTP_HOST: str = "localhost"
    SMTP_PORT: int = 1025
    EMAIL_FROM: str = "noreply@smartschooladmissions.com"

    S3_ENDPOINT: str = "http://localhost:9000"
    S3_ACCESS_KEY: str = "minioadmin"
    S3_SECRET_KEY: str = "minioadmin"
    S3_BUCKET: str = "enrolment-docs"
    S3_REGION: str = "us-east-1"

    PLATFORM_API_KEY: str = "platform-dev-key-change-me"
    FRONTEND_URL: str = "http://localhost:3001"
    REQUIRE_ID_PROOF: bool = True

    LLM_MODEL: str = "gpt-4o-mini"
    LLM_FALLBACK_MODEL: str = "gemini-2.5-flash"
    OPENAI_API_KEY: str = ""
    GOOGLE_API_KEY: str = ""
    LLM_TIMEOUT: int = 15
    LLM_MAX_RETRIES: int = 1
    CHATBOT_MAX_MESSAGES_PER_SESSION: int = 50
    CHATBOT_MAX_SESSIONS_PER_DAY: int = 20

    BCRYPT_ROUNDS: int = 12
    MAX_UPLOAD_BYTES: int = 5 * 1024 * 1024
    ALLOWED_MIME_TYPES: tuple[str, ...] = (
        "application/pdf",
        "image/jpeg",
        "image/png",
    )


@lru_cache
def get_settings() -> Settings:
    return Settings()
