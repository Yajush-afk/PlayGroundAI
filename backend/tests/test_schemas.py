from pydantic import ValidationError

from app.domain.schemas import DebateTurnRequest, ErrorResponse, JudgeScoresResponse


def test_debate_turn_request_accepts_valid_payload() -> None:
    payload = DebateTurnRequest.model_validate(
        {
            "topic": "Should AI be regulated?",
            "persona": "Aria",
            "currentRound": 1,
            "totalRounds": 3,
            "history": [],
        }
    )

    assert payload.persona == "Aria"
    assert payload.total_rounds == 3


def test_judge_scores_response_requires_full_evaluation_shape() -> None:
    payload = {
        "summary": "Sage won by synthesizing the strongest claims from both sides.",
        "winner": "Sage",
        "strongestMoment": "Sage exposed the hidden assumption shared by both camps.",
        "conclusion": "The collective debate reveals that progress must survive real-world consequence.",
        "evaluations": [
            {
                "persona": "Aria",
                "scores": {"logic": 8, "clarity": 9, "evidence": 8, "engagement": 9},
                "totalScore": 34,
                "rank": 2,
                "standoutMove": "Forced the debate back toward lived stakes.",
            },
            {
                "persona": "Lex",
                "scores": {"logic": 9, "clarity": 8, "evidence": 9, "engagement": 6},
                "totalScore": 32,
                "rank": 3,
                "standoutMove": "Demanded measurable tradeoffs.",
            },
            {
                "persona": "Sage",
                "scores": {"logic": 10, "clarity": 9, "evidence": 8, "engagement": 10},
                "totalScore": 37,
                "rank": 1,
                "standoutMove": "Reframed the debate at a deeper level.",
            },
            {
                "persona": "Rex",
                "scores": {"logic": 7, "clarity": 8, "evidence": 7, "engagement": 7},
                "totalScore": 29,
                "rank": 4,
                "standoutMove": "Grounded the discussion in historical memory.",
            },
        ],
    }

    result = JudgeScoresResponse.model_validate(payload)
    assert result.winner == "Sage"
    assert len(result.evaluations) == 4


def test_judge_scores_response_serializes_camel_case_aliases() -> None:
    payload = {
        "summary": "Sage won by synthesizing the strongest claims from both sides.",
        "winner": "Sage",
        "strongestMoment": "Sage exposed the hidden assumption shared by both camps.",
        "conclusion": "The collective debate reveals that progress must survive real-world consequence.",
        "evaluations": [
            {
                "persona": "Aria",
                "scores": {"logic": 8, "clarity": 9, "evidence": 8, "engagement": 9},
                "totalScore": 34,
                "rank": 2,
                "standoutMove": "Forced the debate back toward lived stakes.",
            },
            {
                "persona": "Lex",
                "scores": {"logic": 9, "clarity": 8, "evidence": 9, "engagement": 6},
                "totalScore": 32,
                "rank": 3,
                "standoutMove": "Demanded measurable tradeoffs.",
            },
            {
                "persona": "Sage",
                "scores": {"logic": 10, "clarity": 9, "evidence": 8, "engagement": 10},
                "totalScore": 37,
                "rank": 1,
                "standoutMove": "Reframed the debate at a deeper level.",
            },
            {
                "persona": "Rex",
                "scores": {"logic": 7, "clarity": 8, "evidence": 7, "engagement": 7},
                "totalScore": 29,
                "rank": 4,
                "standoutMove": "Grounded the discussion in historical memory.",
            },
        ],
    }

    result = JudgeScoresResponse.model_validate(payload).model_dump(by_alias=True)

    assert "strongestMoment" in result
    assert "strongest_moment" not in result
    assert "totalScore" in result["evaluations"][0]
    assert "standoutMove" in result["evaluations"][0]
    assert "total_score" not in result["evaluations"][0]
    assert "standout_move" not in result["evaluations"][0]


def test_judge_scores_response_rejects_invalid_winner() -> None:
    invalid_payload = {
        "summary": "summary",
        "winner": "Unknown",
        "strongestMoment": "moment",
        "conclusion": "conclusion",
        "evaluations": [],
    }

    try:
        JudgeScoresResponse.model_validate(invalid_payload)
    except ValidationError:
        assert True
    else:
        assert False, "JudgeScoresResponse should reject invalid winner values"


def test_error_response_uses_fastapi_detail_shape() -> None:
    payload = ErrorResponse.model_validate({"detail": "Rate limit exceeded"})
    assert payload.detail == "Rate limit exceeded"
