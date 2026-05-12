from __future__ import annotations

from datetime import UTC, date, datetime, timedelta

import pytest

from app.core.config import Settings
from app.services.quota_service import QuotaService


class FakeLeagueRepository:
    def __init__(self) -> None:
        self.match_count = 0
        self.rows: list[dict] = []
        self.upserts: list[dict] = []
        self.active_pause: str | None = None

    async def count_todays_official_matches(self) -> int:
        return self.match_count

    async def get_usage_rows_for_date(self, usage_date: date) -> list[dict]:
        return [row for row in self.rows if row["usage_date"] == usage_date.isoformat()]

    async def get_active_provider_pause(self, providers: list[str]) -> str | None:
        return self.active_pause

    async def get_usage_row(self, provider: str, model: str, usage_date: date) -> dict | None:
        for row in self.rows:
            if row["provider"] == provider and row["model"] == model and row["usage_date"] == usage_date.isoformat():
                return row
        return None

    async def upsert_usage_row(self, payload: dict) -> None:
        self.upserts.append(payload)
        for index, row in enumerate(self.rows):
            if (
                row["usage_date"] == payload["usage_date"]
                and row["provider"] == payload["provider"]
                and row["model"] == payload["model"]
            ):
                self.rows[index] = {**row, **payload}
                return
        self.rows.append(payload)


def _settings(**overrides) -> Settings:
    return Settings(_env_file=None, **overrides)


@pytest.mark.asyncio
async def test_quota_blocks_when_daily_match_cap_reached() -> None:
    repo = FakeLeagueRepository()
    repo.match_count = 2
    service = QuotaService(_settings(official_daily_match_cap=2), repo)

    decision = await service.can_run_official_match(estimated_requests=5, providers=["groq", "gemini"])

    assert not decision.allowed
    assert decision.reason == "Official daily match cap reached."


@pytest.mark.asyncio
async def test_quota_blocks_when_daily_request_cap_reached_across_rows() -> None:
    repo = FakeLeagueRepository()
    repo.rows = [
        {"usage_date": date.today().isoformat(), "provider": "groq", "model": "llama", "request_count": 8},
        {"usage_date": date.today().isoformat(), "provider": "gemini", "model": "flash", "request_count": 2},
    ]
    service = QuotaService(_settings(official_daily_request_cap=12), repo)

    decision = await service.can_run_official_match(estimated_requests=3, providers=["groq", "gemini"])

    assert not decision.allowed
    assert decision.reason == "Official daily request cap reached."


@pytest.mark.asyncio
async def test_quota_blocks_when_provider_is_paused() -> None:
    repo = FakeLeagueRepository()
    repo.active_pause = (datetime.now(UTC) + timedelta(minutes=20)).isoformat()
    service = QuotaService(_settings(), repo)

    decision = await service.can_run_official_match(estimated_requests=5, providers=["groq", "gemini"])

    assert not decision.allowed
    assert decision.reason == "Provider is cooling down."
    assert decision.paused_until == repo.active_pause


@pytest.mark.asyncio
async def test_record_requests_increments_existing_usage_row() -> None:
    repo = FakeLeagueRepository()
    repo.rows = [
        {"usage_date": date.today().isoformat(), "provider": "groq", "model": "llama", "request_count": 4},
    ]
    service = QuotaService(_settings(), repo)

    await service.record_requests(provider="groq", model="llama", request_count=5)

    assert repo.rows[0]["request_count"] == 9


@pytest.mark.asyncio
async def test_pause_provider_preserves_request_count_and_sets_pause() -> None:
    repo = FakeLeagueRepository()
    repo.rows = [
        {"usage_date": date.today().isoformat(), "provider": "gemini", "model": "flash", "request_count": 3},
    ]
    service = QuotaService(_settings(official_cooldown_minutes=10), repo)

    paused_until = await service.pause_provider(provider="gemini", model="flash")

    assert repo.rows[0]["request_count"] == 3
    assert repo.rows[0]["paused_until"] == paused_until
    assert repo.rows[0]["last_429_at"] is not None
