from __future__ import annotations

from app.domain.personas import get_persona_contract
from app.domain.schemas import DebateTurnHistoryEntry, JudgeHistoryEntry, PersonaName


def build_debate_prompt(
    persona: PersonaName,
    topic: str,
    current_round: int,
    total_rounds: int,
    history: list[DebateTurnHistoryEntry],
) -> str:
    contract = get_persona_contract(persona)
    transcript = (
        "You are making the opening argument. No one has spoken yet."
        if not history
        else "\n\n".join(f"[{entry.persona.upper()}]: {entry.text}" for entry in history)
    )

    return f"""
DEBATE CONTEXT:
- Topic: "{topic}"
- Round: {current_round} of {total_rounds}
- You are: {persona}

YOUR PERSONA CONTRACT:
- Worldview: {contract.worldview}
- Debate style: {contract.debate_style}
- Weakness to own: {contract.weakness}

CONVERSATION SO FAR:
{transcript}

YOUR INSTRUCTIONS FOR THIS TURN:
1. Read every argument above carefully before responding.
2. If someone made a point that directly conflicts with your worldview, address it head-on and use their name.
3. Do not repeat a point you or anyone else has already made. Build forward.
4. Past the halfway point, begin steering toward a conclusion or your strongest thesis.
5. Write 1-2 short, punchy paragraphs. No bullet points, no headers, no markdown.
6. Speak as your character naturally would, in full sentences with conviction and personality.
7. Stay under 100 words total.
8. Do not break character. Do not refer to yourself as an AI.
""".strip()


def build_judge_prompt(topic: str, history: list[JudgeHistoryEntry]) -> str:
    transcript = "\n\n".join(f"Round {entry.round} - {entry.persona}:\n{entry.text}" for entry in history)

    return f"""
You are the JUDGE of a structured AI debate. Your job is to evaluate fairly, rigorously, and without bias toward any political or philosophical position.

DEBATE TOPIC: "{topic}"

FULL TRANSCRIPT:
{transcript}

YOUR EVALUATION TASK:
Score each participant — Aria, Lex, Sage, Rex — on these 4 dimensions (1-10 each):
- logic: Did they make internally consistent, well-structured arguments?
- clarity: Were their points easy to follow and clearly expressed?
- evidence: Did they use facts, examples, history, or data to support claims?
- engagement: Did they meaningfully respond to what other participants actually said?

IMPORTANT FAIRNESS RULES:
- Do not favour any political or ideological position.
- A well-argued conservative point scores the same as a well-argued progressive one.
- Penalise weak reasoning regardless of which side it comes from.
- Reward participants who acknowledged weaknesses and addressed them.
- Reward participants who directly named and challenged opponents.

SUMMARY INSTRUCTIONS:
Write a 2-3 sentence neutral summary that names the winner, explains why they won, and acknowledges the strongest point made by the runner-up.

Return ONLY a valid JSON object. No markdown, no explanation, no text outside the JSON:
{{
  "summary": "<2-3 sentence neutral summary>",
  "winner": "<Aria | Lex | Sage | Rex>",
  "strongestMoment": "<one concise sentence describing the single best argument made>",
  "conclusion": "The collective debate reveals that <1 sentence synthesis of the emergent truth or outcome>.",
  "evaluations": [
    {{
      "persona": "Aria",
      "scores": {{"logic": <1-10>, "clarity": <1-10>, "evidence": <1-10>, "engagement": <1-10>}},
      "totalScore": <sum of 4 scores>,
      "rank": <1-4>,
      "standoutMove": "<one sentence on their best specific moment>"
    }},
    {{
      "persona": "Lex",
      "scores": {{"logic": <1-10>, "clarity": <1-10>, "evidence": <1-10>, "engagement": <1-10>}},
      "totalScore": <sum>,
      "rank": <1-4>,
      "standoutMove": "<one sentence>"
    }},
    {{
      "persona": "Sage",
      "scores": {{"logic": <1-10>, "clarity": <1-10>, "evidence": <1-10>, "engagement": <1-10>}},
      "totalScore": <sum>,
      "rank": <1-4>,
      "standoutMove": "<one sentence>"
    }},
    {{
      "persona": "Rex",
      "scores": {{"logic": <1-10>, "clarity": <1-10>, "evidence": <1-10>, "engagement": <1-10>}},
      "totalScore": <sum>,
      "rank": <1-4>,
      "standoutMove": "<one sentence>"
    }}
  ]
}}
""".strip()
