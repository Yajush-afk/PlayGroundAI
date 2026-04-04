from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque

from app.core.config import Settings
from app.domain.schemas import DebateTurnRequest, JudgeRequest


class UsagePolicyError(Exception):
    def __init__(self, message: str, status_code: int = 429) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


class SessionUsageService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._lock = asyncio.Lock()
        self._debate_window_events: dict[str, deque[float]] = defaultdict(deque)
        self._debate_day_events: dict[str, deque[float]] = defaultdict(deque)
        self._judge_day_events: dict[str, deque[float]] = defaultdict(deque)
        self._active_debates: dict[str, dict[str, float]] = defaultdict(dict)

    async def enforce_debate_policy(self, session_id: str, debate_id: str | None, payload: DebateTurnRequest) -> None:
        if payload.total_rounds > self.settings.anonymous_max_rounds:
            raise UsagePolicyError(
                f"Anonymous users are limited to {self.settings.anonymous_max_rounds} rounds per debate.",
                status_code=403,
            )

        now = time.monotonic()
        async with self._lock:
            self._prune(now, session_id)

            if debate_id:
                active_debates = self._active_debates[session_id]
                is_new_start = self._is_debate_start(payload)

                if is_new_start and debate_id not in active_debates:
                    if len(self._debate_window_events[session_id]) >= self.settings.anonymous_debates_per_window:
                        raise UsagePolicyError("Anonymous debate limit reached for the current time window.")

                    if len(self._debate_day_events[session_id]) >= self.settings.anonymous_debates_per_day:
                        raise UsagePolicyError("Anonymous daily debate limit reached.")

                    if len(active_debates) >= self.settings.anonymous_max_active_debates:
                        raise UsagePolicyError("Finish your current debate before starting another one.")

                    self._debate_window_events[session_id].append(now)
                    self._debate_day_events[session_id].append(now)

                active_debates[debate_id] = now

                if self._is_final_turn(payload):
                    active_debates.pop(debate_id, None)

    async def enforce_judge_policy(self, session_id: str, debate_id: str | None, payload: JudgeRequest) -> None:
        if payload.total_rounds > self.settings.anonymous_max_rounds:
            raise UsagePolicyError(
                f"Anonymous users are limited to {self.settings.anonymous_max_rounds} rounds per debate.",
                status_code=403,
            )

        now = time.monotonic()
        async with self._lock:
            self._prune(now, session_id)

            if len(self._judge_day_events[session_id]) >= self.settings.anonymous_judges_per_day:
                raise UsagePolicyError("Anonymous daily judge limit reached.")

            self._judge_day_events[session_id].append(now)
            if debate_id:
                self._active_debates[session_id].pop(debate_id, None)

    def _prune(self, now: float, session_id: str) -> None:
        self._prune_bucket(self._debate_window_events[session_id], now, self.settings.anonymous_debate_window_seconds)
        self._prune_bucket(self._debate_day_events[session_id], now, 86400)
        self._prune_bucket(self._judge_day_events[session_id], now, 86400)

        active = self._active_debates[session_id]
        expired = [debate_id for debate_id, last_seen in active.items() if now - last_seen > self.settings.active_debate_ttl_seconds]
        for debate_id in expired:
            active.pop(debate_id, None)

    @staticmethod
    def _prune_bucket(bucket: deque[float], now: float, window_seconds: int) -> None:
        while bucket and now - bucket[0] > window_seconds:
            bucket.popleft()

    @staticmethod
    def _is_debate_start(payload: DebateTurnRequest) -> bool:
        return payload.current_round == 1 and payload.persona == "Aria" and len(payload.history) == 0

    @staticmethod
    def _is_final_turn(payload: DebateTurnRequest) -> bool:
        return payload.current_round == payload.total_rounds and payload.persona == "Rex"
