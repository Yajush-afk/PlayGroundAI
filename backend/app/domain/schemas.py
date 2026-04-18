from __future__ import annotations

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

PersonaName = Literal["Aria", "Lex", "Sage", "Rex"]
RoundCount = Literal[3, 5, 7]
DebateStage = Literal["opening", "rebuttal", "crossfire", "closing"]
JudgeProfile = Literal["balanced", "logic_first", "crowd_favorite"]


class DebateTurnHistoryEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    persona: PersonaName
    text: str = Field(min_length=1, max_length=4000)
    round: int | None = Field(default=None, ge=1)


class DebateTurnRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    topic: str = Field(min_length=1, max_length=200)
    persona: PersonaName
    current_round: int = Field(validation_alias="currentRound", serialization_alias="currentRound", ge=1)
    total_rounds: RoundCount = Field(validation_alias="totalRounds", serialization_alias="totalRounds")
    history: list[DebateTurnHistoryEntry] = Field(default_factory=list)
    challenge_card_text: str | None = Field(
        default=None,
        validation_alias="challengeCardText",
        serialization_alias="challengeCardText",
        min_length=1,
        max_length=120,
    )


class JudgeHistoryEntry(BaseModel):
    model_config = ConfigDict(extra="forbid")

    round: int = Field(ge=1)
    persona: PersonaName
    text: str = Field(min_length=1, max_length=4000)


class JudgeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    topic: str = Field(min_length=1, max_length=200)
    history: list[JudgeHistoryEntry] = Field(min_length=1)
    total_rounds: RoundCount = Field(validation_alias="totalRounds", serialization_alias="totalRounds")
    judge_profile: JudgeProfile = Field(
        default="balanced",
        validation_alias="judgeProfile",
        serialization_alias="judgeProfile",
    )


class ScoreBreakdown(BaseModel):
    model_config = ConfigDict(extra="forbid")

    logic: int = Field(ge=1, le=10)
    clarity: int = Field(ge=1, le=10)
    evidence: int = Field(ge=1, le=10)
    engagement: int = Field(ge=1, le=10)


class Evaluation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    persona: PersonaName
    scores: ScoreBreakdown
    total_score: int = Field(validation_alias="totalScore", serialization_alias="totalScore", ge=4, le=40)
    rank: int = Field(ge=1, le=4)
    standout_move: str = Field(validation_alias="standoutMove", serialization_alias="standoutMove", min_length=1, max_length=500)


class JudgeScoresResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    summary: str = Field(min_length=1, max_length=2000)
    winner: PersonaName
    strongest_moment: str = Field(validation_alias="strongestMoment", serialization_alias="strongestMoment", min_length=1, max_length=500)
    best_exchange: str = Field(validation_alias="bestExchange", serialization_alias="bestExchange", min_length=1, max_length=500)
    conclusion: str = Field(min_length=1, max_length=1000)
    evaluations: list[Evaluation] = Field(min_length=4, max_length=4)


class DebateRecordCreate(BaseModel):
    topic: str
    rounds: int
    transcript: list[JudgeHistoryEntry]
    scores: dict
    winner: PersonaName


class ErrorResponse(BaseModel):
    detail: str
