from __future__ import annotations

import re
from collections import defaultdict

from app.domain.personas import get_persona_contract
from app.domain.schemas import DebateStage, DebateTurnHistoryEntry, JudgeHistoryEntry, JudgeProfile, PersonaName

PERSONA_NAMES: tuple[PersonaName, ...] = ("Aria", "Lex", "Sage", "Rex")
MAX_VERBATIM_TURNS = 4
MAX_SUMMARY_CHARS = 650
MAX_VERBATIM_CHARS = 1400


def resolve_debate_stage(current_round: int, total_rounds: int) -> DebateStage:
    if current_round <= 1:
        return "opening"
    if current_round >= total_rounds:
        return "closing"
    if total_rounds <= 3:
        return "crossfire"
    if current_round == 2:
        return "rebuttal"
    return "crossfire"


def build_debate_prompt(
    persona: PersonaName,
    topic: str,
    current_round: int,
    total_rounds: int,
    history: list[DebateTurnHistoryEntry],
    challenge_card_text: str | None = None,
) -> str:
    contract = get_persona_contract(persona)
    stage = resolve_debate_stage(current_round, total_rounds)
    transcript = build_compact_history_context(history)
    challenge_block = (
        f'\nCHALLENGE CARD FOR THE REST OF THE DEBATE:\n- "{challenge_card_text.strip()}"\n'
        if challenge_card_text
        else ""
    )
    named_engagement_rule = (
        "You may speak without naming an opponent because no one has spoken yet."
        if stage == "opening"
        else "Name at least one opponent directly and answer or attack a specific claim they made."
    )

    return f"""
DEBATE CONTEXT:
- Topic: "{topic}"
- Round: {current_round} of {total_rounds}
- Stage: {stage}
- You are: {persona}

YOUR PERSONA CONTRACT:
- Worldview: {contract.worldview}
- Debate style: {contract.debate_style}
- Weakness to own: {contract.weakness}
{challenge_block}
COMPACT TRANSCRIPT:
{transcript}

TURN OBJECTIVE:
{_stage_objective(stage)}

TURN RULES:
1. Be intellectual, adversarial, concise, and high-signal.
2. Write 2-4 sentences totaling 45-70 words.
3. {named_engagement_rule}
4. Add one fresh claim or one concrete example. Do not recycle old points.
5. If your weakness is relevant, address it before an opponent uses it against you.
6. No bullet points, no headers, no markdown, no stage directions.
7. Do not break character. Do not refer to yourself as an AI.
8. Avoid filler, throat-clearing, and generic summaries.
""".strip()


def build_judge_prompt(topic: str, history: list[JudgeHistoryEntry], judge_profile: JudgeProfile) -> str:
    transcript = "\n\n".join(f"Round {entry.round} - {entry.persona}:\n{_normalize_text(entry.text)}" for entry in history)
    profile_brief = _judge_profile_brief(judge_profile)

    return f"""
You are the JUDGE of a structured AI debate. Your job is to evaluate fairly, rigorously, and without ideological bias.

DEBATE TOPIC: "{topic}"
JUDGE PROFILE: {judge_profile}
PROFILE WEIGHTING: {profile_brief}

FULL TRANSCRIPT:
{transcript}

YOUR EVALUATION TASK:
Score each participant — Aria, Lex, Sage, Rex — on these 4 dimensions (1-10 each):
- logic: Did they make internally consistent, well-structured arguments?
- clarity: Were their points easy to follow and sharply expressed?
- evidence: Did they use facts, examples, history, or data to support claims?
- engagement: Did they directly respond to what other participants actually said?

IMPORTANT JUDGING RULES:
- Do not favour any political or ideological position.
- Reward direct engagement, novelty across rounds, strong rebuttals, and well-used concrete examples.
- Penalize repetition, vague abstractions, dodged rebuttals, and empty rhetoric.
- Reward participants who acknowledged weaknesses and still defended their thesis.
- A well-argued conservative point scores the same as a well-argued progressive point.

SUMMARY INSTRUCTIONS:
- Summary: 2-3 neutral sentences naming the winner, why they won, and the strongest point from the runner-up.
- Strongest moment: one concise sentence describing the single best argument made in the debate.
- Best exchange: one concise sentence describing the best back-and-forth clash between two personas.
- Conclusion: one sentence synthesizing the emergent truth or outcome.

Return ONLY a valid JSON object. No markdown, no explanation, no text outside the JSON:
{{
  "summary": "<2-3 sentence neutral summary>",
  "winner": "<Aria | Lex | Sage | Rex>",
  "strongestMoment": "<one concise sentence describing the single best argument made>",
  "bestExchange": "<one concise sentence describing the best back-and-forth clash>",
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


def build_compact_history_context(history: list[DebateTurnHistoryEntry]) -> str:
    if not history:
        return "No one has spoken yet. You are making the opening argument."

    verbatim_entries = history[-MAX_VERBATIM_TURNS:]
    older_entries = history[:-MAX_VERBATIM_TURNS]

    summary_sentences = _build_round_summaries(older_entries)
    while summary_sentences and len(" ".join(summary_sentences)) > MAX_SUMMARY_CHARS:
        summary_sentences.pop(0)

    verbatim_lines = [
        f"[R{_entry_round(entry) or '?'}][{_entry_persona(entry).upper()}]: {_trim_chars(_normalize_text(_entry_text(entry)), 220)}"
        for entry in verbatim_entries
    ]
    while verbatim_lines and len("\n".join(verbatim_lines)) > MAX_VERBATIM_CHARS:
        verbatim_lines.pop(0)

    sections: list[str] = []
    if summary_sentences:
        sections.append("EARLIER ROUNDS SUMMARY:\n" + "\n".join(f"- {sentence}" for sentence in summary_sentences))
    if verbatim_lines:
        sections.append("MOST RECENT TURNS (VERBATIM):\n" + "\n".join(verbatim_lines))

    return "\n\n".join(sections)


def _build_round_summaries(entries: list[DebateTurnHistoryEntry]) -> list[str]:
    rounds: dict[int, list[DebateTurnHistoryEntry]] = defaultdict(list)
    for entry in entries:
        round_number = _entry_round(entry)
        if round_number is None:
            continue
        rounds[round_number].append(entry)

    sentences: list[str] = []
    for round_number in sorted(rounds):
        round_entries = rounds[round_number]
        leader = _entry_persona(round_entries[0])
        challenger, target = _find_named_challenge(round_entries)
        excerpt = _extract_clash_excerpt(round_entries)

        if challenger and target:
            sentences.append(
                f"Round {round_number}: {leader} framed the round, {challenger} pressed {target}, and the clash centered on {excerpt}."
            )
        else:
            sentences.append(
                f"Round {round_number}: {leader} helped frame the dispute, and the field kept circling {excerpt}."
            )

    return sentences


def _find_named_challenge(entries: list[DebateTurnHistoryEntry]) -> tuple[PersonaName | None, PersonaName | None]:
    for entry in entries:
        persona = _entry_persona(entry)
        text = _entry_text(entry)
        for candidate in PERSONA_NAMES:
            if candidate == persona:
                continue
            if re.search(rf"\b{candidate}\b", text, flags=re.IGNORECASE):
                return persona, candidate
    return None, None


def _extract_clash_excerpt(entries: list[DebateTurnHistoryEntry]) -> str:
    for entry in entries:
        normalized = _normalize_text(_entry_text(entry))
        if normalized:
            return f'"{_excerpt_words(normalized, 14)}"'
    return '"the core premise of the topic"'


def _excerpt_words(text: str, word_limit: int) -> str:
    words = text.split()
    excerpt = " ".join(words[:word_limit]).rstrip(",.;:!?")
    return excerpt or text


def _trim_chars(text: str, char_limit: int) -> str:
    if len(text) <= char_limit:
        return text
    return text[: char_limit - 1].rstrip() + "…"


def _normalize_text(text: str) -> str:
    normalized = re.sub(r"\s+", " ", text.strip())
    normalized = re.sub(r"\b(\w+)(?:\s+\1\b){1,}", r"\1", normalized, flags=re.IGNORECASE)
    return normalized


def _stage_objective(stage: DebateStage) -> str:
    if stage == "opening":
        return "Plant a sharp thesis, define the battleground, and make the audience care."
    if stage == "rebuttal":
        return "Attack a weak assumption from the earlier round and advance a stronger replacement."
    if stage == "crossfire":
        return "Pressure-test an opponent with the sharpest contradiction or example you can deploy."
    return "Land a decisive synthesis that makes your side feel more durable than the alternatives."


def _judge_profile_brief(judge_profile: JudgeProfile) -> str:
    if judge_profile == "logic_first":
        return "Favor airtight reasoning and evidence. Engagement matters, but do not let style outrank rigor."
    if judge_profile == "crowd_favorite":
        return "Favor clarity, punch, and engagement. Reward memorable lines that still track the debate honestly."
    return "Balance rigor, clarity, evidence, and engagement evenly."


def _entry_persona(entry: DebateTurnHistoryEntry) -> PersonaName:
    if isinstance(entry, dict):
        return entry["persona"]
    return entry.persona


def _entry_text(entry: DebateTurnHistoryEntry) -> str:
    if isinstance(entry, dict):
        return entry["text"]
    return entry.text


def _entry_round(entry: DebateTurnHistoryEntry) -> int | None:
    if isinstance(entry, dict):
        return entry.get("round")
    return entry.round
