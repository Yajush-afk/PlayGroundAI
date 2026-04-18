from __future__ import annotations

import logging

from app.domain.prompts import build_judge_prompt
from app.domain.schemas import DebateRecordCreate, JudgeRequest, JudgeScoresResponse
from app.providers.gemini_client import GeminiClient
from app.repositories.debates import DebatesRepository

logger = logging.getLogger(__name__)


class JudgeService:
    def __init__(self, gemini_client: GeminiClient, repository: DebatesRepository | None = None) -> None:
        self.gemini_client = gemini_client
        self.repository = repository

    async def judge_debate(self, payload: JudgeRequest) -> JudgeScoresResponse:
        prompt = build_judge_prompt(payload.topic, payload.history, payload.judge_profile)
        result = await self.gemini_client.generate_judgment(prompt)

        if self.repository is not None:
            try:
                await self.repository.save_debate(
                    DebateRecordCreate(
                        topic=payload.topic,
                        rounds=payload.total_rounds,
                        transcript=payload.history,
                        scores=result.model_dump(by_alias=True),
                        winner=result.winner,
                    )
                )
            except Exception as exc:  # noqa: BLE001
                logger.warning("Supabase persistence failed: %s", exc)

        return result
