"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Flame, RotateCcw, Scale, Sparkles } from "lucide-react";
import { Persona, PERSONA_CONFIG } from "@/components/debates/PersonaCard";
import { JudgeResults, JudgeScores } from "@/components/debates/JudgeResults";
import { apiUrl } from "@/lib/api";
import { getOrCreateSessionId } from "@/lib/session";

type DebateStatus = "setup" | "debating" | "round_break" | "awaiting_judge" | "finished" | "results";
type TurnUiPhase = "idle" | "thinking" | "streaming" | "cooldown" | "retrying" | "error" | "done";
type DebateStage = "opening" | "rebuttal" | "crossfire" | "closing";
type AudienceVote = Persona | "Tie";
type JudgeProfile = "balanced" | "logic_first" | "crowd_favorite";

interface ResponseLog {
  persona: Persona;
  text: string;
  round: number;
}

interface DebateMetrics {
  debateCalls: number;
  retryCount: number;
  firstTokenLatencies: number[];
  turnDurations: number[];
  responseWordCounts: number[];
}

const PERSONA_ORDER: Persona[] = ["Aria", "Lex", "Sage", "Rex"];
const THINKING_LABELS: Record<DebateStage, string[]> = {
  opening: ["Thinking", "Setting the frame", "Loading first strike"],
  rebuttal: ["Preparing rebuttal", "Reviewing claims", "Sharpening counterpoint"],
  crossfire: ["Scanning contradictions", "Pressure-testing arguments", "Lining up a clash"],
  closing: ["Composing final blow", "Synthesizing the case", "Locking the conclusion"],
};
const JUDGE_PROFILE_COPY: Record<JudgeProfile, { label: string; description: string }> = {
  balanced: { label: "Balanced", description: "Even mix of rigor, evidence, clarity, and engagement." },
  logic_first: { label: "Logic First", description: "Rewards airtight reasoning and hard support." },
  crowd_favorite: { label: "Crowd Favorite", description: "Rewards punch, readability, and direct engagement." },
};

const PRESET_TOPICS: string[] = [
  "Should Universal Basic Income replace traditional welfare systems?",
  "Is rapid technological progress more important than cultural tradition?",
  "Should artificial intelligence be granted legal personhood rights?",
  "Does absolute free speech ultimately harm or protect democracy?",
];

const AVAILABLE_ROUND_OPTIONS = [3, 5, 7] as const;
const MAX_PUBLIC_ROUNDS = Number(process.env.NEXT_PUBLIC_MAX_DEBATE_ROUNDS ?? "3");
const ROUND_OPTIONS = AVAILABLE_ROUND_OPTIONS.filter((rounds) => rounds <= MAX_PUBLIC_ROUNDS) as Array<3 | 5 | 7>;
const DEFAULT_ROUNDS = ROUND_OPTIONS[0] ?? 3;
const LOCKED_ROUNDS_MESSAGE = `I am broke. We only have enough tokens for ${MAX_PUBLIC_ROUNDS} rounds right now.`;

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

function resolveStage(round: number, totalRounds: number): DebateStage {
  if (round <= 1) return "opening";
  if (round >= totalRounds) return "closing";
  if (totalRounds <= 3) return "crossfire";
  if (round === 2) return "rebuttal";
  return "crossfire";
}

function stageLabel(stage: DebateStage): string {
  switch (stage) {
    case "opening":
      return "Opening";
    case "rebuttal":
      return "Rebuttal";
    case "crossfire":
      return "Crossfire";
    case "closing":
      return "Closing";
  }
}

function pickThinkingLabel(stage: DebateStage, persona: Persona, round: number): string {
  const labels = THINKING_LABELS[stage];
  const personaOffset = PERSONA_ORDER.indexOf(persona);
  return labels[(round + Math.max(personaOffset, 0)) % labels.length];
}

function wordCount(text: string): number {
  const trimmed = text.trim();
  return trimmed ? trimmed.split(/\s+/).length : 0;
}

export default function DebatesPage() {
  const [topic, setTopic] = useState("");
  const [targetRounds, setTargetRounds] = useState<3 | 5 | 7>(DEFAULT_ROUNDS);
  const [status, setStatus] = useState<DebateStatus>("setup");
  const [isDemoMode, setIsDemoMode] = useState(false);
  const [currentDebateId, setCurrentDebateId] = useState<string | null>(null);

  const [currentRound, setCurrentRound] = useState(1);
  const [viewRound, setViewRound] = useState(1);
  const [activePersonaIdx, setActivePersonaIdx] = useState(0);
  const [history, setHistory] = useState<ResponseLog[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [hasTurnError, setHasTurnError] = useState(false);

  const [turnUiPhase, setTurnUiPhase] = useState<TurnUiPhase>("idle");
  const [turnPhaseLabel, setTurnPhaseLabel] = useState("");
  const [cooldownSeconds, setCooldownSeconds] = useState(0);
  const [currentStage, setCurrentStage] = useState<DebateStage>("opening");

  const [judgeStatus, setJudgeStatus] = useState<"idle" | "evaluating" | "done" | "error">("idle");
  const [judgeScores, setJudgeScores] = useState<JudgeScores | null>(null);
  const [judgeProfile, setJudgeProfile] = useState<JudgeProfile>("balanced");

  const [challengeDraft, setChallengeDraft] = useState("");
  const [activeChallengeCard, setActiveChallengeCard] = useState<string | null>(null);
  const [challengeRoundStart, setChallengeRoundStart] = useState<number | null>(null);
  const [hasUsedChallengeCard, setHasUsedChallengeCard] = useState(false);
  const [audienceVotes, setAudienceVotes] = useState<Record<number, AudienceVote>>({});

  const activeRunRef = useRef(0);
  const debateAbortRef = useRef<AbortController | null>(null);
  const judgeAbortRef = useRef<AbortController | null>(null);
  const metricsRef = useRef<DebateMetrics>({
    debateCalls: 0,
    retryCount: 0,
    firstTokenLatencies: [],
    turnDurations: [],
    responseWordCounts: [],
  });

  const activePersonaName = PERSONA_ORDER[activePersonaIdx];
  const isTurnLocked = status === "debating" && !hasTurnError;
  const completedRounds = history.reduce((maxRound, entry) => Math.max(maxRound, entry.round), 0);
  const activeChallengeForCurrentRound =
    activeChallengeCard && challengeRoundStart !== null && currentRound >= challengeRoundStart ? activeChallengeCard : null;

  const resetMetrics = () => {
    metricsRef.current = {
      debateCalls: 0,
      retryCount: 0,
      firstTokenLatencies: [],
      turnDurations: [],
      responseWordCounts: [],
    };
  };

  const logMetrics = (label: string) => {
    if (process.env.NODE_ENV === "production") {
      return;
    }

    const metrics = metricsRef.current;
    const average = (values: number[]) =>
      values.length === 0 ? 0 : Math.round(values.reduce((sum, value) => sum + value, 0) / values.length);

    console.info(`[Debate Arena Metrics] ${label}`, {
      debateCalls: metrics.debateCalls,
      retryCount: metrics.retryCount,
      avgFirstTokenMs: average(metrics.firstTokenLatencies),
      avgTurnDurationMs: average(metrics.turnDurations),
      avgResponseWords: average(metrics.responseWordCounts),
    });
  };

  const resetForNewRun = () => {
    setCurrentRound(1);
    setViewRound(1);
    setActivePersonaIdx(0);
    setHistory([]);
    setStreamingText("");
    setHasTurnError(false);
    setTurnUiPhase("idle");
    setTurnPhaseLabel("");
    setCooldownSeconds(0);
    setCurrentStage("opening");
    setJudgeStatus("idle");
    setJudgeScores(null);
    setChallengeDraft("");
    setActiveChallengeCard(null);
    setChallengeRoundStart(null);
    setHasUsedChallengeCard(false);
    setAudienceVotes({});
    resetMetrics();
  };

  const createDebateId = () => {
    if (typeof window === "undefined") {
      return `debate-${Date.now()}`;
    }

    return window.crypto.randomUUID();
  };

  const buildRequestHeaders = (debateId: string) => ({
    "Content-Type": "application/json",
    "X-Playground-Session-Id": getOrCreateSessionId(),
    "X-Playground-Debate-Id": debateId,
  });

  const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

  const abortInFlightRequests = () => {
    debateAbortRef.current?.abort();
    debateAbortRef.current = null;
    judgeAbortRef.current?.abort();
    judgeAbortRef.current = null;
  };

  const beginRun = () => {
    activeRunRef.current += 1;
    abortInFlightRequests();
    return activeRunRef.current;
  };

  const isRunCurrent = (runToken: number) => activeRunRef.current === runToken;

  const updateAudienceVote = (round: number, vote: AudienceVote) => {
    setAudienceVotes((currentVotes) => ({ ...currentVotes, [round]: vote }));
  };

  const applyChallengeCard = () => {
    const trimmed = challengeDraft.trim();
    if (!trimmed || hasUsedChallengeCard) {
      return;
    }

    setActiveChallengeCard(trimmed);
    setChallengeRoundStart(currentRound + 1);
    setHasUsedChallengeCard(true);
    setChallengeDraft("");
  };

  const continueDebate = () => {
    if (!currentDebateId) {
      return;
    }

    const runToken = activeRunRef.current;
    const nextRound = currentRound + 1;
    setStatus("debating");
    setCurrentRound(nextRound);
    setViewRound(nextRound);
    setActivePersonaIdx(0);
    void startNextTurn(nextRound, 0, history, currentDebateId, runToken);
  };

  useEffect(() => {
    return () => {
      activeRunRef.current += 1;
      abortInFlightRequests();
    };
  }, []);

  const waitWithCooldown = async (ms: number, runToken: number) => {
    const startedAt = Date.now();
    setTurnUiPhase("cooldown");
    setTurnPhaseLabel("Arena cooldown");

    while (isRunCurrent(runToken)) {
      const remainingMs = ms - (Date.now() - startedAt);
      if (remainingMs <= 0) {
        break;
      }

      setCooldownSeconds(Math.max(1, Math.ceil(remainingMs / 1000)));
      await sleep(Math.min(250, remainingMs));
    }

    setCooldownSeconds(0);
  };

  const handleStart = () => {
    if (!topic.trim()) return;
    const debateId = createDebateId();
    const runToken = beginRun();
    resetForNewRun();
    setCurrentDebateId(debateId);
    setStatus("debating");
    setCurrentStage(resolveStage(1, targetRounds));
    void startNextTurn(1, 0, [], debateId, runToken);
  };

  const handleRestart = () => {
    if (isTurnLocked) return;
    const debateId = createDebateId();
    const runToken = beginRun();
    resetForNewRun();
    setCurrentDebateId(debateId);
    setStatus("debating");
    setCurrentStage(resolveStage(1, targetRounds));
    void startNextTurn(1, 0, [], debateId, runToken);
  };

  const handleNewDebate = () => {
    beginRun();
    setTopic("");
    resetForNewRun();
    setTargetRounds(DEFAULT_ROUNDS);
    setCurrentDebateId(null);
    setStatus("setup");
  };

  const retryCurrentTurn = () => {
    const debateId = currentDebateId ?? createDebateId();
    const runToken = beginRun();
    setCurrentDebateId(debateId);
    setStatus("debating");
    void startNextTurn(currentRound, activePersonaIdx, history, debateId, runToken);
  };

  const startNextTurn = async (round: number, pIdx: number, currentHistory: ResponseLog[], debateId: string, runToken: number) => {
    if (!isRunCurrent(runToken)) {
      return;
    }

    const persona = PERSONA_ORDER[pIdx];
    const stage = resolveStage(round, targetRounds);
    const thinkingLabel = pickThinkingLabel(stage, persona, round);
    const challengeForTurn = activeChallengeCard && challengeRoundStart !== null && round >= challengeRoundStart ? activeChallengeCard : null;
    setCurrentRound(round);
    setActivePersonaIdx(pIdx);
    setCurrentStage(stage);
    setStreamingText("");
    setHasTurnError(false);
    setCooldownSeconds(0);
    setTurnUiPhase("thinking");
    setTurnPhaseLabel(thinkingLabel);

    if (isDemoMode) {
      const demoResponse = `${persona} enters ${stage} with a tighter, sharper argument on "${topic}". ${challengeForTurn ? `Challenge accepted: ${challengeForTurn}. ` : ""}${persona} names an opponent, makes one concrete point, and keeps the turn brisk instead of bloated.`;

      await sleep(450);
      if (!isRunCurrent(runToken)) {
        return;
      }

      setTurnUiPhase("streaming");
      setTurnPhaseLabel(`${stageLabel(stage)} in motion`);

      let currentText = "";
      const turnStartedAt = performance.now();
      for (let i = 1; i <= demoResponse.length; i += 4) {
        if (!isRunCurrent(runToken)) {
          return;
        }

        currentText = demoResponse.slice(0, i);
        setStreamingText(currentText);
        await sleep(24);
      }

      metricsRef.current.firstTokenLatencies.push(450);
      metricsRef.current.turnDurations.push(Math.round(performance.now() - turnStartedAt));
      metricsRef.current.responseWordCounts.push(wordCount(demoResponse));

      if (!isRunCurrent(runToken)) {
        return;
      }

      const newHistory = [...currentHistory, { persona, text: demoResponse, round }];
      setHistory(newHistory);
      setStreamingText("");
      setTurnUiPhase("done");
      setTurnPhaseLabel(`${stageLabel(stage)} complete`);

      const nextIdx = pIdx + 1;
      if (nextIdx < PERSONA_ORDER.length) {
        setActivePersonaIdx(nextIdx);
        void startNextTurn(round, nextIdx, newHistory, debateId, runToken);
        return;
      }

      if (round < targetRounds) {
        setStatus("round_break");
        setViewRound(round);
        setTurnUiPhase("idle");
        setTurnPhaseLabel("");
        return;
      }

      logMetrics("Debate complete");
      setStatus("awaiting_judge");
      setTurnUiPhase("idle");
      setTurnPhaseLabel("");
      return;
    }

    const controller = new AbortController();
    debateAbortRef.current = controller;

    try {
      const turnStartedAt = performance.now();
      let firstTokenAt: number | null = null;

      const sendTurnRequest = async () => {
        metricsRef.current.debateCalls += 1;
        return fetch(apiUrl("/api/debate"), {
          method: "POST",
          headers: buildRequestHeaders(debateId),
          body: JSON.stringify({
            topic,
            persona,
            currentRound: round,
            totalRounds: targetRounds,
            history: currentHistory,
            challengeCardText: challengeForTurn,
          }),
          signal: controller.signal,
        });
      };

      let res = await sendTurnRequest();

      const BACKOFF_MS = [12000, 20000, 30000];
      for (let attempt = 0; attempt < BACKOFF_MS.length && res.status === 429; attempt++) {
        metricsRef.current.retryCount += 1;
        await waitWithCooldown(BACKOFF_MS[attempt], runToken);
        if (!isRunCurrent(runToken)) {
          return;
        }

        setTurnUiPhase("retrying");
        setTurnPhaseLabel("Retrying turn");
        res = await sendTurnRequest();
      }

      if (!res.ok) {
        throw new Error(await res.text());
      }

      if (!res.body) {
        throw new Error("No response body");
      }

      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullResponse = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        if (!isRunCurrent(runToken)) {
          await reader.cancel();
          return;
        }

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.trim() || !line.startsWith("data: ")) continue;

          const dataStr = line.slice(6).trim();
          if (dataStr === "[DONE]") continue;

          try {
            const data = JSON.parse(dataStr);
            if (data.choices?.[0]?.delta?.content) {
              fullResponse += data.choices[0].delta.content;
              if (firstTokenAt === null) {
                firstTokenAt = performance.now();
                metricsRef.current.firstTokenLatencies.push(Math.round(firstTokenAt - turnStartedAt));
                setTurnUiPhase("streaming");
                setTurnPhaseLabel(`${stageLabel(stage)} in motion`);
              }
              if (isRunCurrent(runToken)) {
                setStreamingText(fullResponse);
              }
            }
          } catch (error) {
            console.error("Stream parse error:", error, line);
          }
        }
      }

      if (!isRunCurrent(runToken)) {
        return;
      }

      metricsRef.current.turnDurations.push(Math.round(performance.now() - turnStartedAt));
      metricsRef.current.responseWordCounts.push(wordCount(fullResponse));

      const newHistory = [...currentHistory, { persona, text: fullResponse, round }];
      setHistory(newHistory);
      setStreamingText("");
      setTurnUiPhase("done");
      setTurnPhaseLabel(`${stageLabel(stage)} complete`);

      const nextIdx = pIdx + 1;
      if (nextIdx < PERSONA_ORDER.length) {
        setActivePersonaIdx(nextIdx);
        void startNextTurn(round, nextIdx, newHistory, debateId, runToken);
        return;
      }

      if (round < targetRounds) {
        setStatus("round_break");
        setViewRound(round);
        setTurnUiPhase("idle");
        setTurnPhaseLabel("");
        return;
      }

      logMetrics("Debate complete");
      setStatus("awaiting_judge");
      setTurnUiPhase("idle");
      setTurnPhaseLabel("");
    } catch (error) {
      if (controller.signal.aborted || !isRunCurrent(runToken)) {
        return;
      }

      console.error(error);
      setStreamingText("");
      setHasTurnError(true);
      setTurnUiPhase("error");
      setTurnPhaseLabel("Turn failed");
    } finally {
      if (debateAbortRef.current === controller) {
        debateAbortRef.current = null;
      }
    }
  };

  const runJudgeModel = async (fullHistory: ResponseLog[], runToken: number) => {
    if (!isRunCurrent(runToken)) {
      return;
    }

    judgeAbortRef.current?.abort();
    const controller = new AbortController();
    judgeAbortRef.current = controller;
    setJudgeStatus("evaluating");
    setStatus("results");

    if (isDemoMode) {
      await sleep(1400);
      if (!isRunCurrent(runToken)) {
        return;
      }

      setJudgeScores({
        summary:
          "Justice Nyay judged this run as high-engagement and unusually disciplined for a fast debate. Sage won by integrating the sharpest objections instead of dodging them, while Lex produced the cleanest single counterpunch.",
        winner: "Sage",
        strongestMoment:
          "Sage exposed the hidden assumption both camps were protecting and forced the room to argue on deeper terrain.",
        bestExchange:
          "Lex and Sage delivered the best exchange by turning a disagreement about incentives into a direct fight over what counts as evidence.",
        conclusion:
          "The collective debate reveals that persuasive systems thinking only holds when it survives adversarial testing and concrete tradeoffs.",
        evaluations: [
          {
            persona: "Aria",
            rank: 2,
            scores: { logic: 8, clarity: 9, evidence: 8, engagement: 9 },
            totalScore: 34,
            standoutMove: "Forced the debate back toward who absorbs the human cost when elegant theories fail.",
          },
          {
            persona: "Lex",
            rank: 3,
            scores: { logic: 9, clarity: 8, evidence: 9, engagement: 7 },
            totalScore: 33,
            standoutMove: "Pressed every moral claim to justify itself with incentives and measurable consequences.",
          },
          {
            persona: "Sage",
            rank: 1,
            scores: { logic: 10, clarity: 9, evidence: 8, engagement: 10 },
            totalScore: 37,
            standoutMove: "Reframed the dispute so both sides had to answer a contradiction they had been avoiding.",
          },
          {
            persona: "Rex",
            rank: 4,
            scores: { logic: 7, clarity: 8, evidence: 7, engagement: 7 },
            totalScore: 29,
            standoutMove: "Grounded the room in the cost of social experiments that outrun durable institutions.",
          },
        ],
      });
      setJudgeStatus("done");
      setStatus("finished");
      return;
    }

    try {
      const res = await fetch(apiUrl("/api/judge"), {
        method: "POST",
        headers: buildRequestHeaders(currentDebateId ?? createDebateId()),
        body: JSON.stringify({ topic, history: fullHistory, totalRounds: targetRounds, judgeProfile }),
        signal: controller.signal,
      });

      if (!res.ok) {
        throw new Error("Judge failed");
      }

      const data: JudgeScores = await res.json();
      if (!isRunCurrent(runToken)) {
        return;
      }

      setJudgeScores(data);
      setJudgeStatus("done");
      setStatus("finished");
    } catch (error) {
      if (controller.signal.aborted || !isRunCurrent(runToken)) {
        return;
      }

      console.error(error);
      setJudgeStatus("error");
    } finally {
      if (judgeAbortRef.current === controller) {
        judgeAbortRef.current = null;
      }
    }
  };

  const renderSetup = () => (
    <motion.section
      initial="hidden"
      animate="show"
      variants={fadeUp}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="grid gap-8 lg:grid-cols-[1fr_0.85fr]"
    >
      <div className="border-b border-white/8 pb-8 lg:border-b-0 lg:border-r lg:pr-10">
        <span className="section-kicker">Debate Arena</span>
        <div className="mt-4 space-y-5">
          <h1 className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
            Choose a topic and let the arena run.
          </h1>

          <div className="rounded-[1.3rem] border border-amber-500/20 bg-amber-500/[0.06] p-4">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-amber-200">Public Usage Note</p>
            <p className="mt-2 text-sm leading-6 text-amber-50/78">
              A full 3-round public debate uses 12 model turns before judgment. Keep topics tight and rounds scarce while the arena is still on a budget.
            </p>
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <label className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">Topic</label>
              <span
                className={`font-mono text-[0.62rem] tabular-nums tracking-[0.18em] transition-colors ${
                  topic.length > 160 ? "text-orange-400" : "text-muted-foreground"
                }`}
              >
                {topic.length}/200
              </span>
            </div>

            <div className="flex flex-wrap gap-1.5">
              {PRESET_TOPICS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setTopic(preset)}
                  className={`topic-pill text-xs py-1.5 px-3 ${topic === preset ? "active" : ""}`}
                >
                  {preset}
                </button>
              ))}
            </div>

            <div className="relative rounded-xl border border-white/8 bg-white/[0.025] transition-colors focus-within:border-white/16">
              <textarea
                value={topic}
                onChange={(event) => setTopic(event.target.value.slice(0, 200))}
                placeholder="Should artificial intelligence be granted legal personhood rights?"
                className="min-h-[90px] w-full resize-none bg-transparent px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
              />
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1.5">
              <label className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-muted-foreground">Rounds per side</label>
              <div className="grid grid-cols-3 gap-2">
                {AVAILABLE_ROUND_OPTIONS.map((rounds) => {
                  const isLocked = rounds > MAX_PUBLIC_ROUNDS;

                  return (
                    <div key={rounds} className="group relative">
                      <button
                        type="button"
                        onClick={() => {
                          if (!isLocked) {
                            setTargetRounds(rounds as 3 | 5 | 7);
                          }
                        }}
                        aria-disabled={isLocked}
                        className={`w-full rounded-xl border py-2.5 font-mono text-xs tracking-[0.16em] transition-all ${
                          isLocked
                            ? "cursor-not-allowed border-white/6 bg-white/[0.02] text-muted-foreground/45"
                            : targetRounds === rounds
                              ? "border-violet-500/50 bg-violet-500/15 text-foreground"
                              : "border-white/8 bg-white/[0.025] text-muted-foreground hover:text-foreground hover:border-white/14"
                        }`}
                      >
                        {rounds}
                      </button>

                      {isLocked ? (
                        <div className="pointer-events-none absolute left-1/2 top-[calc(100%+0.5rem)] z-20 w-44 -translate-x-1/2 rounded-lg border border-white/10 bg-card/95 px-3 py-2 text-center text-[0.65rem] leading-5 text-muted-foreground opacity-0 shadow-[0_12px_32px_rgba(0,0,0,0.45)] transition-opacity duration-200 group-hover:opacity-100">
                          {LOCKED_ROUNDS_MESSAGE}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <label className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-muted-foreground">Judge profile</label>
              <div className="grid gap-2 sm:grid-cols-3">
                {Object.entries(JUDGE_PROFILE_COPY).map(([profile, copy]) => (
                  <button
                    key={profile}
                    type="button"
                    onClick={() => setJudgeProfile(profile as JudgeProfile)}
                    className={`rounded-2xl border p-4 text-left transition-all ${
                      judgeProfile === profile
                        ? "border-yellow-500/35 bg-yellow-500/[0.08]"
                        : "border-white/8 bg-white/[0.025] hover:border-white/14"
                    }`}
                  >
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">{copy.label}</p>
                    <p className="mt-2 text-sm leading-6 text-foreground/78">{copy.description}</p>
                  </button>
                ))}
              </div>
            </div>

            <button
              type="button"
              onClick={() => setIsDemoMode((value) => !value)}
              className={`group flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-all duration-200 ${
                isDemoMode ? "border-violet-500/30 bg-violet-500/8" : "border-white/8 bg-white/[0.025] hover:border-white/14"
              }`}
            >
              <div className="text-left">
                <p className={`font-mono text-[0.62rem] uppercase tracking-[0.2em] transition-colors ${isDemoMode ? "text-violet-300" : "text-muted-foreground"}`}>
                  Demo Mode
                </p>
                <p className="mt-0.5 text-[0.68rem] leading-tight text-muted-foreground/70">
                  Uses short mock responses for instant preview
                </p>
              </div>
              <div className={`relative ml-4 h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${isDemoMode ? "bg-violet-500" : "bg-white/10"}`}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-300 ${isDemoMode ? "left-[calc(100%-1.25rem)]" : "left-1"}`} />
              </div>
            </button>
          </div>

          <button onClick={handleStart} disabled={!topic.trim()} className="btn-primary w-full">
            <Flame className="h-4 w-4" />
            Start Debate
          </button>
        </div>
      </div>

      <motion.div variants={fadeUp} transition={{ delay: 0.08, duration: 0.55 }} className="pt-1 lg:pl-2">
        <span className="section-kicker">Cast</span>
        <div className="mt-4 flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            {PERSONA_ORDER.map((persona, index) => {
              const config = PERSONA_CONFIG[persona];
              const cardClass = `persona-card-${persona.toLowerCase()}`;
              return (
                <motion.div
                  key={persona}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.1 + index * 0.07, duration: 0.4, ease: "easeOut" }}
                  className={`group/card relative flex items-center gap-3 rounded-xl border p-4 transition-all duration-300 ${cardClass}`}
                  style={{ background: "rgba(255,255,255,0.025)" }}
                >
                  <div className={`h-12 w-12 shrink-0 overflow-hidden rounded-full ${config.bgLight} ring-1 ring-white/10`}>
                    <Image src={config.avatar} alt={persona} width={48} height={48} className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <p className={`font-display text-xl leading-none ${config.color}`}>{persona}</p>
                    <p className="mt-1 text-[0.65rem] leading-4 text-muted-foreground">{config.description}</p>
                  </div>

                  <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-0 z-50 w-60 opacity-0 transition-all duration-200 group-hover/card:pointer-events-auto group-hover/card:opacity-100">
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.97 }}
                      whileInView={{ opacity: 1, y: 0, scale: 1 }}
                      className="overflow-hidden rounded-2xl border border-white/10 bg-card/95 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                    >
                      <div className={`flex items-center gap-3 border-b border-white/8 px-4 py-3 ${config.bgLight}`}>
                        <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-white/15">
                          <Image src={config.avatar} alt={persona} width={40} height={40} className="h-full w-full object-cover" />
                        </div>
                        <div>
                          <p className={`font-display text-xl leading-none ${config.color}`}>{persona}</p>
                          <p className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-muted-foreground">{config.description}</p>
                        </div>
                      </div>
                      <div className="px-4 py-3">
                        <p className="text-[0.72rem] leading-[1.6] text-foreground/75">{config.fullBio}</p>
                        <p className="mt-2 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-muted-foreground/60">{config.model}</p>
                      </div>
                    </motion.div>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + PERSONA_ORDER.length * 0.07, duration: 0.4, ease: "easeOut" }}
            className="group/card relative flex items-center gap-3 rounded-xl border border-yellow-500/10 p-4 transition-all duration-300 hover:border-yellow-500/30 hover:bg-yellow-500/[0.04]"
            style={{ background: "rgba(255,255,255,0.025)" }}
          >
            <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-yellow-500/10 ring-1 ring-yellow-500/20">
              <Image src="/avatars/judge.png" alt="Justice Nyay" width={48} height={48} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-xl leading-none text-yellow-300">Justice Nyay</p>
              <p className="mt-1 text-[0.65rem] leading-4 text-muted-foreground">Neutral Arbiter &amp; Verdict Judge</p>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.section>
  );

  const renderRoundBreakPanel = () => {
    const targetRound = status === "round_break" ? currentRound : completedRounds;

    return (
      <motion.section
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-white/8 px-0 py-4"
      >
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">
                  {status === "round_break" ? "Round Break" : "Final Round Complete"}
                </p>
                <h3 className="mt-2 font-display text-3xl text-foreground">
                  Round {targetRound} audience check
                </h3>
                <p className="mt-2 text-sm leading-6 text-foreground/72">
                  Lock your vote now. {status === "round_break" ? "You can also inject one challenge card before Round " + (currentRound + 1) + "." : "The judge will score what just happened next."}
                </p>
              </div>
              {status === "round_break" ? (
                <button onClick={continueDebate} className="btn-primary px-5 py-3 text-[0.6rem]">
                  <Sparkles className="h-3.5 w-3.5" />
                  Continue to Round {currentRound + 1}
                </button>
              ) : null}
            </div>

            <div className="mt-5 flex flex-wrap gap-2">
              {([...PERSONA_ORDER, "Tie"] as AudienceVote[]).map((vote) => {
                const isActive = audienceVotes[targetRound] === vote;
                return (
                  <button
                    key={vote}
                    type="button"
                    onClick={() => updateAudienceVote(targetRound, vote)}
                    className={`rounded-full border px-4 py-2 font-mono text-[0.6rem] uppercase tracking-[0.16em] transition-all ${
                      isActive
                        ? "border-green-500/40 bg-green-500/15 text-green-200"
                        : "border-white/8 bg-white/[0.025] text-muted-foreground hover:border-white/14 hover:text-foreground"
                    }`}
                  >
                    {vote}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">Challenge Card</p>
            {hasUsedChallengeCard ? (
              <div className="mt-3 rounded-2xl border border-violet-500/20 bg-violet-500/[0.08] p-4">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-violet-200">Locked In</p>
                <p className="mt-2 text-sm leading-6 text-foreground/82">{activeChallengeCard}</p>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  Applies from Round {challengeRoundStart} onward. One challenge card per debate.
                </p>
              </div>
            ) : (
              <>
                <p className="mt-3 text-sm leading-6 text-foreground/72">
                  Force the remaining rounds to obey one extra rule. Keep it short and sharp.
                </p>
                <textarea
                  value={challengeDraft}
                  onChange={(event) => setChallengeDraft(event.target.value.slice(0, 120))}
                  placeholder="Every speaker must use one concrete historical example."
                  className="mt-3 min-h-[94px] w-full resize-none rounded-2xl border border-white/8 bg-black/10 px-4 py-3 text-sm text-foreground outline-none placeholder:text-muted-foreground/50"
                />
                <div className="mt-3 flex items-center justify-between gap-3">
                  <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-muted-foreground">
                    {challengeDraft.length}/120
                  </span>
                  <button
                    type="button"
                    onClick={applyChallengeCard}
                    disabled={!challengeDraft.trim()}
                    className="btn-ghost px-4 py-2 text-[0.58rem] disabled:opacity-40"
                  >
                    Apply Challenge
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </motion.section>
    );
  };

  const renderArena = () => (
    <div className="flex min-h-[calc(100svh-5rem)] flex-col">
      <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="border-b border-white/8 px-0 py-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              {status === "debating" && !hasTurnError ? (
                <div className="live-badge">{turnUiPhase === "streaming" ? "Live" : "Live"}</div>
              ) : status === "round_break" ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-violet-500/30 bg-violet-500/12 px-3 py-1 font-mono text-[0.56rem] uppercase tracking-[0.18em] text-violet-200">
                  <span className="h-1.5 w-1.5 rounded-full bg-violet-300" />
                  Round Break
                </div>
              ) : status === "awaiting_judge" ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/15 px-3 py-1 font-mono text-[0.56rem] uppercase tracking-[0.18em] text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.25)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                  Debate Complete
                </div>
              ) : (
                <div className="status-badge">
                  {status === "finished" ? "Verdict Ready" : hasTurnError ? "Turn Failed" : "Arena Idle"}
                </div>
              )}
            </div>

            <div className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.03] p-0.5">
              <button
                onClick={() => setViewRound((value) => Math.max(1, value - 1))}
                disabled={viewRound === 1 || isTurnLocked}
                className="rounded-full px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
              >
                ← Prev
              </button>
              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 font-mono text-[0.58rem] tracking-[0.18em] text-foreground">
                Round {viewRound} / {targetRounds}
              </span>
              <button
                onClick={() => setViewRound((value) => Math.min(targetRounds, value + 1))}
                disabled={viewRound === targetRounds || isTurnLocked || (viewRound >= completedRounds && status !== "finished" && status !== "results" && status !== "awaiting_judge")}
                className="rounded-full px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
              >
                Next →
              </button>
            </div>

            <div className="rounded-full border border-white/8 bg-white/[0.03] px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">
              {stageLabel(resolveStage(viewRound, targetRounds))}
            </div>

            <p className="hidden max-w-sm truncate font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground/70 sm:block">{topic}</p>
          </div>

          <div className="flex items-center gap-2">
            {status === "awaiting_judge" && (
              <motion.button
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                onClick={() => void runJudgeModel(history, activeRunRef.current)}
                className="inline-flex items-center gap-2 rounded-full border border-yellow-500/40 bg-gradient-to-r from-yellow-600/30 to-amber-500/30 px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-yellow-200 shadow-[0_0_14px_rgba(202,138,4,0.3)] transition-all hover:border-yellow-400/60 hover:from-yellow-600/45 hover:to-amber-500/45 hover:text-yellow-100"
              >
                <Scale className="h-3.5 w-3.5" />
                Send to Judge
              </motion.button>
            )}
            {status === "finished" && (
              <button onClick={() => setStatus("results")} className="btn-primary py-2 px-4 text-[0.62rem]">
                <Scale className="h-3.5 w-3.5" />
                View Verdict
              </button>
            )}
            {hasTurnError && (
              <button
                onClick={retryCurrentTurn}
                className="btn-ghost border-destructive/40 bg-destructive/10 py-2 px-4 text-[0.62rem] text-destructive-foreground hover:bg-destructive/20"
              >
                Retry Turn
              </button>
            )}
            <button onClick={handleRestart} disabled={isTurnLocked} className="btn-ghost py-2 px-3 text-[0.62rem] disabled:opacity-35">
              <RotateCcw className="h-3.5 w-3.5" />
              Restart
            </button>
            <button onClick={handleNewDebate} className="btn-ghost py-2 px-3 text-[0.62rem]">
              New Topic
            </button>
          </div>
        </div>
      </motion.section>

      {(status === "round_break" || status === "awaiting_judge") && renderRoundBreakPanel()}

      <section className="flex-1 overflow-hidden lg:grid lg:grid-cols-2 lg:divide-x lg:divide-white/8">
        {PERSONA_ORDER.map((persona, index) => {
          const config = PERSONA_CONFIG[persona];
          const roundEntry = history.find((entry) => entry.persona === persona && entry.round === viewRound);
          const isTurn = status === "debating" && activePersonaName === persona;
          const isCurrentTurnViewing = isTurn && currentRound === viewRound;
          const isViewingCompletedRound = Boolean(roundEntry) && !isCurrentTurnViewing;

          const phaseCopy =
            isCurrentTurnViewing && !hasTurnError
              ? turnUiPhase === "cooldown"
                ? `${turnPhaseLabel} · retrying in ${cooldownSeconds}s`
                : turnPhaseLabel
              : isViewingCompletedRound
                ? `${stageLabel(resolveStage(viewRound, targetRounds))} archived`
                : `Waiting for ${persona}`;

          return (
            <motion.article
              key={persona}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, scale: isTurn ? 1.002 : 1 }}
              transition={{ delay: index * 0.04, duration: 0.3, ease: "easeOut" }}
              className={`flex flex-col border-b border-white/8 transition-all duration-300 lg:border-b-0 ${
                isTurn ? `bg-white/[0.03] persona-card-${persona.toLowerCase()} active` : ""
              }`}
            >
              <div className="group/card relative flex items-center justify-between gap-3 border-b border-white/6 px-4 py-3.5">
                <div className="flex items-center gap-3">
                  <div className={`relative h-12 w-12 shrink-0 overflow-hidden rounded-full ${config.bgLight} ring-1 ring-white/10`}>
                    <Image src={config.avatar} alt={persona} width={48} height={48} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className={`font-display text-2xl leading-none ${config.color}`}>{persona}</p>
                    <p className="mt-0.5 font-mono text-[0.52rem] uppercase tracking-[0.18em] text-muted-foreground">{config.description}</p>
                  </div>
                </div>

                <div className={`rounded-full border px-3 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.18em] ${
                  isTurn
                    ? "border-green-500/30 bg-green-500/10 text-green-200"
                    : "border-white/8 bg-white/[0.03] text-muted-foreground"
                }`}>
                  {isTurn ? stageLabel(currentStage) : `R${viewRound}`}
                </div>

                <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-3 z-50 w-60 opacity-0 transition-all duration-200 group-hover/card:pointer-events-auto group-hover/card:opacity-100">
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-card/95 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                  >
                    <div className={`flex items-center gap-3 border-b border-white/8 px-4 py-3 ${config.bgLight}`}>
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-white/15">
                        <Image src={config.avatar} alt={persona} width={40} height={40} className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className={`font-display text-xl leading-none ${config.color}`}>{persona}</p>
                        <p className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-muted-foreground">{config.description}</p>
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <p className="text-[0.72rem] leading-[1.6] text-foreground/75">{config.fullBio}</p>
                      <p className="mt-2 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-muted-foreground/60">{config.model}</p>
                    </div>
                  </motion.div>
                </div>
              </div>

              <div className="border-b border-white/6 px-4 py-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground">{phaseCopy}</p>
                  {isCurrentTurnViewing && turnUiPhase === "cooldown" ? (
                    <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-amber-200">{cooldownSeconds}s</p>
                  ) : null}
                </div>
                {activeChallengeForCurrentRound && viewRound >= (challengeRoundStart ?? Number.MAX_SAFE_INTEGER) ? (
                  <p className="mt-2 text-[0.72rem] leading-5 text-violet-200/80">
                    Challenge: {activeChallengeForCurrentRound}
                  </p>
                ) : null}
              </div>

              <div className="flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: "calc((100svh - 16rem) / 2)" }}>
                <AnimatePresence mode="wait">
                  {!roundEntry && !isCurrentTurnViewing ? (
                    <motion.p
                      key="empty"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="flex h-20 items-center justify-center text-[0.72rem] leading-6 text-muted-foreground/60"
                    >
                      Waiting for {persona} in Round {viewRound}.
                    </motion.p>
                  ) : null}

                  {roundEntry ? (
                    <motion.p
                      key={`history-${persona}-${viewRound}`}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      className="text-[0.8rem] leading-6 text-foreground/85"
                    >
                      {roundEntry.text}
                    </motion.p>
                  ) : null}

                  {isCurrentTurnViewing && !hasTurnError ? (
                    <motion.div key={`stream-${persona}-${viewRound}`} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                      {streamingText ? (
                        <p className="text-[0.8rem] leading-6 text-foreground/85">
                          {streamingText}
                          {turnUiPhase === "streaming" ? (
                            <span className="ml-1 inline-block h-3.5 w-1 animate-blink rounded-full bg-foreground/70 align-middle" />
                          ) : null}
                        </p>
                      ) : (
                        <div className="rounded-xl border border-white/8 bg-white/[0.025] px-4 py-4">
                          <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">{turnPhaseLabel}</p>
                          <p className="mt-2 text-sm leading-6 text-foreground/72">
                            {turnUiPhase === "cooldown"
                              ? `The provider pushed back. The arena is cooling down before retrying in ${cooldownSeconds}s.`
                              : `${persona} is still preparing this ${stageLabel(currentStage).toLowerCase()} turn.`}
                          </p>
                        </div>
                      )}
                    </motion.div>
                  ) : null}

                  {isCurrentTurnViewing && hasTurnError ? (
                    <motion.div
                      key={`error-${persona}-${viewRound}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="rounded-xl border border-destructive/25 bg-destructive/8 px-4 py-4"
                    >
                      <p className="text-sm font-medium text-destructive">Turn failed — retry to continue.</p>
                      <button
                        onClick={retryCurrentTurn}
                        className="mt-3 rounded-full border border-destructive/40 bg-destructive px-4 py-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-white transition-colors hover:bg-destructive/90"
                      >
                        Retry
                      </button>
                    </motion.div>
                  ) : null}
                </AnimatePresence>
              </div>
            </motion.article>
          );
        })}
      </section>
    </div>
  );

  const renderResults = () => (
    <motion.section initial={{ opacity: 0, y: 18 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
      <div className="border-b border-white/8 px-0 py-5 sm:py-6">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-3">
            <span className="section-kicker">Judgment</span>
            <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl">{topic}</h1>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => setStatus(judgeStatus === "done" ? "finished" : "awaiting_judge")} className="btn-ghost">
              View Debate
            </button>
            <button onClick={handleNewDebate} className="btn-primary py-2.5 px-5 text-[0.62rem]">
              New Debate
            </button>
          </div>
        </div>
      </div>

      <section className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
        <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">Judge Profile</p>
          <p className="mt-3 font-display text-3xl text-foreground">{JUDGE_PROFILE_COPY[judgeProfile].label}</p>
          <p className="mt-2 text-sm leading-6 text-foreground/72">{JUDGE_PROFILE_COPY[judgeProfile].description}</p>
        </div>
        <div className="rounded-[1.5rem] border border-white/8 bg-white/[0.03] p-5">
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">Audience Votes By Round</p>
          <div className="mt-4 flex flex-wrap gap-2">
            {Array.from({ length: targetRounds }, (_, index) => index + 1).map((round) => (
              <div key={round} className="rounded-full border border-white/8 bg-white/[0.025] px-4 py-2">
                <p className="font-mono text-[0.5rem] uppercase tracking-[0.18em] text-muted-foreground">Round {round}</p>
                <p className="mt-1 text-sm text-foreground/82">{audienceVotes[round] ?? "No vote"}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <JudgeResults scores={judgeScores} status={judgeStatus} onRetry={() => void runJudgeModel(history, activeRunRef.current)} />
    </motion.section>
  );

  return (
    <main className={`px-4 sm:px-6 lg:px-8 ${status === "setup" ? "flex min-h-[calc(100svh-5rem)] items-center pb-4" : "pb-10"}`}>
      <div className="mx-auto w-full max-w-7xl">
        <AnimatePresence mode="wait">
          {status === "setup" ? (
            <motion.div key="setup" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderSetup()}
            </motion.div>
          ) : status === "results" ? (
            <motion.div key="results" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderResults()}
            </motion.div>
          ) : (
            <motion.div key="arena" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              {renderArena()}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </main>
  );
}
