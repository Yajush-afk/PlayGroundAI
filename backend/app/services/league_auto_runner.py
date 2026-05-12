from __future__ import annotations

import asyncio
import logging

from app.core.config import Settings
from app.services.league_service import LeagueService

logger = logging.getLogger(__name__)


class LeagueAutoRunner:
    def __init__(self, settings: Settings, league_service: LeagueService) -> None:
        self.settings = settings
        self.league_service = league_service
        self._task: asyncio.Task[None] | None = None
        self._stop_event = asyncio.Event()

    def start(self) -> None:
        if self._task is not None:
            return
        self._task = asyncio.create_task(self._run_loop())

    async def stop(self) -> None:
        self._stop_event.set()
        if self._task is None:
            return
        self._task.cancel()
        try:
            await self._task
        except asyncio.CancelledError:
            pass

    async def _run_loop(self) -> None:
        await self._sleep_or_stop(self.settings.official_auto_run_initial_delay_seconds)

        while not self._stop_event.is_set():
            try:
                result = await self.league_service.run_official_match(game_type="auto", dry_run=False)
                logger.info("Official league auto-run result: %s", result.model_dump(by_alias=True))
            except Exception:  # noqa: BLE001
                logger.exception("Official league auto-run failed")

            await self._sleep_or_stop(self.settings.official_auto_run_interval_seconds)

    async def _sleep_or_stop(self, seconds: int) -> None:
        try:
            await asyncio.wait_for(self._stop_event.wait(), timeout=max(1, seconds))
        except TimeoutError:
            return
