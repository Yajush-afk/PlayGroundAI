from __future__ import annotations

from functools import lru_cache

from fastapi import HTTPException, Request

from app.core.config import get_settings
from app.middleware.rate_limit import InMemoryRateLimiter
from app.providers.gemini_client import GeminiClient
from app.providers.groq_client import GroqClient
from app.repositories.debates import DebatesRepository
from app.services.debate_service import DebateService
from app.services.judge_service import JudgeService
from app.services.usage_service import SessionUsageService


@lru_cache(maxsize=1)
def get_rate_limiter() -> InMemoryRateLimiter:
    settings = get_settings()
    return InMemoryRateLimiter(
        max_requests=settings.rate_limit_max_requests,
        window_seconds=settings.rate_limit_window_seconds,
    )


@lru_cache(maxsize=1)
def get_debate_service() -> DebateService:
    settings = get_settings()
    return DebateService(
        groq_client=GroqClient(
            api_key=settings.groq_api_key,
            timeout_seconds=settings.stream_timeout_seconds,
        )
    )


@lru_cache(maxsize=1)
def get_judge_service() -> JudgeService:
    settings = get_settings()
    repository = None
    if settings.supabase_url and settings.supabase_service_role_key:
        repository = DebatesRepository(
            supabase_url=settings.supabase_url,
            supabase_key=settings.supabase_service_role_key,
            timeout_seconds=settings.request_timeout_seconds,
        )

    return JudgeService(
        gemini_client=GeminiClient(
            api_key=settings.google_ai_api_key,
            timeout_seconds=settings.judge_timeout_seconds,
        ),
        repository=repository,
    )


@lru_cache(maxsize=1)
def get_usage_service() -> SessionUsageService:
    return SessionUsageService(get_settings())


async def throttle_request(request: Request) -> None:
    host = request.client.host if request.client else "anonymous"
    key = f"{host}:{request.url.path}"
    allowed = await get_rate_limiter().allow(key)
    if not allowed:
        raise HTTPException(status_code=429, detail="Rate limit exceeded")


def resolve_session_id(request: Request) -> str:
    return request.headers.get("x-playground-session-id") or (request.client.host if request.client else "anonymous")


def resolve_debate_id(request: Request) -> str | None:
    return request.headers.get("x-playground-debate-id")
