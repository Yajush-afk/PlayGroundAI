from __future__ import annotations

import asyncio
import time
from collections import defaultdict, deque
from dataclasses import dataclass

from app.core.config import Settings
from app.domain.schemas import DebateTurnRequest, JudgeRequest


class UsagePolicyError(Exception):
    def __init__(self, message: str, status_code: int = 429) -> None:
        super().__init__(message)
        self.message = message
        self.status_code = status_code


@dataclass(frozen=True)
class DebateUsageReservation:
    session_id: str
    debate_id: str | None
    reserved_at: float
    is_new_start: bool
    is_final_turn: bool


@dataclass(frozen=True)
class JudgeUsageReservation:
    session_id: str
    debate_id: str | None
    reserved_at: float


class SessionUsageService:
    def __init__(self, settings: Settings) -> None:
        self.settings = settings
        self._lock = asyncio.Lock()
        self._debate_window_events: dict[str, deque[float]] = defaultdict(deque)
        self._debate_day_events: dict[str, deque[float]] = defaultdict(deque)
        self._judge_day_events: dict[str, deque[float]] = defaultdict(deque)
        self._active_debates: dict[str, dict[str, float]] = defaultdict(dict)
        self._pending_debate_starts: dict[str, dict[str, float]] = defaultdict(dict)
        self._pending_judges: dict[str, deque[float]] = defaultdict(deque)

    async def reserve_debate_policy(
        self,
        session_id: str,
        debate_id: str | None,
        payload: DebateTurnRequest,
    ) -> DebateUsageReservation:
        if payload.total_rounds > self.settings.anonymous_max_rounds:
            raise UsagePolicyError(
                f"Anonymous users are limited to {self.settings.anonymous_max_rounds} rounds per debate.",
                status_code=403,
            )

        now = time.monotonic()
        async with self._lock:
            self._prune(now, session_id)
            is_new_start = self._is_debate_start(payload) and debate_id is not None
            is_final_turn = self._is_final_turn(payload)

            if debate_id:
                active_debates = self._active_debates[session_id]
                pending_starts = self._pending_debate_starts[session_id]

                if is_new_start and debate_id not in active_debates and debate_id not in pending_starts:
                    if len(self._debate_window_events[session_id]) + len(pending_starts) >= self.settings.anonymous_debates_per_window:
                        raise UsagePolicyError("Anonymous debate limit reached for the current time window.")

                    if len(self._debate_day_events[session_id]) + len(pending_starts) >= self.settings.anonymous_debates_per_day:
                        raise UsagePolicyError("Anonymous daily debate limit reached.")

                    if len(active_debates) + len(pending_starts) >= self.settings.anonymous_max_active_debates:
                        raise UsagePolicyError("Finish your current debate before starting another one.")

                    pending_starts[debate_id] = now

        return DebateUsageReservation(
            session_id=session_id,
            debate_id=debate_id,
            reserved_at=now,
            is_new_start=is_new_start,
            is_final_turn=is_final_turn,
        )

    async def finalize_debate_policy(self, reservation: DebateUsageReservation, *, success: bool) -> None:
        async with self._lock:
            self._prune(time.monotonic(), reservation.session_id)

            if reservation.is_new_start and reservation.debate_id:
                self._pending_debate_starts[reservation.session_id].pop(reservation.debate_id, None)

            if not success or not reservation.debate_id:
                return

            if reservation.is_new_start:
                self._debate_window_events[reservation.session_id].append(reservation.reserved_at)
                self._debate_day_events[reservation.session_id].append(reservation.reserved_at)

            active_debates = self._active_debates[reservation.session_id]
            if reservation.is_final_turn:
                active_debates.pop(reservation.debate_id, None)
            else:
                active_debates[reservation.debate_id] = reservation.reserved_at

    async def reserve_judge_policy(
        self,
        session_id: str,
        debate_id: str | None,
        payload: JudgeRequest,
    ) -> JudgeUsageReservation:
        if payload.total_rounds > self.settings.anonymous_max_rounds:
            raise UsagePolicyError(
                f"Anonymous users are limited to {self.settings.anonymous_max_rounds} rounds per debate.",
                status_code=403,
            )

        now = time.monotonic()
        async with self._lock:
            self._prune(now, session_id)

            if len(self._judge_day_events[session_id]) + len(self._pending_judges[session_id]) >= self.settings.anonymous_judges_per_day:
                raise UsagePolicyError("Anonymous daily judge limit reached.")

            self._pending_judges[session_id].append(now)

        return JudgeUsageReservation(session_id=session_id, debate_id=debate_id, reserved_at=now)

    async def finalize_judge_policy(self, reservation: JudgeUsageReservation, *, success: bool) -> None:
        async with self._lock:
            self._prune(time.monotonic(), reservation.session_id)
            pending_judges = self._pending_judges[reservation.session_id]

            try:
                pending_judges.remove(reservation.reserved_at)
            except ValueError:
                pass

            if not success:
                return

            self._judge_day_events[reservation.session_id].append(reservation.reserved_at)
            if reservation.debate_id:
                self._active_debates[reservation.session_id].pop(reservation.debate_id, None)

    def _prune(self, now: float, session_id: str) -> None:
        self._prune_bucket(self._debate_window_events[session_id], now, self.settings.anonymous_debate_window_seconds)
        self._prune_bucket(self._debate_day_events[session_id], now, 86400)
        self._prune_bucket(self._judge_day_events[session_id], now, 86400)
        self._prune_pending_debate_starts(now, session_id)
        self._prune_bucket(self._pending_judges[session_id], now, self._pending_reservation_ttl_seconds)

        active = self._active_debates[session_id]
        expired = [debate_id for debate_id, last_seen in active.items() if now - last_seen > self.settings.active_debate_ttl_seconds]
        for debate_id in expired:
            active.pop(debate_id, None)

    def _prune_pending_debate_starts(self, now: float, session_id: str) -> None:
        pending = self._pending_debate_starts[session_id]
        expired = [debate_id for debate_id, reserved_at in pending.items() if now - reserved_at > self._pending_reservation_ttl_seconds]
        for debate_id in expired:
            pending.pop(debate_id, None)

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

    @property
    def _pending_reservation_ttl_seconds(self) -> int:
        return int(
            max(
                self.settings.request_timeout_seconds,
                self.settings.stream_timeout_seconds,
                self.settings.judge_timeout_seconds,
            )
        )
