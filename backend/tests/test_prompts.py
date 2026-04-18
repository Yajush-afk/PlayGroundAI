from app.domain.prompts import build_compact_history_context, build_debate_prompt, resolve_debate_stage


def test_resolve_debate_stage_maps_rounds_correctly() -> None:
    assert resolve_debate_stage(1, 3) == "opening"
    assert resolve_debate_stage(2, 3) == "crossfire"
    assert resolve_debate_stage(2, 5) == "rebuttal"
    assert resolve_debate_stage(4, 5) == "crossfire"
    assert resolve_debate_stage(5, 5) == "closing"


def test_build_debate_prompt_is_stage_aware_and_mentions_challenge_card() -> None:
    prompt = build_debate_prompt(
        persona="Lex",
        topic="Should AI be regulated?",
        current_round=2,
        total_rounds=5,
        history=[
            {"persona": "Aria", "text": "Regulation protects the vulnerable.", "round": 1},
            {"persona": "Lex", "text": "Bad rules can freeze innovation.", "round": 1},
        ],
        challenge_card_text="Use one concrete historical example.",
    )

    assert "Stage: rebuttal" in prompt
    assert "Use one concrete historical example." in prompt
    assert "Name at least one opponent directly" in prompt
    assert "45-70 words" in prompt


def test_compact_history_keeps_last_four_turns_verbatim_and_summarizes_older_rounds() -> None:
    history = [
        {"persona": "Aria", "text": "Aria opening argument about equity and the social contract.", "round": 1},
        {"persona": "Lex", "text": "Lex challenges Aria on incentives and efficiency.", "round": 1},
        {"persona": "Sage", "text": "Sage questions both camps and references first principles.", "round": 1},
        {"persona": "Rex", "text": "Rex invokes continuity and historical stability.", "round": 1},
        {"persona": "Aria", "text": "Aria says Lex ignores structural barriers.", "round": 2},
        {"persona": "Lex", "text": "Lex says Aria creates dependency and cites reform failures.", "round": 2},
    ]

    context = build_compact_history_context(history)

    assert "EARLIER ROUNDS SUMMARY" in context
    assert "Round 1:" in context
    assert "[R2][ARIA]" in context
    assert "[R2][LEX]" in context
    assert "[R1][ARIA]" not in context


def test_compact_history_drops_oldest_summary_material_first() -> None:
    history = []
    for round_number in range(1, 7):
        for persona in ("Aria", "Lex", "Sage", "Rex"):
            history.append(
                {
                    "persona": persona,
                    "text": f"{persona} argues at length in round {round_number} about the same disputed institutional tradeoff repeatedly.",
                    "round": round_number,
                }
            )

    context = build_compact_history_context(history)

    assert "[R6][ARIA]" in context
    assert "[R6][REX]" in context
    assert "Round 1:" not in context
