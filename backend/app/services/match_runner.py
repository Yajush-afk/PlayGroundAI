from __future__ import annotations

from pydantic import ValidationError

from app.core.config import Settings
from app.domain.league_personas import PERSONA_ORDER
from app.domain.league_prompts import build_league_judge_prompt, build_participant_prompt, pick_prompt
from app.domain.league_schemas import GameType, LeagueGeneratedEntry, LeagueJudgeResult, LeagueMatchArtifact
from app.providers.base import ProviderValidationError
from app.providers.gemini_client import GeminiClient
from app.providers.groq_client import GroqClient


class MatchRunner:
    def __init__(self, settings: Settings, groq_client: GroqClient, gemini_client: GeminiClient) -> None:
        self.settings = settings
        self.groq_client = groq_client
        self.gemini_client = gemini_client

    async def run(self, game_type: GameType, prompt_index: int) -> LeagueMatchArtifact:
        prompt = pick_prompt(game_type, prompt_index)
        entries: list[LeagueGeneratedEntry] = []
        for persona in PERSONA_ORDER:
            model = self._model_for_persona(persona)
            text = await self.groq_client.generate_chat_completion_text(
                model=model,
                messages=[{"role": "user", "content": build_participant_prompt(game_type, persona, prompt)}],
                temperature=0.9 if game_type == "joke" else 0.75,
                max_tokens=140 if game_type != "joke" else 70,
            )
            entries.append(LeagueGeneratedEntry(persona=persona, text=text))

        judge_payload = await self.gemini_client.generate_json(build_league_judge_prompt(game_type, prompt, entries))
        try:
            judge_result = LeagueJudgeResult.model_validate(judge_payload)
        except ValidationError as exc:
            raise ProviderValidationError(f"Gemini returned invalid league judgment schema: {exc}") from exc

        return LeagueMatchArtifact(
            gameType=game_type,
            prompt=prompt,
            topic=prompt if game_type == "debate" else None,
            entries=entries,
            judgeResult=judge_result,
            estimatedRequests=self.estimate_requests(game_type),
        )

    def estimate_requests(self, game_type: GameType) -> int:
        if game_type == "scenario":
            return 5
        return 5

    def _model_for_persona(self, persona: str) -> str:
        if persona == "Aria":
            return self.settings.official_participant_model_strong
        return self.settings.official_participant_model_fast
