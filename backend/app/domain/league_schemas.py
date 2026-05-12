from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, model_validator

from app.domain.schemas import PersonaName

GameType = Literal["debate", "joke", "scenario"]
AdminGameType = Literal["auto", "debate", "joke", "scenario"]
LeagueType = Literal["official", "custom"]
MatchStatus = Literal["queued", "running", "judging", "completed", "failed"]


class LeagueScoreBreakdown(BaseModel):
    model_config = ConfigDict(extra="forbid")

    logic: int | None = Field(default=None, ge=1, le=10)
    clarity: int | None = Field(default=None, ge=1, le=10)
    personality: int | None = Field(default=None, ge=1, le=10)
    punch: int | None = Field(default=None, ge=1, le=10)
    humor: int | None = Field(default=None, ge=1, le=10)
    originality: int | None = Field(default=None, ge=1, le=10)
    prompt_fit: int | None = Field(default=None, validation_alias="promptFit", serialization_alias="promptFit", ge=1, le=10)
    persona_flavor: int | None = Field(default=None, validation_alias="personaFlavor", serialization_alias="personaFlavor", ge=1, le=10)
    practicality: int | None = Field(default=None, ge=1, le=10)
    creativity: int | None = Field(default=None, ge=1, le=10)
    constraint_handling: int | None = Field(
        default=None,
        validation_alias="constraintHandling",
        serialization_alias="constraintHandling",
        ge=1,
        le=10,
    )


class BaseLeagueEvaluation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    persona: PersonaName
    total_score: int = Field(validation_alias="totalScore", serialization_alias="totalScore", ge=1, le=60)
    rank: int = Field(ge=1, le=4)
    points_awarded: int = Field(default=0, validation_alias="pointsAwarded", serialization_alias="pointsAwarded", ge=0)
    bonus_points: int = Field(default=0, validation_alias="bonusPoints", serialization_alias="bonusPoints", ge=0)
    standout_move: str = Field(validation_alias="standoutMove", serialization_alias="standoutMove", min_length=1, max_length=500)


class DebateScores(BaseModel):
    model_config = ConfigDict(extra="forbid")

    logic: int = Field(ge=1, le=10)
    clarity: int = Field(ge=1, le=10)
    personality: int = Field(ge=1, le=10)
    punch: int = Field(ge=1, le=10)


class JokeScores(BaseModel):
    model_config = ConfigDict(extra="forbid")

    humor: int = Field(ge=1, le=10)
    originality: int = Field(ge=1, le=10)
    prompt_fit: int = Field(validation_alias="promptFit", serialization_alias="promptFit", ge=1, le=10)
    persona_flavor: int = Field(validation_alias="personaFlavor", serialization_alias="personaFlavor", ge=1, le=10)


class ScenarioScores(BaseModel):
    model_config = ConfigDict(extra="forbid")

    practicality: int = Field(ge=1, le=10)
    creativity: int = Field(ge=1, le=10)
    constraint_handling: int = Field(validation_alias="constraintHandling", serialization_alias="constraintHandling", ge=1, le=10)
    clarity: int = Field(ge=1, le=10)


class DebateEvaluation(BaseLeagueEvaluation):
    scores: DebateScores

    @model_validator(mode="after")
    def validate_total(self) -> "DebateEvaluation":
        expected = self.scores.logic + self.scores.clarity + self.scores.personality + self.scores.punch
        if self.total_score != expected:
            raise ValueError("totalScore must equal debate score sum")
        return self


class JokeEvaluation(BaseLeagueEvaluation):
    scores: JokeScores

    @model_validator(mode="after")
    def validate_total(self) -> "JokeEvaluation":
        expected = self.scores.humor + self.scores.originality + self.scores.prompt_fit + self.scores.persona_flavor
        if self.total_score != expected:
            raise ValueError("totalScore must equal joke score sum")
        return self


class ScenarioEvaluation(BaseLeagueEvaluation):
    scores: ScenarioScores

    @model_validator(mode="after")
    def validate_total(self) -> "ScenarioEvaluation":
        expected = self.scores.practicality + self.scores.creativity + self.scores.constraint_handling + self.scores.clarity
        if self.total_score != expected:
            raise ValueError("totalScore must equal scenario score sum")
        return self


LeagueEvaluation = DebateEvaluation | JokeEvaluation | ScenarioEvaluation


class LeagueVote(BaseModel):
    model_config = ConfigDict(extra="forbid")

    voter: PersonaName
    voted_for: PersonaName = Field(validation_alias="votedFor", serialization_alias="votedFor")
    reason: str = Field(min_length=1, max_length=300)

    @model_validator(mode="after")
    def reject_self_vote(self) -> "LeagueVote":
        if self.voter == self.voted_for:
            raise ValueError("Joke battle voters cannot vote for themselves")
        return self


class BaseLeagueJudgeResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str = Field(min_length=1, max_length=1200)
    winner: PersonaName
    best_moment: str = Field(validation_alias="bestMoment", serialization_alias="bestMoment", min_length=1, max_length=500)


class DebateJudgeResult(BaseLeagueJudgeResult):
    evaluations: list[DebateEvaluation] = Field(min_length=4, max_length=4)
    votes: list[LeagueVote] = Field(default_factory=list, max_length=0)

    @model_validator(mode="after")
    def validate_rankings(self) -> "DebateJudgeResult":
        _validate_complete_rankings(self.winner, self.evaluations)
        return self


class JokeJudgeResult(BaseLeagueJudgeResult):
    evaluations: list[JokeEvaluation] = Field(min_length=4, max_length=4)
    votes: list[LeagueVote] = Field(min_length=4, max_length=4)

    @model_validator(mode="after")
    def validate_rankings_and_votes(self) -> "JokeJudgeResult":
        _validate_complete_rankings(self.winner, self.evaluations)
        voters = {vote.voter for vote in self.votes}
        if voters != {"Aria", "Lex", "Sage", "Rex"}:
            raise ValueError("Joke battle must include exactly one vote from each persona")
        return self


class ScenarioPairResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    pair_key: str = Field(validation_alias="pairKey", serialization_alias="pairKey", min_length=1, max_length=50)
    participants: list[PersonaName] = Field(min_length=2, max_length=2)
    winner: PersonaName
    reason: str = Field(min_length=1, max_length=500)

    @model_validator(mode="after")
    def validate_winner_in_pair(self) -> "ScenarioPairResult":
        if self.winner not in self.participants:
            raise ValueError("Pair winner must be one of the pair participants")
        return self


class ScenarioJudgeResult(BaseLeagueJudgeResult):
    evaluations: list[ScenarioEvaluation] = Field(min_length=4, max_length=4)
    pair_results: list[ScenarioPairResult] = Field(
        default_factory=list,
        validation_alias="pairResults",
        serialization_alias="pairResults",
    )
    votes: list[LeagueVote] = Field(default_factory=list, max_length=0)

    @model_validator(mode="after")
    def validate_rankings(self) -> "ScenarioJudgeResult":
        _validate_complete_rankings(self.winner, self.evaluations)
        return self


LeagueJudgeResult = DebateJudgeResult | JokeJudgeResult | ScenarioJudgeResult


class LeagueGeneratedEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    persona: PersonaName
    text: str = Field(min_length=1, max_length=2000)


class LeagueRoundArtifact(BaseModel):
    model_config = ConfigDict(extra="forbid")

    round_index: int = Field(validation_alias="roundIndex", serialization_alias="roundIndex", ge=1)
    round_type: str = Field(validation_alias="roundType", serialization_alias="roundType", min_length=1, max_length=50)
    pair_key: str | None = Field(default=None, validation_alias="pairKey", serialization_alias="pairKey")
    prompt: str
    entries: list[LeagueGeneratedEntry]
    judge_result: dict | None = Field(default=None, validation_alias="judgeResult", serialization_alias="judgeResult")


class LeagueMatchArtifact(BaseModel):
    model_config = ConfigDict(extra="forbid")

    game_type: GameType = Field(validation_alias="gameType", serialization_alias="gameType")
    prompt: str
    topic: str | None = None
    entries: list[LeagueGeneratedEntry]
    judge_result: LeagueJudgeResult = Field(validation_alias="judgeResult", serialization_alias="judgeResult")
    rounds: list[LeagueRoundArtifact] = Field(default_factory=list)
    estimated_requests: int = Field(validation_alias="estimatedRequests", serialization_alias="estimatedRequests", ge=1)


class AdminRunMatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    game_type: AdminGameType = Field(default="auto", validation_alias="gameType", serialization_alias="gameType")
    dry_run: bool = Field(default=False, validation_alias="dryRun", serialization_alias="dryRun")
    queue_only: bool = Field(default=False, validation_alias="queueOnly", serialization_alias="queueOnly")


class AdminRunMatchResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    match_id: str | None = Field(default=None, validation_alias="matchId", serialization_alias="matchId")
    game_type: GameType | None = Field(default=None, validation_alias="gameType", serialization_alias="gameType")
    status: MatchStatus | Literal["skipped"]
    reason: str | None = None
    estimated_requests: int = Field(default=0, validation_alias="estimatedRequests", serialization_alias="estimatedRequests")
    paused_until: str | None = Field(default=None, validation_alias="pausedUntil", serialization_alias="pausedUntil")


class LeagueStatus(BaseModel):
    model_config = ConfigDict(extra="forbid")

    generation_enabled: bool = Field(validation_alias="generationEnabled", serialization_alias="generationEnabled")
    cooling_down: bool = Field(validation_alias="coolingDown", serialization_alias="coolingDown")
    paused_until: str | None = Field(default=None, validation_alias="pausedUntil", serialization_alias="pausedUntil")
    next_recommended_run_at: str | None = Field(
        default=None,
        validation_alias="nextRecommendedRunAt",
        serialization_alias="nextRecommendedRunAt",
    )


class LeagueStateResponse(BaseModel):
    model_config = ConfigDict(extra="allow")

    season: dict | None
    leaderboard: list[dict]
    latest_matches: list[dict] = Field(validation_alias="latestMatches", serialization_alias="latestMatches")
    league_status: LeagueStatus = Field(validation_alias="leagueStatus", serialization_alias="leagueStatus")


class LiveLeagueResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    current_match: dict | None = Field(default=None, validation_alias="currentMatch", serialization_alias="currentMatch")
    previous_match: dict | None = Field(default=None, validation_alias="previousMatch", serialization_alias="previousMatch")
    up_next: dict | None = Field(default=None, validation_alias="upNext", serialization_alias="upNext")
    leaderboard: list[dict]
    league_status: LeagueStatus = Field(validation_alias="leagueStatus", serialization_alias="leagueStatus")


def _validate_complete_rankings(winner: PersonaName, evaluations: list[BaseLeagueEvaluation]) -> None:
    personas = {evaluation.persona for evaluation in evaluations}
    ranks = {evaluation.rank for evaluation in evaluations}
    if personas != {"Aria", "Lex", "Sage", "Rex"}:
        raise ValueError("Evaluations must include all four personas exactly once")
    if ranks != {1, 2, 3, 4}:
        raise ValueError("Evaluations must rank personas 1 through 4 exactly once")
    rank_one = next(evaluation.persona for evaluation in evaluations if evaluation.rank == 1)
    if winner != rank_one:
        raise ValueError("winner must match rank 1 persona")
