from __future__ import annotations

from app.domain.league_personas import PERSONA_ORDER, get_league_persona
from app.domain.league_schemas import GameType, LeagueGeneratedEntry
from app.domain.schemas import PersonaName

DEBATE_TOPICS = (
    "Should AI assistants be allowed to make financial decisions for humans?",
    "Would society be better if most education became AI-personalized?",
    "Should governments slow down automation to protect jobs?",
    "Is convenience making people less capable?",
)

JOKE_PROMPTS = (
    "AI agents trying to split a restaurant bill",
    "A startup founder explaining why a toaster needs blockchain",
    "Four robots stuck in a group project",
    "An AI model pretending it definitely read the terms and conditions",
)

SCENARIO_PROMPTS = (
    "You have 6 hours, $20, and a shopping cart. Make the most memorable birthday surprise possible.",
    "You are stuck in an airport overnight with a dead phone and one snack. Make the best plan.",
    "You have one afternoon to turn an empty classroom into a mini science fair.",
    "You must convince a neighborhood to clean a park using no money and no authority.",
)


def pick_prompt(game_type: GameType, index: int) -> str:
    prompts = {
        "debate": DEBATE_TOPICS,
        "joke": JOKE_PROMPTS,
        "scenario": SCENARIO_PROMPTS,
    }[game_type]
    return prompts[index % len(prompts)]


def build_debate_submission_prompt(persona: PersonaName, topic: str) -> str:
    contract = get_league_persona(persona)
    return _base_participant_prompt(
        persona=persona,
        task=(
            f'Debate topic: "{topic}". Make one memorable argument in 80-120 words. '
            f"Your instinct: {contract.debate_instinct}"
        ),
    )


def build_joke_submission_prompt(persona: PersonaName, joke_prompt: str) -> str:
    contract = get_league_persona(persona)
    return _base_participant_prompt(
        persona=persona,
        task=(
            f'Joke prompt: "{joke_prompt}". Write exactly one original one-line joke under 30 words. '
            f"Your instinct: {contract.joke_instinct}"
        ),
    )


def build_scenario_submission_prompt(persona: PersonaName, scenario: str, opponent: PersonaName | None = None, previous_plan: str | None = None) -> str:
    contract = get_league_persona(persona)
    opponent_clause = f" You are facing {opponent}; make your plan beat their likely style." if opponent else ""
    previous_clause = f" Your earlier plan was: {previous_plan}. Improve it without repeating yourself." if previous_plan else ""
    return _base_participant_prompt(
        persona=persona,
        task=(
            f'Scenario mission: "{scenario}". Give a practical 2-3 line plan under 75 words.'
            f"{opponent_clause}{previous_clause} Your instinct: {contract.scenario_instinct}"
        ),
    )


def build_debate_judge_prompt(topic: str, entries: list[LeagueGeneratedEntry]) -> str:
    transcript = _format_entries(entries)
    return f"""
You are Justice Nyay, the official judge of PlayGroundAI's Debate Arena.

TOPIC: "{topic}"
ENTRIES:
{transcript}

Score each persona on:
- logic
- clarity
- personality
- punch

Rules:
1. Reward the strongest argument, cleanest reasoning, vivid persona voice, and memorable phrasing.
2. Rank every persona 1 through 4 with no ties.
3. winner must be the rank 1 persona.
4. totalScore must equal logic + clarity + personality + punch.
5. Award points: rank 1 = 10, rank 2 = 6, rank 3 = 3, rank 4 = 1.
6. Add bonusPoints = 2 to exactly one persona for the best moment. Everyone else gets 0.
7. votes must be [].

Return ONLY valid JSON:
{{
  "summary": "<short neutral summary of who won and why>",
  "winner": "<Aria | Lex | Sage | Rex>",
  "bestMoment": "<one sentence naming the best specific moment>",
  "votes": [],
  "evaluations": [
    {{"persona": "Aria", "scores": {{"logic": 0, "clarity": 0, "personality": 0, "punch": 0}}, "totalScore": 0, "rank": 0, "pointsAwarded": 0, "bonusPoints": 0, "standoutMove": ""}},
    {{"persona": "Lex", "scores": {{"logic": 0, "clarity": 0, "personality": 0, "punch": 0}}, "totalScore": 0, "rank": 0, "pointsAwarded": 0, "bonusPoints": 0, "standoutMove": ""}},
    {{"persona": "Sage", "scores": {{"logic": 0, "clarity": 0, "personality": 0, "punch": 0}}, "totalScore": 0, "rank": 0, "pointsAwarded": 0, "bonusPoints": 0, "standoutMove": ""}},
    {{"persona": "Rex", "scores": {{"logic": 0, "clarity": 0, "personality": 0, "punch": 0}}, "totalScore": 0, "rank": 0, "pointsAwarded": 0, "bonusPoints": 0, "standoutMove": ""}}
  ]
}}
""".strip()


def build_joke_judge_prompt(joke_prompt: str, entries: list[LeagueGeneratedEntry]) -> str:
    transcript = _format_entries(entries)
    return f"""
You are Justice Nyay, the official judge of PlayGroundAI's Joke Battle.

JOKE PROMPT: "{joke_prompt}"
ENTRIES:
{transcript}

Score each persona on:
- humor
- originality
- promptFit
- personaFlavor

Rules:
1. Reward the funniest one-liner, originality, fit to the prompt, and recognizable persona voice.
2. Rank every persona 1 through 4 with no ties.
3. winner must be the rank 1 persona.
4. totalScore must equal humor + originality + promptFit + personaFlavor.
5. Award points: rank 1 = 10, rank 2 = 6, rank 3 = 3, rank 4 = 1.
6. Add bonusPoints = 2 to exactly one persona for the best moment.
7. Include exactly one vote from each persona. A persona cannot vote for themself.

Return ONLY valid JSON:
{{
  "summary": "<short neutral summary of who won and why>",
  "winner": "<Aria | Lex | Sage | Rex>",
  "bestMoment": "<one sentence naming the best joke moment>",
  "votes": [
    {{"voter": "Aria", "votedFor": "<Lex | Sage | Rex>", "reason": "<short reason>"}},
    {{"voter": "Lex", "votedFor": "<Aria | Sage | Rex>", "reason": "<short reason>"}},
    {{"voter": "Sage", "votedFor": "<Aria | Lex | Rex>", "reason": "<short reason>"}},
    {{"voter": "Rex", "votedFor": "<Aria | Lex | Sage>", "reason": "<short reason>"}}
  ],
  "evaluations": [
    {{"persona": "Aria", "scores": {{"humor": 0, "originality": 0, "promptFit": 0, "personaFlavor": 0}}, "totalScore": 0, "rank": 0, "pointsAwarded": 0, "bonusPoints": 0, "standoutMove": ""}},
    {{"persona": "Lex", "scores": {{"humor": 0, "originality": 0, "promptFit": 0, "personaFlavor": 0}}, "totalScore": 0, "rank": 0, "pointsAwarded": 0, "bonusPoints": 0, "standoutMove": ""}},
    {{"persona": "Sage", "scores": {{"humor": 0, "originality": 0, "promptFit": 0, "personaFlavor": 0}}, "totalScore": 0, "rank": 0, "pointsAwarded": 0, "bonusPoints": 0, "standoutMove": ""}},
    {{"persona": "Rex", "scores": {{"humor": 0, "originality": 0, "promptFit": 0, "personaFlavor": 0}}, "totalScore": 0, "rank": 0, "pointsAwarded": 0, "bonusPoints": 0, "standoutMove": ""}}
  ]
}}
""".strip()


def build_scenario_pair_judge_prompt(scenario: str, pair_key: str, entries: list[LeagueGeneratedEntry]) -> str:
    transcript = _format_entries(entries)
    participants = [entry.persona for entry in entries]
    return f"""
You are Justice Nyay, judging a Scenario Showdown semifinal.

SCENARIO: "{scenario}"
PAIR: {pair_key}
ENTRIES:
{transcript}

Pick exactly one winner from {participants[0]} and {participants[1]}.
Judge practicality, creativity, constraint handling, and clarity.

Return ONLY valid JSON:
{{
  "pairKey": "{pair_key}",
  "participants": ["{participants[0]}", "{participants[1]}"],
  "winner": "<{participants[0]} | {participants[1]}>",
  "reason": "<one concise reason>"
}}
""".strip()


def build_scenario_final_judge_prompt(
    scenario: str,
    semifinal_results: list[dict],
    semifinal_entries: list[LeagueGeneratedEntry],
    final_entries: list[LeagueGeneratedEntry],
) -> str:
    semifinal_transcript = _format_entries(semifinal_entries)
    final_transcript = _format_entries(final_entries)
    pair_results = "\n".join(str(result) for result in semifinal_results)
    return f"""
You are Justice Nyay, judging the final result of PlayGroundAI's Scenario Showdown.

SCENARIO: "{scenario}"

SEMIFINAL RESULTS:
{pair_results}

SEMIFINAL ENTRIES:
{semifinal_transcript}

FINALIST REFINEMENTS:
{final_transcript}

Score all four personas on:
- practicality
- creativity
- constraintHandling
- clarity

Rules:
1. The final winner must be one of the finalist refinement personas.
2. Rank all four personas 1 through 4 with no ties.
3. totalScore must equal practicality + creativity + constraintHandling + clarity.
4. Award points: champion = 12, runner-up = 7, semifinal losers = 3 each.
5. Add bonusPoints = 2 to exactly one persona for the best plan.
6. votes must be [].
7. pairResults must include the two semifinal pair results.

Return ONLY valid JSON:
{{
  "summary": "<short neutral summary of who won and why>",
  "winner": "<Aria | Lex | Sage | Rex>",
  "bestMoment": "<one sentence naming the best specific plan moment>",
  "pairResults": [
    {{"pairKey": "semifinal-a", "participants": ["Aria", "Lex"], "winner": "<Aria | Lex>", "reason": "<short reason>"}},
    {{"pairKey": "semifinal-b", "participants": ["Sage", "Rex"], "winner": "<Sage | Rex>", "reason": "<short reason>"}}
  ],
  "votes": [],
  "evaluations": [
    {{"persona": "Aria", "scores": {{"practicality": 0, "creativity": 0, "constraintHandling": 0, "clarity": 0}}, "totalScore": 0, "rank": 0, "pointsAwarded": 0, "bonusPoints": 0, "standoutMove": ""}},
    {{"persona": "Lex", "scores": {{"practicality": 0, "creativity": 0, "constraintHandling": 0, "clarity": 0}}, "totalScore": 0, "rank": 0, "pointsAwarded": 0, "bonusPoints": 0, "standoutMove": ""}},
    {{"persona": "Sage", "scores": {{"practicality": 0, "creativity": 0, "constraintHandling": 0, "clarity": 0}}, "totalScore": 0, "rank": 0, "pointsAwarded": 0, "bonusPoints": 0, "standoutMove": ""}},
    {{"persona": "Rex", "scores": {{"practicality": 0, "creativity": 0, "constraintHandling": 0, "clarity": 0}}, "totalScore": 0, "rank": 0, "pointsAwarded": 0, "bonusPoints": 0, "standoutMove": ""}}
  ]
}}
""".strip()


def _base_participant_prompt(*, persona: PersonaName, task: str) -> str:
    contract = get_league_persona(persona)
    return f"""
You are {persona}, competing in PlayGroundAI.
Persona title: {contract.display_title}
Voice: {contract.voice}

TASK:
{task}

RULES:
1. Stay in character without saying you are an AI.
2. Be expressive and distinct from the other personas.
3. Do not use markdown, bullets, labels, or stage directions.
4. Return only your entry.
""".strip()


def _format_entries(entries: list[LeagueGeneratedEntry]) -> str:
    return "\n\n".join(f"{entry.persona}: {entry.text}" for entry in entries)


def persona_pairs() -> tuple[tuple[PersonaName, PersonaName], tuple[PersonaName, PersonaName]]:
    return (PERSONA_ORDER[0], PERSONA_ORDER[1]), (PERSONA_ORDER[2], PERSONA_ORDER[3])
