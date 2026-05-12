from __future__ import annotations

from typing import TypeVar

from pydantic import BaseModel, ValidationError

from app.core.config import Settings
from app.domain.league_personas import PERSONA_ORDER
from app.domain.league_prompts import (
    build_debate_judge_prompt,
    build_debate_submission_prompt,
    build_joke_judge_prompt,
    build_joke_submission_prompt,
    build_scenario_final_judge_prompt,
    build_scenario_pair_judge_prompt,
    build_scenario_submission_prompt,
    persona_pairs,
    pick_prompt,
)
from app.domain.league_schemas import (
    DebateJudgeResult,
    GameType,
    JokeJudgeResult,
    LeagueGeneratedEntry,
    LeagueMatchArtifact,
    LeagueRoundArtifact,
    ScenarioJudgeResult,
    ScenarioPairResult,
)
from app.domain.schemas import PersonaName
from app.providers.base import ProviderValidationError
from app.providers.gemini_client import GeminiClient
from app.providers.groq_client import GroqClient

ValidatedModel = TypeVar("ValidatedModel", bound=BaseModel)


class MatchRunner:
    def __init__(self, settings: Settings, groq_client: GroqClient, gemini_client: GeminiClient) -> None:
        self.settings = settings
        self.groq_client = groq_client
        self.gemini_client = gemini_client

    async def run(self, game_type: GameType, prompt_index: int) -> LeagueMatchArtifact:
        if game_type == "debate":
            return await self._run_debate(prompt_index)
        if game_type == "joke":
            return await self._run_joke(prompt_index)
        return await self._run_scenario(prompt_index)

    async def _run_debate(self, prompt_index: int) -> LeagueMatchArtifact:
        topic = pick_prompt("debate", prompt_index)
        entries = []
        for persona in PERSONA_ORDER:
            text = await self._generate_participant(persona, build_debate_submission_prompt(persona, topic), max_tokens=170, temperature=0.75)
            entries.append(LeagueGeneratedEntry(persona=persona, text=text))

        judge_result = await self._generate_validated_json(DebateJudgeResult, build_debate_judge_prompt(topic, entries))
        round_artifact = LeagueRoundArtifact(
            roundIndex=1,
            roundType="debate",
            pairKey=None,
            prompt=topic,
            entries=entries,
            judgeResult=judge_result.model_dump(by_alias=True, mode="json"),
        )
        return LeagueMatchArtifact(
            gameType="debate",
            prompt=topic,
            topic=topic,
            entries=entries,
            judgeResult=judge_result,
            rounds=[round_artifact],
            estimatedRequests=self.estimate_requests("debate"),
        )

    async def _run_joke(self, prompt_index: int) -> LeagueMatchArtifact:
        joke_prompt = pick_prompt("joke", prompt_index)
        entries = []
        for persona in PERSONA_ORDER:
            text = await self._generate_participant(persona, build_joke_submission_prompt(persona, joke_prompt), max_tokens=70, temperature=0.95)
            entries.append(LeagueGeneratedEntry(persona=persona, text=text))

        judge_result = await self._generate_validated_json(JokeJudgeResult, build_joke_judge_prompt(joke_prompt, entries))
        round_artifact = LeagueRoundArtifact(
            roundIndex=1,
            roundType="joke",
            pairKey=None,
            prompt=joke_prompt,
            entries=entries,
            judgeResult=judge_result.model_dump(by_alias=True, mode="json"),
        )
        return LeagueMatchArtifact(
            gameType="joke",
            prompt=joke_prompt,
            topic=None,
            entries=entries,
            judgeResult=judge_result,
            rounds=[round_artifact],
            estimatedRequests=self.estimate_requests("joke"),
        )

    async def _run_scenario(self, prompt_index: int) -> LeagueMatchArtifact:
        scenario = pick_prompt("scenario", prompt_index)
        semifinal_entries: list[LeagueGeneratedEntry] = []
        semifinal_rounds: list[LeagueRoundArtifact] = []
        pair_results: list[ScenarioPairResult] = []
        previous_plans: dict[PersonaName, str] = {}

        for index, pair in enumerate(persona_pairs(), start=1):
            pair_key = f"semifinal-{'a' if index == 1 else 'b'}"
            pair_entries = []
            for persona, opponent in ((pair[0], pair[1]), (pair[1], pair[0])):
                text = await self._generate_participant(
                    persona,
                    build_scenario_submission_prompt(persona, scenario, opponent=opponent),
                    max_tokens=110,
                    temperature=0.8,
                )
                entry = LeagueGeneratedEntry(persona=persona, text=text)
                pair_entries.append(entry)
                semifinal_entries.append(entry)
                previous_plans[persona] = text

            pair_result = await self._generate_validated_json(
                ScenarioPairResult,
                build_scenario_pair_judge_prompt(scenario, pair_key, pair_entries),
            )
            pair_results.append(pair_result)
            semifinal_rounds.append(
                LeagueRoundArtifact(
                    roundIndex=index,
                    roundType="scenario_semifinal",
                    pairKey=pair_key,
                    prompt=scenario,
                    entries=pair_entries,
                    judgeResult=pair_result.model_dump(by_alias=True, mode="json"),
                )
            )

        finalists = [result.winner for result in pair_results]
        final_entries = []
        for persona in finalists:
            opponent = finalists[1] if persona == finalists[0] else finalists[0]
            text = await self._generate_participant(
                persona,
                build_scenario_submission_prompt(persona, scenario, opponent=opponent, previous_plan=previous_plans[persona]),
                max_tokens=110,
                temperature=0.8,
            )
            final_entries.append(LeagueGeneratedEntry(persona=persona, text=text))

        final_result = await self._generate_validated_json(
            ScenarioJudgeResult,
            build_scenario_final_judge_prompt(
                scenario,
                [result.model_dump(by_alias=True, mode="json") for result in pair_results],
                semifinal_entries,
                final_entries,
            ),
        )
        all_entries = semifinal_entries + final_entries
        rounds = [
            *semifinal_rounds,
            LeagueRoundArtifact(
                roundIndex=3,
                roundType="scenario_final",
                pairKey="final",
                prompt=scenario,
                entries=final_entries,
                judgeResult=final_result.model_dump(by_alias=True, mode="json"),
            ),
        ]
        return LeagueMatchArtifact(
            gameType="scenario",
            prompt=scenario,
            topic=None,
            entries=all_entries,
            judgeResult=final_result,
            rounds=rounds,
            estimatedRequests=self.estimate_requests("scenario"),
        )

    def estimate_requests(self, game_type: GameType) -> int:
        if game_type == "scenario":
            return 9
        return 5

    def estimate_provider_requests(self, game_type: GameType) -> dict[str, int]:
        if game_type == "scenario":
            return {
                self.settings.official_participant_provider: 6,
                "gemini": 3,
            }
        return {
            self.settings.official_participant_provider: 4,
            "gemini": 1,
        }

    async def _generate_participant(self, persona: PersonaName, prompt: str, *, max_tokens: int, temperature: float) -> str:
        return await self.groq_client.generate_chat_completion_text(
            model=self._model_for_persona(persona),
            messages=[{"role": "user", "content": prompt}],
            temperature=temperature,
            max_tokens=max_tokens,
        )

    async def _generate_validated_json(self, schema: type[ValidatedModel], prompt: str) -> ValidatedModel:
        payload = await self.gemini_client.generate_json(prompt)
        try:
            return schema.model_validate(payload)
        except ValidationError as exc:
            raise ProviderValidationError(f"Gemini returned invalid {schema.__name__} schema: {exc}") from exc

    def _model_for_persona(self, persona: str) -> str:
        if persona == "Aria":
            return self.settings.official_participant_model_strong
        return self.settings.official_participant_model_fast
