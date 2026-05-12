from __future__ import annotations

from datetime import UTC, date, datetime
from typing import Any

import httpx

from app.providers.base import ProviderResponseError, ProviderTimeoutError


class LeagueRepository:
    def __init__(self, supabase_url: str, supabase_key: str, timeout_seconds: float, http_client: httpx.AsyncClient | None = None) -> None:
        self.supabase_url = supabase_url.rstrip("/")
        self.supabase_key = supabase_key
        self.timeout_seconds = timeout_seconds
        self.http_client = http_client

    async def get_active_season(self) -> dict[str, Any] | None:
        rows = await self._request(
            "GET",
            "/rest/v1/seasons?status=eq.active&select=*&order=starts_at.desc&limit=1",
        )
        return rows[0] if rows else None

    async def get_latest_matches(self, limit: int = 10, game_type: str | None = None) -> list[dict[str, Any]]:
        game_filter = f"&game_type=eq.{game_type}" if game_type else ""
        return await self._request(
            "GET",
            f"/rest/v1/matches?league_type=eq.official&status=eq.completed{game_filter}&select=*&order=completed_at.desc&limit={limit}",
        )

    async def get_latest_match_by_status(self, statuses: list[str]) -> dict[str, Any] | None:
        if not statuses:
            return None
        status_filter = ",".join(statuses)
        rows = await self._request(
            "GET",
            f"/rest/v1/matches?league_type=eq.official&status=in.({status_filter})&select=*&order=created_at.desc&limit=1",
        )
        return rows[0] if rows else None

    async def get_match(self, match_id: str) -> dict[str, Any] | None:
        rows = await self._request("GET", f"/rest/v1/matches?id=eq.{match_id}&select=*&limit=1")
        return rows[0] if rows else None

    async def get_match_detail(self, match_id: str) -> dict[str, Any] | None:
        match = await self.get_match(match_id)
        if match is None:
            return None

        participants = await self._request(
            "GET",
            f"/rest/v1/match_participants?match_id=eq.{match_id}&select=*&order=final_rank.asc",
        )
        rounds = await self._request(
            "GET",
            f"/rest/v1/match_rounds?match_id=eq.{match_id}&select=*&order=round_index.asc",
        )
        return {"match": match, "participants": participants, "rounds": rounds}

    async def get_leaderboard(self, season_id: str | None, game_type: str | None = None) -> list[dict[str, Any]]:
        filters = []
        if season_id:
            filters.append(f"season_id=eq.{season_id}")
        if game_type:
            filters.append(f"game_type=eq.{game_type}")
        query = "&".join(filters)
        prefix = f"{query}&" if query else ""
        return await self._request(
            "GET",
            f"/rest/v1/leaderboard_entries?{prefix}select=*&order=total_points.desc,average_score.desc",
        )

    async def create_match(self, payload: dict[str, Any]) -> dict[str, Any]:
        rows = await self._request(
            "POST",
            "/rest/v1/matches?select=*",
            json=payload,
            prefer="return=representation",
        )
        return rows[0]

    async def update_match(self, match_id: str, payload: dict[str, Any]) -> None:
        await self._request(
            "PATCH",
            f"/rest/v1/matches?id=eq.{match_id}",
            json=payload,
            prefer="return=minimal",
        )

    async def insert_participants(self, rows: list[dict[str, Any]]) -> None:
        if not rows:
            return
        await self._request("POST", "/rest/v1/match_participants", json=rows, prefer="return=minimal")

    async def insert_rounds(self, rows: list[dict[str, Any]]) -> None:
        if not rows:
            return
        await self._request("POST", "/rest/v1/match_rounds", json=rows, prefer="return=minimal")

    async def count_todays_official_matches(self) -> int:
        today_start = datetime.combine(date.today(), datetime.min.time(), tzinfo=UTC).isoformat()
        rows = await self._request(
            "GET",
            f"/rest/v1/matches?league_type=eq.official&created_at=gte.{today_start}&select=id",
        )
        return len(rows)

    async def get_usage_row(self, provider: str, model: str, usage_date: date) -> dict[str, Any] | None:
        rows = await self._request(
            "GET",
            f"/rest/v1/api_usage_ledger?provider=eq.{provider}&model=eq.{model}&usage_date=eq.{usage_date.isoformat()}&select=*&limit=1",
        )
        return rows[0] if rows else None

    async def get_usage_rows_for_date(self, usage_date: date) -> list[dict[str, Any]]:
        return await self._request(
            "GET",
            f"/rest/v1/api_usage_ledger?usage_date=eq.{usage_date.isoformat()}&select=*",
        )

    async def get_active_provider_pause(self, providers: list[str]) -> str | None:
        rows = await self.get_usage_rows_for_date(date.today())
        now = datetime.now(UTC)
        active_pauses = []
        provider_set = set(providers)
        for row in rows:
            if row.get("provider") not in provider_set:
                continue
            paused_until = self._parse_datetime(row.get("paused_until"))
            if paused_until and paused_until > now:
                active_pauses.append(paused_until)

        if not active_pauses:
            return None
        return max(active_pauses).isoformat()

    async def upsert_usage_row(self, payload: dict[str, Any]) -> None:
        await self._request(
            "POST",
            "/rest/v1/api_usage_ledger?on_conflict=usage_date,provider,model",
            json=payload,
            prefer="resolution=merge-duplicates,return=minimal",
        )

    async def acquire_lock(self, lock_id: str, locked_by: str, locked_until: str) -> bool:
        rows = await self._request("GET", f"/rest/v1/league_locks?id=eq.{lock_id}&select=*&limit=1")
        now_dt = datetime.now(UTC)
        now = now_dt.isoformat()
        if rows:
            current = rows[0]
            current_until = self._parse_datetime(current.get("locked_until"))
            if current_until and current_until > now_dt:
                return False
            await self._request(
                "PATCH",
                f"/rest/v1/league_locks?id=eq.{lock_id}",
                json={"locked_by": locked_by, "locked_until": locked_until, "updated_at": now},
                prefer="return=minimal",
            )
            return True

        await self._request(
            "POST",
            "/rest/v1/league_locks",
            json={"id": lock_id, "locked_by": locked_by, "locked_until": locked_until, "updated_at": now},
            prefer="return=minimal",
        )
        return True

    async def release_lock(self, lock_id: str, locked_by: str) -> None:
        await self._request(
            "PATCH",
            f"/rest/v1/league_locks?id=eq.{lock_id}&locked_by=eq.{locked_by}",
            json={"locked_by": None, "locked_until": None, "updated_at": datetime.now(UTC).isoformat()},
            prefer="return=minimal",
        )

    async def update_leaderboard(self, *, season_id: str, persona_name: str, game_type: str, points: int, score: int, won: bool) -> None:
        path = (
            "/rest/v1/leaderboard_entries?"
            f"season_id=eq.{season_id}&persona_name=eq.{persona_name}&game_type=eq.{game_type}&select=*&limit=1"
        )
        rows = await self._request("GET", path)
        now = datetime.now(UTC).isoformat()
        if not rows:
            await self._request(
                "POST",
                "/rest/v1/leaderboard_entries",
                json={
                    "season_id": season_id,
                    "persona_name": persona_name,
                    "game_type": game_type,
                    "matches_played": 1,
                    "wins": 1 if won else 0,
                    "podiums": 1 if points >= 3 else 0,
                    "total_points": points,
                    "average_score": score,
                    "current_streak": 1 if won else 0,
                    "updated_at": now,
                },
                prefer="return=minimal",
            )
            return

        current = rows[0]
        matches_played = int(current["matches_played"]) + 1
        previous_average = float(current["average_score"])
        average_score = ((previous_average * int(current["matches_played"])) + score) / matches_played
        await self._request(
            "PATCH",
            f"/rest/v1/leaderboard_entries?id=eq.{current['id']}",
            json={
                "matches_played": matches_played,
                "wins": int(current["wins"]) + (1 if won else 0),
                "podiums": int(current["podiums"]) + (1 if points >= 3 else 0),
                "total_points": int(current["total_points"]) + points,
                "average_score": average_score,
                "current_streak": int(current["current_streak"]) + 1 if won else 0,
                "updated_at": now,
            },
            prefer="return=minimal",
        )

    async def _request(self, method: str, path: str, *, json: Any | None = None, prefer: str | None = None) -> Any:
        owns_client = self.http_client is None
        client = self.http_client or httpx.AsyncClient(timeout=httpx.Timeout(self.timeout_seconds, connect=10.0))
        headers = {
            "apikey": self.supabase_key,
            "Authorization": f"Bearer {self.supabase_key}",
            "Content-Type": "application/json",
        }
        if prefer:
            headers["Prefer"] = prefer

        try:
            response = await client.request(method, f"{self.supabase_url}{path}", headers=headers, json=json)
        except httpx.TimeoutException as exc:
            raise ProviderTimeoutError("Supabase request timed out") from exc
        finally:
            if owns_client:
                await client.aclose()

        if response.status_code >= 400:
            raise ProviderResponseError(f"Supabase request failed: {response.text}")
        if response.status_code == 204 or not response.content:
            return []
        return response.json()

    @staticmethod
    def _parse_datetime(value: str | None) -> datetime | None:
        if not value:
            return None
        normalized = value.replace("Z", "+00:00")
        parsed = datetime.fromisoformat(normalized)
        if parsed.tzinfo is None:
            return parsed.replace(tzinfo=UTC)
        return parsed.astimezone(UTC)
