from __future__ import annotations

import httpx

from app.domain.schemas import DebateRecordCreate
from app.providers.base import ProviderResponseError, ProviderTimeoutError


class DebatesRepository:
    def __init__(self, supabase_url: str, supabase_key: str, timeout_seconds: float, http_client: httpx.AsyncClient | None = None) -> None:
        self.supabase_url = supabase_url.rstrip("/")
        self.supabase_key = supabase_key
        self.timeout_seconds = timeout_seconds
        self.http_client = http_client

    async def save_debate(self, record: DebateRecordCreate) -> None:
        owns_client = self.http_client is None
        client = self.http_client or httpx.AsyncClient(timeout=httpx.Timeout(self.timeout_seconds, connect=10.0))

        try:
            response = await client.post(
                f"{self.supabase_url}/rest/v1/debates",
                headers={
                    "apikey": self.supabase_key,
                    "Authorization": f"Bearer {self.supabase_key}",
                    "Content-Type": "application/json",
                    "Prefer": "return=minimal",
                },
                json={
                    "topic": record.topic,
                    "rounds": record.rounds,
                    "transcript": [entry.model_dump(mode="json") for entry in record.transcript],
                    "scores": record.scores,
                    "winner": record.winner,
                },
            )
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError("Supabase insert timed out") from exc
        finally:
            if owns_client:
                await client.aclose()

        if response.status_code >= 400:
            raise ProviderResponseError(f"Supabase insert failed: {response.text}")
