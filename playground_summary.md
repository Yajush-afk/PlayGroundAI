# PlayGroundAI — Project Summary

## What It Is

PlayGroundAI is a **real-time AI battle arena** where distinct AI personas — each powered by a different LLM — debate, argue, and are judged on any topic you throw at them. Think of it as part entertainment, part philosophical experiment, part stress-test for AI reasoning.

The core thesis: **What if different LLM "personalities" could fight ideas in a structured arena, and a neutral AI judge evaluated them fairly?**

---

## Project Context & Prompt Philosophy

The project is built around the idea that **prompts are characters.** Each persona is not just a system instruction — it is a *persona contract* with:

- A defined **worldview** (not just a political label)
- A **debate style** (how they address opponents, how they build arguments)
- A **known weakness** they are explicitly told to own and pre-empt

### The 4 Personas

| Persona | Model | Worldview | Signature Move |
|---|---|---|---|
| **Aria** | `llama-3.3-70b-versatile` | Progressive — systems shape outcomes | Names opponents; leans into lived human experience |
| **Lex** | `llama-3.1-8b-instant` | Libertarian — individual liberty is non-negotiable | Cold, data-led; dismantles logic by name |
| **Sage** | `llama-3.1-8b-instant` | Neutral philosopher — follows truth anywhere | Asks rhetorical questions; exposes contradictions in all sides |
| **Rex** | `llama-3.1-8b-instant` | Traditionalist — stability and proven systems matter | Asserts conviction; uses historical failure cases |

The debate prompt is meticulously constructed each turn:
- Provides full context: topic, round number, total rounds
- Feeds the complete conversation history in character-labeled format
- Gives **numbered behavioral instructions**: don't repeat, name opponents when challenging, steer toward conclusion past the halfway mark
- Caps output at 200 words and bans markdown/bullet points — *natural speech only*

### The Judge (Justice Nyay)

The Judge runs entirely on **Gemini 2.5 Flash** (`gemini-2.5-flash`), not Groq. The judge prompt:
- Enforces **ideological neutrality** explicitly ("a well-argued conservative point scores the same as a progressive one")
- Evaluates on 4 dimensions: **Logic, Clarity, Evidence, Engagement**
- Scores engagement harshly if a persona ignored others and just repeated themselves
- Returns structured JSON with: `summary`, `winner`, `strongestMoment`, `conclusion`, and per-persona `evaluations` with `standoutMove`, `rank`, and `totalScore`

---

## Current Implementation

### Tech Stack
| Layer | Technology |
|---|---|
| Framework | Next.js (App Router, Edge Runtime) |
| Styling | Tailwind CSS v4 |
| Debate API | Groq (streaming SSE) |
| Judge API | Google Gemini 2.5 Flash |
| Database | Supabase (optional — gracefully skipped if no keys) |
| Hosting | localhost (runs via `npm run dev`) |

### Features Live Today

**Debate Arena (`/debates`)**
- User enters a topic and number of rounds
- 2×2 chat-room grid — each persona gets their own persistent text box
- Round-by-round pagination with `< Round X/Y >` selectors
- Each LLM streams its response in real-time token-by-token via SSE
- Buffered SSE decoder handles partial JSON chunks cleanly

**Rate Limit Resilience**
- Auto-detects Groq `429 Rate Limit` responses
- Silent 3-attempt backoff loop: 12s → 20s → 30s
- Spinner stays on, debate resumes automatically — no crash

**Judging System**
- After the final round, a gold **JUDGE! button** with Justice Nyay's avatar appears
- Clicking it sends the full transcript to Gemini for evaluation
- Results page shows:
  - Final Verdict (4-5 sentence summary)
  - Strongest Moment of the full debate
  - Conclusion (1-2 sentence emergent truth from the discussion)
  - Overall Winner with avatar + color scheme
  - Per-persona score carousel: Logic/Clarity/Evidence/Engagement + Standout Move + Total Score (/40) + Rank

**UI Polish**
- No global scroll — all containers are fixed viewport height
- Scroll only exists *inside* individual chat boxes
- Dark glassmorphism aesthetic with persona-specific color rings
- Animated avatars for each persona

---

## Known Current Constraints

- **Groq free-tier TPM limits**: `llama-3.3-70b-versatile` = 12K TPM, `llama-3.1-8b-instant` = 6K TPM. High-intensity 3+ round debates can hit limits, causing silent retry delays.
- **Only 2 stable Groq text models** as of now: `llama-3.3-70b-versatile` and `llama-3.1-8b-instant`. All other models (Mixtral, Gemma2, Qwen, llama3-70b-8192) have been deprecated.
- **Supabase optional** — the app runs fully without it; debate history is not persisted unless configured.
- **Demo Mode** exists for UI testing without API keys.

---

## Future Scope

### Near-Term (Next Sprint)
- **View Debates** — Browse saved debate transcripts from Supabase with round-by-round replay
- **"Coming Soon" modes**: Joke Battle, Story Simulation (multi-turn collaborative fiction)
- **Per-persona model selector** — let users swap models before firing
- **Share Verdict** — generate a shareable card/image of the winner + conclusion

### Mid-Term
- **Custom Personas** — users define their own persona, worldview, and debate style; they drop into the arena as a 5th voice
- **Global Leaderboard** — track which personas win most debates across all topics, displayed as a live ranking
- **Topic Suggestions Engine** — AI-generated trending/controversial debate topics
- **Replay Mode** — watch a saved debate stream back round-by-round, token-by-token

### Long-Term / Full Vision

> **PlayGroundAI as an AI Reasoning Observatory**

The full-fledged version is not just an entertainment app — it is a **structured environment for observing how different AI reasoning architectures approach truth**.

Key pillars of the expanded vision:

1. **Model Benchmarking Through Debate** — Run the same topic through 10+ model configurations and let the Judge rank them systematically. Research-grade output disguised as a game.

2. **Argument Graph** — Visualize the debate as a DAG (directed argument graph): every counter-argument links back to the claim it refutes, showing where reasoning chains broke down.

3. **Human-in-the-Loop Mode** — A live user can jump in as one of the voices mid-debate and argue alongside the LLMs.

4. **Multi-Judge Panel** — Instead of one judge, run 3 simultaneous judge evaluations using different models (Gemini, Claude, GPT-4o) and show divergence in their verdicts — exposing model bias directly.

5. **Classroom Mode** — Teachers define a topic and a debate structure. Students watch the AI debate, then rate each argument themselves before seeing Justice Nyay's verdict — a tool for critical thinking education.

6. **API / Embed** — Expose the debate engine as an embeddable widget or API so developers can drop a live AI debate into any website.

---

## One-Line Pitch

> *"PlayGroundAI is the arena where AI personas stop agreeing with you and start fighting each other — and a neutral AI judge decides who actually won."*
