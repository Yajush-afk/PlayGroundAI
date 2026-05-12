from pydantic import ValidationError

from app.domain.league_prompts import build_joke_judge_prompt, build_scenario_final_judge_prompt
from app.domain.league_schemas import DebateJudgeResult, JokeJudgeResult, LeagueGeneratedEntry, ScenarioJudgeResult, ScenarioPairResult


def _entries() -> list[LeagueGeneratedEntry]:
    return [
        LeagueGeneratedEntry(persona="Aria", text="Aria entry"),
        LeagueGeneratedEntry(persona="Lex", text="Lex entry"),
        LeagueGeneratedEntry(persona="Sage", text="Sage entry"),
        LeagueGeneratedEntry(persona="Rex", text="Rex entry"),
    ]


def test_debate_judge_result_requires_total_score_sum() -> None:
    payload = {
        "summary": "Aria won.",
        "winner": "Aria",
        "bestMoment": "Aria landed the clearest line.",
        "votes": [],
        "evaluations": [
            {
                "persona": "Aria",
                "scores": {"logic": 10, "clarity": 10, "personality": 10, "punch": 10},
                "totalScore": 39,
                "rank": 1,
                "pointsAwarded": 10,
                "bonusPoints": 2,
                "standoutMove": "Best line.",
            },
            {
                "persona": "Lex",
                "scores": {"logic": 8, "clarity": 8, "personality": 8, "punch": 8},
                "totalScore": 32,
                "rank": 2,
                "pointsAwarded": 6,
                "bonusPoints": 0,
                "standoutMove": "Clean logic.",
            },
            {
                "persona": "Sage",
                "scores": {"logic": 7, "clarity": 7, "personality": 7, "punch": 7},
                "totalScore": 28,
                "rank": 3,
                "pointsAwarded": 3,
                "bonusPoints": 0,
                "standoutMove": "Good reframing.",
            },
            {
                "persona": "Rex",
                "scores": {"logic": 6, "clarity": 6, "personality": 6, "punch": 6},
                "totalScore": 24,
                "rank": 4,
                "pointsAwarded": 1,
                "bonusPoints": 0,
                "standoutMove": "Direct close.",
            },
        ],
    }

    try:
        DebateJudgeResult.model_validate(payload)
    except ValidationError:
        assert True
    else:
        assert False, "Debate totalScore must equal score sum"


def test_joke_judge_result_rejects_self_vote() -> None:
    payload = {
        "summary": "Lex won.",
        "winner": "Lex",
        "bestMoment": "Lex had the sharpest punchline.",
        "votes": [
            {"voter": "Aria", "votedFor": "Aria", "reason": "self"},
            {"voter": "Lex", "votedFor": "Aria", "reason": "fine"},
            {"voter": "Sage", "votedFor": "Lex", "reason": "fine"},
            {"voter": "Rex", "votedFor": "Lex", "reason": "fine"},
        ],
        "evaluations": [
            {
                "persona": "Lex",
                "scores": {"humor": 10, "originality": 9, "promptFit": 9, "personaFlavor": 10},
                "totalScore": 38,
                "rank": 1,
                "pointsAwarded": 10,
                "bonusPoints": 2,
                "standoutMove": "Best joke.",
            },
            {
                "persona": "Aria",
                "scores": {"humor": 8, "originality": 8, "promptFit": 8, "personaFlavor": 8},
                "totalScore": 32,
                "rank": 2,
                "pointsAwarded": 6,
                "bonusPoints": 0,
                "standoutMove": "Warm joke.",
            },
            {
                "persona": "Sage",
                "scores": {"humor": 7, "originality": 7, "promptFit": 7, "personaFlavor": 7},
                "totalScore": 28,
                "rank": 3,
                "pointsAwarded": 3,
                "bonusPoints": 0,
                "standoutMove": "Clever turn.",
            },
            {
                "persona": "Rex",
                "scores": {"humor": 6, "originality": 6, "promptFit": 6, "personaFlavor": 6},
                "totalScore": 24,
                "rank": 4,
                "pointsAwarded": 1,
                "bonusPoints": 0,
                "standoutMove": "Blunt closer.",
            },
        ],
    }

    try:
        JokeJudgeResult.model_validate(payload)
    except ValidationError:
        assert True
    else:
        assert False, "Joke self-votes must be rejected"


def test_scenario_pair_result_requires_winner_in_pair() -> None:
    try:
        ScenarioPairResult.model_validate(
            {
                "pairKey": "semifinal-a",
                "participants": ["Aria", "Lex"],
                "winner": "Sage",
                "reason": "Invalid.",
            }
        )
    except ValidationError:
        assert True
    else:
        assert False, "Scenario pair winner must come from the pair"


def test_scenario_judge_result_accepts_valid_final_shape() -> None:
    result = ScenarioJudgeResult.model_validate(
        {
            "summary": "Aria won with the most practical plan.",
            "winner": "Aria",
            "bestMoment": "Aria converted the constraint into a people-first plan.",
            "pairResults": [
                {"pairKey": "semifinal-a", "participants": ["Aria", "Lex"], "winner": "Aria", "reason": "More robust."},
                {"pairKey": "semifinal-b", "participants": ["Sage", "Rex"], "winner": "Rex", "reason": "More direct."},
            ],
            "votes": [],
            "evaluations": [
                {
                    "persona": "Aria",
                    "scores": {"practicality": 10, "creativity": 9, "constraintHandling": 10, "clarity": 9},
                    "totalScore": 38,
                    "rank": 1,
                    "pointsAwarded": 12,
                    "bonusPoints": 2,
                    "standoutMove": "Best plan.",
                },
                {
                    "persona": "Rex",
                    "scores": {"practicality": 9, "creativity": 7, "constraintHandling": 9, "clarity": 9},
                    "totalScore": 34,
                    "rank": 2,
                    "pointsAwarded": 7,
                    "bonusPoints": 0,
                    "standoutMove": "Most direct plan.",
                },
                {
                    "persona": "Lex",
                    "scores": {"practicality": 8, "creativity": 7, "constraintHandling": 8, "clarity": 8},
                    "totalScore": 31,
                    "rank": 3,
                    "pointsAwarded": 3,
                    "bonusPoints": 0,
                    "standoutMove": "Efficient plan.",
                },
                {
                    "persona": "Sage",
                    "scores": {"practicality": 7, "creativity": 9, "constraintHandling": 7, "clarity": 7},
                    "totalScore": 30,
                    "rank": 4,
                    "pointsAwarded": 3,
                    "bonusPoints": 0,
                    "standoutMove": "Creative framing.",
                },
            ],
        }
    )

    assert result.winner == "Aria"
    assert len(result.pair_results) == 2


def test_game_specific_prompts_include_required_schema_terms() -> None:
    joke_prompt = build_joke_judge_prompt("robots at dinner", _entries())
    scenario_prompt = build_scenario_final_judge_prompt("mission", [], _entries(), _entries()[:2])

    assert "votes" in joke_prompt
    assert "A persona cannot vote for themself" in joke_prompt
    assert "pairResults" in scenario_prompt
    assert "champion = 12" in scenario_prompt
