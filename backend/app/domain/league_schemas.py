from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

from app.domain.schemas import PersonaName

GameType = Literal["debate", "joke", "scenario"]
AdminGameType = Literal["auto", "debate", "joke", "scenario"]
LeagueType = Literal["official", "custom"]
MatchStatus = Literal["queued", "running", "completed", "failed"]


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


class LeagueEvaluation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    persona: PersonaName
    scores: LeagueScoreBreakdown
    total_score: int = Field(validation_alias="totalScore", serialization_alias="totalScore", ge=1, le=60)
    rank: int = Field(ge=1, le=4)
    points_awarded: int = Field(default=0, validation_alias="pointsAwarded", serialization_alias="pointsAwarded", ge=0)
    bonus_points: int = Field(default=0, validation_alias="bonusPoints", serialization_alias="bonusPoints", ge=0)
    standout_move: str = Field(validation_alias="standoutMove", serialization_alias="standoutMove", min_length=1, max_length=500)


class LeagueVote(BaseModel):
    model_config = ConfigDict(extra="forbid")

    voter: PersonaName
    voted_for: PersonaName = Field(validation_alias="votedFor", serialization_alias="votedFor")
    reason: str = Field(min_length=1, max_length=300)


class LeagueJudgeResult(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str = Field(min_length=1, max_length=1200)
    winner: PersonaName
    best_moment: str = Field(validation_alias="bestMoment", serialization_alias="bestMoment", min_length=1, max_length=500)
    evaluations: list[LeagueEvaluation] = Field(min_length=4, max_length=4)
    votes: list[LeagueVote] = Field(default_factory=list)


class LeagueGeneratedEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    persona: PersonaName
    text: str = Field(min_length=1, max_length=2000)


class LeagueMatchArtifact(BaseModel):
    model_config = ConfigDict(extra="forbid")

    game_type: GameType = Field(validation_alias="gameType", serialization_alias="gameType")
    prompt: str
    topic: str | None = None
    entries: list[LeagueGeneratedEntry]
    judge_result: LeagueJudgeResult = Field(validation_alias="judgeResult", serialization_alias="judgeResult")
    estimated_requests: int = Field(validation_alias="estimatedRequests", serialization_alias="estimatedRequests", ge=1)


class AdminRunMatchRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    game_type: AdminGameType = Field(default="auto", validation_alias="gameType", serialization_alias="gameType")
    dry_run: bool = Field(default=False, validation_alias="dryRun", serialization_alias="dryRun")


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
