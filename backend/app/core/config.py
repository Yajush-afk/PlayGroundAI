from __future__ import annotations

from functools import lru_cache
from pathlib import Path

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parents[2]
ROOT_DIR = Path(__file__).resolve().parents[3]


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=(BACKEND_DIR / ".env", ROOT_DIR / ".env.local"),
        env_file_encoding="utf-8",
        extra="ignore",
        populate_by_name=True,
    )

    app_name: str = "PlayGroundAI FastAPI Backend"
    environment: str = Field(default="development", validation_alias="APP_ENV")
    debug: bool = Field(default=False, validation_alias="DEBUG")

    groq_api_key: str | None = Field(default=None, validation_alias="GROQ_API_KEY")
    google_ai_api_key: str | None = Field(default=None, validation_alias="GOOGLE_AI_API_KEY")

    supabase_url: str | None = Field(default=None, validation_alias="SUPABASE_URL")
    supabase_service_role_key: str | None = Field(default=None, validation_alias="SUPABASE_SERVICE_ROLE_KEY")
    supabase_anon_key: str | None = Field(default=None, validation_alias="SUPABASE_ANON_KEY")
    next_public_supabase_url: str | None = Field(default=None, validation_alias="NEXT_PUBLIC_SUPABASE_URL")
    next_public_supabase_anon_key: str | None = Field(default=None, validation_alias="NEXT_PUBLIC_SUPABASE_ANON_KEY")

    allowed_origins_raw: str = Field(
        default="http://localhost:3000,http://127.0.0.1:3000",
        validation_alias="ALLOWED_ORIGINS",
    )
    request_timeout_seconds: float = Field(default=30.0, validation_alias="REQUEST_TIMEOUT_SECONDS")
    stream_timeout_seconds: float = Field(default=90.0, validation_alias="STREAM_TIMEOUT_SECONDS")
    judge_timeout_seconds: float = Field(default=45.0, validation_alias="JUDGE_TIMEOUT_SECONDS")
    rate_limit_window_seconds: int = Field(default=60, validation_alias="RATE_LIMIT_WINDOW_SECONDS")
    rate_limit_max_requests: int = Field(default=20, validation_alias="RATE_LIMIT_MAX_REQUESTS")
    anonymous_max_rounds: int = Field(default=3, validation_alias="ANONYMOUS_MAX_ROUNDS")
    anonymous_debate_window_seconds: int = Field(default=1800, validation_alias="ANONYMOUS_DEBATE_WINDOW_SECONDS")
    anonymous_debates_per_window: int = Field(default=2, validation_alias="ANONYMOUS_DEBATES_PER_WINDOW")
    anonymous_debates_per_day: int = Field(default=5, validation_alias="ANONYMOUS_DEBATES_PER_DAY")
    anonymous_judges_per_day: int = Field(default=5, validation_alias="ANONYMOUS_JUDGES_PER_DAY")
    anonymous_max_active_debates: int = Field(default=1, validation_alias="ANONYMOUS_MAX_ACTIVE_DEBATES")
    active_debate_ttl_seconds: int = Field(default=3600, validation_alias="ACTIVE_DEBATE_TTL_SECONDS")

    @property
    def allowed_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins_raw.split(",") if origin.strip()]

    @property
    def resolved_supabase_url(self) -> str | None:
        return self.supabase_url or self.next_public_supabase_url

    @property
    def resolved_supabase_key(self) -> str | None:
        return self.supabase_service_role_key or self.supabase_anon_key or self.next_public_supabase_anon_key


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
