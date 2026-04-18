"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Flame, RotateCcw, Scale } from "lucide-react";
import { Persona, PERSONA_CONFIG } from "@/components/debates/PersonaCard";
import { JudgeResults, JudgeScores } from "@/components/debates/JudgeResults";
import { apiUrl } from "@/lib/api";
import { getOrCreateSessionId } from "@/lib/session";

type DebateStatus = "setup" | "debating" | "awaiting_judge" | "finished" | "results";

interface ResponseLog {
  persona: Persona;
  text: string;
  round: number;
}

const PERSONA_ORDER: Persona[] = ["Aria", "Lex", "Sage", "Rex"];

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

  const [judgeStatus, setJudgeStatus] = useState<"idle" | "evaluating" | "done" | "error">("idle");
  const [judgeScores, setJudgeScores] = useState<JudgeScores | null>(null);
  const activeRunRef = useRef(0);
  const debateAbortRef = useRef<AbortController | null>(null);
  const judgeAbortRef = useRef<AbortController | null>(null);

  const activePersonaName = PERSONA_ORDER[activePersonaIdx];

  const resetForNewRun = () => {
    setCurrentRound(1);
    setViewRound(1);
    setActivePersonaIdx(0);
    setHistory([]);
    setStreamingText("");
    setHasTurnError(false);
    setJudgeStatus("idle");
    setJudgeScores(null);
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

  useEffect(() => {
    return () => {
      activeRunRef.current += 1;
      abortInFlightRequests();
    };
  }, []);

  const handleStart = () => {
    if (!topic.trim()) return;
    const debateId = createDebateId();
    const runToken = beginRun();
    resetForNewRun();
    setCurrentDebateId(debateId);
    setStatus("debating");
    void startNextTurn(1, 0, [], debateId, runToken);
  };

  const handleRestart = () => {
    const debateId = createDebateId();
    const runToken = beginRun();
    resetForNewRun();
    setCurrentDebateId(debateId);
    setStatus("debating");
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
    setStreamingText("");
    setHasTurnError(false);

    if (isDemoMode) {
      const demoResponse = `As ${persona}, I firmly believe that regarding "${topic}", we must deeply consider the ideological implications.\n\nFrom my perspective as the ${PERSONA_CONFIG[persona].description}, the evidence clearly shows that we must be meticulous about our approach here. This is a highly simulated response generated completely locally to test the UI without hitting any Groq or Gemini API keys.`;

      let currentText = "";
      for (let i = 1; i <= demoResponse.length; i += 4) {
        if (!isRunCurrent(runToken)) {
          return;
        }

        currentText = demoResponse.slice(0, i);
        setStreamingText(currentText);
        await sleep(20);
      }

      if (!isRunCurrent(runToken)) {
        return;
      }

      const newHistory = [...currentHistory, { persona, text: demoResponse, round }];
      setHistory(newHistory);
      setStreamingText("");

      const nextIdx = pIdx + 1;
      if (nextIdx < PERSONA_ORDER.length) {
        setActivePersonaIdx(nextIdx);
        void startNextTurn(round, nextIdx, newHistory, debateId, runToken);
        return;
      }

      if (round < targetRounds) {
        const nextRound = round + 1;
        setCurrentRound(nextRound);
        setViewRound(nextRound);
        setActivePersonaIdx(0);
        void startNextTurn(nextRound, 0, newHistory, debateId, runToken);
        return;
      }

      setStatus("awaiting_judge");
      return;
    }

    const controller = new AbortController();
    debateAbortRef.current = controller;

    try {
      const sendTurnRequest = () =>
        fetch(apiUrl("/api/debate"), {
          method: "POST",
          headers: buildRequestHeaders(debateId),
          body: JSON.stringify({
            topic,
            persona,
            currentRound: round,
            totalRounds: targetRounds,
            history: currentHistory,
          }),
          signal: controller.signal,
        });

      let res = await sendTurnRequest();

      const MAX_RETRIES = 3;
      const BACKOFF_MS = [12000, 20000, 30000];

      for (let attempt = 0; attempt < MAX_RETRIES && res.status === 429; attempt++) {
        if (!isRunCurrent(runToken)) {
          return;
        }

        await sleep(BACKOFF_MS[attempt]);
        if (!isRunCurrent(runToken)) {
          return;
        }

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

      const newHistory = [...currentHistory, { persona, text: fullResponse, round }];
      setHistory(newHistory);
      setStreamingText("");

      const nextIdx = pIdx + 1;
      if (nextIdx < PERSONA_ORDER.length) {
        setActivePersonaIdx(nextIdx);
        void startNextTurn(round, nextIdx, newHistory, debateId, runToken);
        return;
      }

      if (round < targetRounds) {
        const nextRound = round + 1;
        setCurrentRound(nextRound);
        setViewRound(nextRound);
        setActivePersonaIdx(0);
        void startNextTurn(nextRound, 0, newHistory, debateId, runToken);
        return;
      }

      setStatus("awaiting_judge");
    } catch (error) {
      if (controller.signal.aborted || !isRunCurrent(runToken)) {
        return;
      }

      console.error(error);
      setStreamingText("");
      setHasTurnError(true);
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
      await sleep(1800);
      if (!isRunCurrent(runToken)) {
        return;
      }

      setJudgeScores({
        summary:
          "Justice Nyay judged this simulation as a balanced exchange with clear ideological contrast. Sage won by reframing the strongest claims from both sides into a more coherent synthesis instead of merely countering them. Aria remained the most emotionally persuasive voice, while Lex maintained the sharpest analytical discipline. Rex stayed forceful and grounded, but lost points when the debate shifted toward integration rather than conviction.",
        winner: "Sage",
        strongestMoment:
          "Sage exposed the hidden assumption shared by the opposing camps and used it to redefine the whole debate.",
        conclusion:
          "The conclusion based on the discussion by Aria, Lex, Sage and Rex is that strong systems need both moral scrutiny and practical resilience. The best arguments converged on the idea that progress only holds when it survives contact with consequence.",
        evaluations: [
          {
            persona: "Aria",
            rank: 2,
            scores: { logic: 8, clarity: 9, evidence: 8, engagement: 9 },
            totalScore: 34,
            standoutMove: "Forced the conversation back toward the people hidden behind clean abstractions.",
          },
          {
            persona: "Lex",
            rank: 3,
            scores: { logic: 9, clarity: 8, evidence: 9, engagement: 6 },
            totalScore: 32,
            standoutMove: "Pressed the room to justify idealism with measurable tradeoffs.",
          },
          {
            persona: "Sage",
            rank: 1,
            scores: { logic: 10, clarity: 9, evidence: 8, engagement: 10 },
            totalScore: 37,
            standoutMove: "Reframed the argument so both sides had to answer a deeper contradiction.",
          },
          {
            persona: "Rex",
            rank: 4,
            scores: { logic: 7, clarity: 8, evidence: 7, engagement: 7 },
            totalScore: 29,
            standoutMove: "Grounded the debate in historical memory and the cost of unstable change.",
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
        body: JSON.stringify({ topic, history: fullHistory, totalRounds: targetRounds }),
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

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-4">
              <label className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">Topic</label>
              <span className={`font-mono text-[0.62rem] tabular-nums tracking-[0.18em] transition-colors ${
                topic.length > 160 ? "text-orange-400" : "text-muted-foreground"
              }`}>{topic.length}/200</span>
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
            {/* Rounds selector */}
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

            {/* Demo mode toggle */}
            <button
              type="button"
              onClick={() => setIsDemoMode((v) => !v)}
              className={`group flex w-full items-center justify-between rounded-xl border px-4 py-3 transition-all duration-200 ${
                isDemoMode
                  ? "border-violet-500/30 bg-violet-500/8"
                  : "border-white/8 bg-white/[0.025] hover:border-white/14"
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
              {/* Toggle pill */}
              <div className={`relative ml-4 h-6 w-11 shrink-0 rounded-full transition-colors duration-300 ${isDemoMode ? "bg-violet-500" : "bg-white/10"}`}>
                <span className={`absolute top-1 h-4 w-4 rounded-full bg-white shadow-sm transition-all duration-300 ${isDemoMode ? "left-[calc(100%-1.25rem)]" : "left-1"}`} />
              </div>
            </button>
          </div>

          <button
            onClick={handleStart}
            disabled={!topic.trim()}
            className="btn-primary w-full"
          >
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

                  {/* Hover tooltip */}
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

          {/* Judge Card */}
          <motion.div
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 + PERSONA_ORDER.length * 0.07, duration: 0.4, ease: "easeOut" }}
            className="group/card relative flex items-center gap-3 rounded-xl border border-yellow-500/10 p-4 transition-all duration-300 hover:border-yellow-500/30 hover:bg-yellow-500/[0.04]"
            style={{ background: "rgba(255,255,255,0.025)" }}
          >
            <div className="flex h-12 w-12 shrink-0 overflow-hidden items-center justify-center rounded-full bg-yellow-500/10 ring-1 ring-yellow-500/20">
              <Image src="/avatars/judge.png" alt="Justice Nyay" width={48} height={48} className="h-full w-full object-cover" />
            </div>
            <div className="min-w-0">
              <p className="font-display text-xl leading-none text-yellow-300">Justice Nyay</p>
              <p className="mt-1 text-[0.65rem] leading-4 text-muted-foreground">Neutral Arbiter &amp; Verdict Judge</p>
            </div>

            {/* Judge Hover Tooltip */}
            <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-0 z-50 w-60 opacity-0 transition-all duration-200 group-hover/card:pointer-events-auto group-hover/card:opacity-100">
              <motion.div
                initial={{ opacity: 0, y: 6, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                className="overflow-hidden rounded-2xl border border-white/10 bg-card/95 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl"
              >
                <div className="flex items-center gap-3 border-b border-yellow-500/20 bg-yellow-500/10 px-4 py-3">
                  <div className="flex h-10 w-10 shrink-0 overflow-hidden items-center justify-center rounded-full bg-yellow-500/20 ring-1 ring-yellow-500/30">
                    <Image src="/avatars/judge.png" alt="Justice Nyay" width={40} height={40} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className="font-display text-xl leading-none text-yellow-300">Justice Nyay</p>
                    <p className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-yellow-500/70">Impartial Judge</p>
                  </div>
                </div>
                <div className="px-4 py-3">
                  <p className="text-[0.72rem] leading-[1.6] text-foreground/75">Evaluates all arguments fairly without political or ideological bias. Scores participants strictly on logic, clarity, evidence, and direct engagement.</p>
                  <p className="mt-2 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-muted-foreground/60">gemini-2.5-flash</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.section>
  );

  const renderArena = () => (
    <div className="flex min-h-[calc(100svh-5rem)] flex-col">
      {/* Header */}
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-white/8 px-0 py-4"
      >
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* Left — topic + round nav */}
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-3">
            <div className="flex items-center gap-2">
              {status === "debating" && !hasTurnError ? (
                <div className="live-badge">Live</div>
              ) : status === "awaiting_judge" ? (
                <div className="inline-flex items-center gap-1.5 rounded-full border border-blue-500/40 bg-blue-500/15 px-3 py-1 font-mono text-[0.56rem] uppercase tracking-[0.18em] text-blue-300 shadow-[0_0_12px_rgba(59,130,246,0.25)]">
                  <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-blue-400" />
                  Debate Complete
                </div>
              ) : (
                <div className="status-badge">
                  {status === "finished"
                    ? "Verdict Ready"
                    : hasTurnError
                      ? "Turn Failed"
                      : `${activePersonaName} speaking`}
                </div>
              )}
            </div>

            <div className="inline-flex items-center rounded-full border border-white/8 bg-white/[0.03] p-0.5">
              <button
                onClick={() => setViewRound((v) => Math.max(1, v - 1))}
                disabled={viewRound === 1}
                className="rounded-full px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
              >
                ← Prev
              </button>
              <span className="rounded-full border border-white/10 bg-white/8 px-3 py-1.5 font-mono text-[0.58rem] tracking-[0.18em] text-foreground">
                Round {viewRound} / {targetRounds}
              </span>
              <button
                onClick={() => setViewRound((v) => Math.min(targetRounds, v + 1))}
                disabled={viewRound === targetRounds || (viewRound >= currentRound && status !== "finished" && status !== "results")}
                className="rounded-full px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
              >
                Next →
              </button>
            </div>

            <p className="hidden max-w-sm truncate font-mono text-[0.62rem] uppercase tracking-[0.14em] text-muted-foreground/70 sm:block">{topic}</p>
          </div>

          {/* Right — actions */}
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
              <button
                onClick={() => setStatus("results")}
                className="btn-primary py-2 px-4 text-[0.62rem]"
              >
                <Scale className="h-3.5 w-3.5" />
                View Verdict
              </button>
            )}
            {hasTurnError && (
              <button
                onClick={retryCurrentTurn}
                className="btn-ghost border-destructive/40 bg-destructive/10 text-destructive-foreground hover:bg-destructive/20 py-2 px-4 text-[0.62rem]"
              >
                Retry Turn
              </button>
            )}
            <button onClick={handleRestart} className="btn-ghost py-2 px-3 text-[0.62rem]">
              <RotateCcw className="h-3.5 w-3.5" />
              Restart
            </button>
            <button onClick={handleNewDebate} className="btn-ghost py-2 px-3 text-[0.62rem]">
              New Topic
            </button>
          </div>
        </div>
      </motion.section>

      {/* Persona Grid — fills remaining height */}
      <section className="flex-1 overflow-hidden lg:grid lg:grid-cols-2 lg:divide-x lg:divide-white/8">
        {PERSONA_ORDER.map((persona, index) => {
          const config = PERSONA_CONFIG[persona];
          const roundEntry = history.find((e) => e.persona === persona && e.round === viewRound);
          const isTurn = status === "debating" && activePersonaName === persona;
          const isCurrentTurnViewing = isTurn && currentRound === viewRound;

          return (
            <motion.article
              key={persona}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0, scale: isTurn ? 1.002 : 1 }}
              transition={{ delay: index * 0.04, duration: 0.3, ease: "easeOut" }}
              className={`flex flex-col border-b border-white/8 lg:border-b-0 transition-all duration-300 ${
                isTurn ? `bg-white/[0.03] persona-card-${persona.toLowerCase()} active` : ""
              }`}
            >
              {/* Card header — hover for persona tooltip */}
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
                {isTurn ? (
                  <div className="live-badge">Live</div>
                ) : (
                  <div className="status-badge">R{viewRound}</div>
                )}

                {/* Hover tooltip — fixed size for all personas */}
                <div className="pointer-events-none absolute bottom-[calc(100%+0.5rem)] left-3 z-50 w-60 opacity-0 transition-all duration-200 group-hover/card:pointer-events-auto group-hover/card:opacity-100">
                  <motion.div
                    initial={{ opacity: 0, y: 6, scale: 0.97 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    className="overflow-hidden rounded-2xl border border-white/10 bg-card/95 shadow-[0_8px_32px_rgba(0,0,0,0.5)] backdrop-blur-xl"
                  >
                    {/* Tooltip header */}
                    <div className={`flex items-center gap-3 border-b border-white/8 px-4 py-3 ${config.bgLight}`}>
                      <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full ring-1 ring-white/15">
                        <Image src={config.avatar} alt={persona} width={40} height={40} className="h-full w-full object-cover" />
                      </div>
                      <div>
                        <p className={`font-display text-xl leading-none ${config.color}`}>{persona}</p>
                        <p className="mt-0.5 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-muted-foreground">{config.description}</p>
                      </div>
                    </div>
                    {/* Tooltip body */}
                    <div className="px-4 py-3">
                      <p className="text-[0.72rem] leading-[1.6] text-foreground/75">{config.fullBio}</p>
                      <p className="mt-2 font-mono text-[0.5rem] uppercase tracking-[0.16em] text-muted-foreground/60">{config.model}</p>
                    </div>
                  </motion.div>
                </div>
              </div>

              {/* Card body — scrollable, capped height */}
              <div className="flex-1 overflow-y-auto px-4 py-3" style={{ maxHeight: "calc((100svh - 12rem) / 2)" }}>
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
                    <motion.p
                      key={`stream-${persona}-${viewRound}`}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="text-[0.8rem] leading-6 text-foreground/85"
                    >
                      {streamingText}
                      <span className="ml-1 inline-block h-3.5 w-1 animate-blink rounded-full bg-foreground/70 align-middle" />
                    </motion.p>
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
            <button
              onClick={() => setStatus(judgeStatus === "done" ? "finished" : "awaiting_judge")}
              className="btn-ghost"
            >
              View Debate
            </button>
            <button
              onClick={handleNewDebate}
              className="btn-primary py-2.5 px-5 text-[0.62rem]"
            >
              New Debate
            </button>
          </div>
        </div>
      </div>

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
