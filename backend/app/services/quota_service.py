from __future__ import annotations

from dataclasses import dataclass
from datetime import UTC, date, datetime, timedelta

from app.core.config import Settings
from app.repositories.league import LeagueRepository


@dataclass(frozen=True)
class QuotaDecision:
    allowed: bool
    reason: str | None = None
    paused_until: str | None = None


class QuotaService:
    def __init__(self, settings: Settings, repository: LeagueRepository) -> None:
        self.settings = settings
        self.repository = repository

    async def can_run_official_match(self, *, estimated_requests: int, providers: list[str]) -> QuotaDecision:
        if not self.settings.official_league_enabled:
            return QuotaDecision(allowed=False, reason="Official league generation is disabled.")

        todays_matches = await self.repository.count_todays_official_matches()
        if todays_matches >= self.settings.official_daily_match_cap:
            return QuotaDecision(allowed=False, reason="Official daily match cap reached.")

        active_pause = await self.get_active_pause(providers=providers)
        if active_pause:
            return QuotaDecision(allowed=False, reason="Provider is cooling down.", paused_until=active_pause)

        request_count = await self.get_todays_request_count()
        if request_count + estimated_requests > self.settings.official_daily_request_cap:
            return QuotaDecision(allowed=False, reason="Official daily request cap reached.")

        return QuotaDecision(allowed=True)

    async def get_todays_request_count(self) -> int:
        rows = await self.repository.get_usage_rows_for_date(date.today())
        return sum(int(row.get("request_count") or 0) for row in rows)

    async def get_active_pause(self, *, providers: list[str]) -> str | None:
        return await self.repository.get_active_provider_pause(providers)

    async def record_requests(self, *, provider: str, model: str, request_count: int) -> None:
        today = date.today()
        existing = await self.repository.get_usage_row(provider, model, today)
        if existing:
            request_count += int(existing.get("request_count") or 0)

        await self.repository.upsert_usage_row(
            {
                "usage_date": today.isoformat(),
                "provider": provider,
                "model": model,
                "request_count": request_count,
                "updated_at": datetime.now(UTC).isoformat(),
            }
        )

    async def pause_provider(self, *, provider: str, model: str, minutes: int | None = None) -> str:
        paused_until = datetime.now(UTC) + timedelta(minutes=minutes or self.settings.official_cooldown_minutes)
        today = date.today()
        existing = await self.repository.get_usage_row(provider, model, today)
        request_count = int(existing.get("request_count") or 0) if existing else 0

        await self.repository.upsert_usage_row(
            {
                "usage_date": today.isoformat(),
                "provider": provider,
                "model": model,
                "request_count": request_count,
                "last_429_at": datetime.now(UTC).isoformat(),
                "paused_until": paused_until.isoformat(),
                "updated_at": datetime.now(UTC).isoformat(),
            }
        )
        return paused_until.isoformat()
