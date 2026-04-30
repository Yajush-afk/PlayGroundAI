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


def build_participant_prompt(game_type: GameType, persona: PersonaName, prompt: str) -> str:
    contract = get_league_persona(persona)
    if game_type == "debate":
        task = (
            f'Debate topic: "{prompt}". Make one memorable argument in 80-120 words. '
            f"Your instinct: {contract.debate_instinct}"
        )
    elif game_type == "joke":
        task = (
            f'Joke prompt: "{prompt}". Write exactly one original one-line joke under 30 words. '
            f"Your instinct: {contract.joke_instinct}"
        )
    else:
        task = (
            f'Scenario mission: "{prompt}". Give a practical 2-3 line plan under 75 words. '
            f"Your instinct: {contract.scenario_instinct}"
        )

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


def build_league_judge_prompt(game_type: GameType, prompt: str, entries: list[LeagueGeneratedEntry]) -> str:
    transcript = "\n\n".join(f"{entry.persona}: {entry.text}" for entry in entries)
    if game_type == "debate":
        dimensions = "logic, clarity, personality, punch"
        game_rules = "Reward the strongest argument, cleanest reasoning, persona flavor, and memorable phrasing."
    elif game_type == "joke":
        dimensions = "humor, originality, promptFit, personaFlavor"
        game_rules = "Reward the funniest one-liner, originality, fit to the prompt, and recognizable persona voice. Include votes; no persona may vote for themself."
    else:
        dimensions = "practicality, creativity, constraintHandling, clarity"
        game_rules = "Reward the plan that best handles the mission constraints while staying useful, creative, and easy to understand."

    evaluation_blocks = ",\n    ".join(
        f'{{"persona": "{persona}", "scores": {{}}, "totalScore": 0, "rank": 0, "pointsAwarded": 0, "bonusPoints": 0, "standoutMove": ""}}'
        for persona in PERSONA_ORDER
    )

    return f"""
You are Justice Nyay, the official judge of PlayGroundAI.

GAME TYPE: {game_type}
PROMPT: "{prompt}"
SCORING DIMENSIONS: {dimensions}
JUDGING RULES: {game_rules}

ENTRIES:
{transcript}

Return ONLY valid JSON matching this shape. Scores are 1-10. totalScore is the sum of the listed dimensions.
Rank every persona 1 through 4 with no ties. winner must be the rank 1 persona.
Award points using this league rule: rank 1 gets 10, rank 2 gets 6, rank 3 gets 3, rank 4 gets 1. Add 2 bonusPoints to the single best moment.

{{
  "summary": "<short neutral summary of who won and why>",
  "winner": "<Aria | Lex | Sage | Rex>",
  "bestMoment": "<one sentence naming the best specific moment>",
  "votes": [],
  "evaluations": [
    {evaluation_blocks}
  ]
}}

For joke battles, fill votes as:
[
  {{"voter": "Aria", "votedFor": "<Lex | Sage | Rex>", "reason": "<short reason>"}}
]
For non-joke games, votes must be [].
""".strip()
