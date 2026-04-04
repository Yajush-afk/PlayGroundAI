from __future__ import annotations

from app.domain.personas import get_persona_contract
from app.domain.prompts import build_debate_prompt
from app.domain.schemas import DebateTurnRequest
from app.providers.base import StreamHandle
from app.providers.groq_client import GroqClient


class DebateService:
    def __init__(self, groq_client: GroqClient) -> None:
        self.groq_client = groq_client

    async def start_turn_stream(self, payload: DebateTurnRequest) -> StreamHandle:
        contract = get_persona_contract(payload.persona)
        prompt = build_debate_prompt(
            persona=payload.persona,
            topic=payload.topic,
            current_round=payload.current_round,
            total_rounds=payload.total_rounds,
            history=payload.history,
        )
        messages = [{"role": "user", "content": prompt}]
        return await self.groq_client.open_chat_completion_stream(
            model=contract.model,
            messages=messages,
            temperature=0.85,
            max_tokens=180,
        )
