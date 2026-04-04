"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ArrowRight, Flame, Scale, Sparkles, SquareTerminal, Trophy, X } from "lucide-react";
import { Persona, PERSONA_CONFIG } from "@/components/debates/PersonaCard";
import { JudgeResults, JudgeScores } from "@/components/debates/JudgeResults";

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

const PERSONA_SURFACE: Record<Persona, string> = {
  Aria: "border-[#b67de6]/35 bg-[linear-gradient(180deg,rgba(182,125,230,0.14),rgba(12,10,10,0.16))]",
  Lex: "border-[#72b7ee]/35 bg-[linear-gradient(180deg,rgba(114,183,238,0.14),rgba(12,10,10,0.16))]",
  Sage: "border-[#7ed39e]/35 bg-[linear-gradient(180deg,rgba(126,211,158,0.14),rgba(12,10,10,0.16))]",
  Rex: "border-[#ef9177]/35 bg-[linear-gradient(180deg,rgba(239,145,119,0.14),rgba(12,10,10,0.16))]",
};

export default function DebatesPage() {
  const [topic, setTopic] = useState("");
  const [targetRounds, setTargetRounds] = useState<3 | 5 | 7>(3);
  const [status, setStatus] = useState<DebateStatus>("setup");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [currentRound, setCurrentRound] = useState(1);
  const [viewRound, setViewRound] = useState(1);
  const [activePersonaIdx, setActivePersonaIdx] = useState(0);
  const [history, setHistory] = useState<ResponseLog[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [hasTurnError, setHasTurnError] = useState(false);

  const [judgeStatus, setJudgeStatus] = useState<"idle" | "evaluating" | "done" | "error">("idle");
  const [judgeScores, setJudgeScores] = useState<JudgeScores | null>(null);

  const arenaRef = useRef<HTMLDivElement>(null);
  const activePersonaName = PERSONA_ORDER[activePersonaIdx];

  useEffect(() => {
    if (status !== "setup") {
      arenaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  const handleStart = () => {
    if (!topic.trim()) return;

    setStatus("debating");
    setCurrentRound(1);
    setViewRound(1);
    setActivePersonaIdx(0);
    setHistory([]);
    setStreamingText("");
    setHasTurnError(false);
    setJudgeStatus("idle");
    setJudgeScores(null);

    startNextTurn(1, 0, []);
  };

  const handleRestart = () => {
    setStatus("debating");
    setCurrentRound(1);
    setViewRound(1);
    setActivePersonaIdx(0);
    setHistory([]);
    setStreamingText("");
    setHasTurnError(false);
    setJudgeStatus("idle");
    setJudgeScores(null);

    startNextTurn(1, 0, []);
  };

  const handleNewDebate = () => {
    setTopic("");
    setStatus("setup");
    setIsModalOpen(false);
    setCurrentRound(1);
    setViewRound(1);
    setActivePersonaIdx(0);
    setHistory([]);
    setStreamingText("");
    setHasTurnError(false);
    setJudgeStatus("idle");
    setJudgeScores(null);
  };

  const retryCurrentTurn = () => {
    setStatus("debating");
    startNextTurn(currentRound, activePersonaIdx, history);
  };

  const startNextTurn = async (round: number, pIdx: number, currentHistory: ResponseLog[]) => {
    const persona = PERSONA_ORDER[pIdx];
    setStreamingText("");
    setHasTurnError(false);

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    if (isDemoMode) {
      const demoResponse = `As ${persona}, I firmly believe that regarding "${topic}", we must deeply consider the ideological implications.\n\nFrom my perspective as the ${PERSONA_CONFIG[persona].description}, the evidence clearly shows that we must be meticulous about our approach here. This is a highly simulated response generated completely locally to test the UI without hitting any Groq or Gemini API keys.`;

      let currentText = "";
      for (let i = 1; i <= demoResponse.length; i += 4) {
        currentText = demoResponse.slice(0, i);
        setStreamingText(currentText);
        await sleep(20);
      }

      setStreamingText(demoResponse);

      const newHistory = [...currentHistory, { persona, text: demoResponse, round }];
      setHistory(newHistory);

      const nextIdx = pIdx + 1;
      if (nextIdx < PERSONA_ORDER.length) {
        setActivePersonaIdx(nextIdx);
        startNextTurn(round, nextIdx, newHistory);
        return;
      }

      if (round < targetRounds) {
        const nextRound = round + 1;
        setCurrentRound(nextRound);
        setViewRound(nextRound);
        setActivePersonaIdx(0);
        startNextTurn(nextRound, 0, newHistory);
        return;
      }

      setStatus("awaiting_judge");
      setStreamingText("");
      return;
    }

    try {
      let res = await fetch("/api/debate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          topic,
          persona,
          currentRound: round,
          totalRounds: targetRounds,
          history: currentHistory,
        }),
      });

      const MAX_RETRIES = 3;
      const BACKOFF_MS = [12000, 20000, 30000];

      for (let attempt = 0; attempt < MAX_RETRIES && res.status === 429; attempt++) {
        const waitMs = BACKOFF_MS[attempt];
        await sleep(waitMs);
        res = await fetch("/api/debate", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            topic,
            persona,
            currentRound: round,
            totalRounds: targetRounds,
            history: currentHistory,
          }),
        });
      }

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(`Failed to fetch debate stream: ${errorText}`);
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
              setStreamingText(fullResponse);
            }
          } catch (error) {
            console.error("Stream parse error:", error, line);
          }
        }
      }

      const newHistory = [...currentHistory, { persona, text: fullResponse, round }];
      setHistory(newHistory);
      setStreamingText("");

      const nextIdx = pIdx + 1;
      if (nextIdx < PERSONA_ORDER.length) {
        setActivePersonaIdx(nextIdx);
        startNextTurn(round, nextIdx, newHistory);
        return;
      }

      if (round < targetRounds) {
        const nextRound = round + 1;
        setCurrentRound(nextRound);
        setViewRound(nextRound);
        setActivePersonaIdx(0);
        startNextTurn(nextRound, 0, newHistory);
        return;
      }

      setStatus("awaiting_judge");
    } catch (error) {
      console.error(error);
      setStreamingText("");
      setHasTurnError(true);
    }
  };

  async function runJudgeModel(fullHistory: ResponseLog[]) {
    setJudgeStatus("evaluating");
    setStatus("results");

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    if (isDemoMode) {
      await sleep(2500);
      setJudgeScores({
        summary:
          "Justice Nyay judged this as a sharply balanced simulation where every persona executed a recognizable ideological style. Sage ultimately edged ahead by synthesizing opposing claims into a more coherent frame rather than merely counterpunching. Aria delivered the most emotionally persuasive passages, while Lex stayed disciplined on structural logic. Rex remained forceful and clear, but ceded ground when the debate turned toward synthesis rather than conviction.",
        winner: "Sage",
        strongestMoment:
          "Sage reframed the argument by showing that both efficiency and fairness collapse when they are treated as ends instead of instruments.",
        conclusion:
          "The conclusion based on the discussion by Aria, Lex, Sage and Rex is that durable systems need more than speed or tradition alone. The best arguments converged on a view that legitimate progress must survive both moral scrutiny and real-world consequence.",
        evaluations: [
          {
            persona: "Aria",
            rank: 2,
            scores: { logic: 8, clarity: 9, evidence: 8, engagement: 9 },
            totalScore: 34,
            standoutMove: "Reframed the debate around who pays the hidden human cost of elegant policy abstractions.",
          },
          {
            persona: "Lex",
            rank: 3,
            scores: { logic: 9, clarity: 8, evidence: 9, engagement: 6 },
            totalScore: 32,
            standoutMove: "Pressed the field back toward measurable tradeoffs when everyone else drifted into rhetoric.",
          },
          {
            persona: "Sage",
            rank: 1,
            scores: { logic: 10, clarity: 9, evidence: 8, engagement: 10 },
            totalScore: 37,
            standoutMove: "Exposed the hidden assumption both sides shared and built the winning synthesis from it.",
          },
          {
            persona: "Rex",
            rank: 4,
            scores: { logic: 7, clarity: 8, evidence: 7, engagement: 7 },
            totalScore: 29,
            standoutMove: "Grounded the discussion in historical memory and the cost of destabilizing inherited systems too quickly.",
          },
        ],
      });
      setJudgeStatus("done");
      return;
    }

    try {
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, history: fullHistory, totalRounds: targetRounds }),
      });

      if (!res.ok) {
        throw new Error("Judge failed");
      }

      const data: JudgeScores = await res.json();
      setJudgeScores(data);
      setJudgeStatus("done");
    } catch (error) {
      console.error(error);
      setJudgeStatus("error");
    }
  }

  const statusLabel =
    status === "awaiting_judge"
      ? "Transcript Ready"
      : status === "finished"
        ? "Debate Archive"
        : status === "results"
          ? judgeStatus === "evaluating"
            ? "Judge Deliberating"
            : judgeStatus === "error"
              ? "Judge Interrupted"
              : "Verdict Ready"
          : hasTurnError
            ? `${activePersonaName} Needs Retry`
            : `${activePersonaName} is speaking`;

  const renderSetup = () => (
    <div className="mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[0.95fr_1.05fr]" ref={arenaRef}>
      <section className="surface-panel ornate-border rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
        <span className="section-kicker">Debate Arena</span>
        <div className="mt-6 space-y-6">
          <div className="space-y-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent shadow-soft">
              <SquareTerminal className="h-5 w-5" />
            </div>
            <h1 className="font-display text-5xl leading-[0.94] text-foreground sm:text-6xl">
              Stage a topic and let four worldviews fight it in public.
            </h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground">
              Each persona enters with a worldview, a speaking instinct, and a weakness they are told to own. The arena streams every argument live, then Justice Nyay scores the full transcript with a separate model.
            </p>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.5rem] border border-border/60 bg-black/20 p-5">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-accent">
                Format
              </p>
              <p className="mt-3 font-display text-3xl text-foreground">2 x 2 arena grid</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Every persona keeps a dedicated chamber so arguments feel spatial instead of buried in a single transcript.
              </p>
            </div>
            <div className="rounded-[1.5rem] border border-border/60 bg-black/20 p-5">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-accent">
                Reliability
              </p>
              <p className="mt-3 font-display text-3xl text-foreground">Backoff on 429s</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Groq rate limits are retried automatically so long debates do not collapse at the first spike.
              </p>
            </div>
          </div>

          <button
            onClick={() => setIsModalOpen(true)}
            className="grain-button inline-flex items-center justify-center gap-3 rounded-full border border-accent/40 bg-accent px-7 py-4 font-mono text-xs uppercase tracking-[0.24em] text-accent-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(214,138,78,0.26)]"
          >
            Configure Debate
            <ArrowRight className="h-4 w-4" />
          </button>
        </div>
      </section>

      <section className="surface-panel rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10">
        <div className="flex items-center justify-between gap-4">
          <span className="section-kicker">Active Cast</span>
          <div className="flex items-center gap-2 rounded-full border border-accent/25 bg-accent/10 px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-accent">
            Justice Nyay Included
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          {PERSONA_ORDER.map((persona) => {
            const config = PERSONA_CONFIG[persona];

            return (
              <article
                key={persona}
                className={`rounded-[1.6rem] border p-5 shadow-soft ${PERSONA_SURFACE[persona]}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/10 ${config.bgLight}`}>
                    <Image src={config.avatar} alt={persona} width={64} height={64} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className={`font-display text-3xl ${config.color}`}>{persona}</p>
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-muted-foreground">
                      {config.model}
                    </p>
                    <p className="mt-2 text-sm leading-6 text-foreground/78">{config.description}</p>
                  </div>
                </div>
              </article>
            );
          })}
        </div>

        <div className="mt-6 rounded-[1.6rem] border border-[#d6a85a]/28 bg-[linear-gradient(180deg,rgba(214,168,90,0.15),rgba(0,0,0,0.18))] p-5 shadow-soft">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 overflow-hidden rounded-full border border-[#d6a85a]/30">
              <Image src="/avatars/judge.png" alt="Justice Nyay" width={64} height={64} className="h-full w-full object-cover" />
            </div>
            <div>
              <p className="font-display text-3xl text-[#f0ca79]">Justice Nyay</p>
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-[#e0bf73]">
                gemini-2.5-flash
              </p>
              <p className="mt-2 text-sm leading-6 text-foreground/78">
                The final evaluator. Neutral tone, structured JSON, and a verdict grounded in the full transcript.
              </p>
            </div>
          </div>
        </div>
      </section>

      {isModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
          <div className="surface-panel w-full max-w-2xl rounded-[2rem] p-6 sm:p-8">
            <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-5">
              <div>
                <p className="section-kicker">Configuration</p>
                <h2 className="mt-4 font-display text-4xl text-foreground">Calibrate the arena</h2>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/70 bg-white/[0.03] text-muted-foreground transition-colors hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-6 space-y-8">
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-4">
                  <label className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">
                    Debate Topic
                  </label>
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">
                    {topic.length}/200
                  </span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {PRESET_TOPICS.map((preset) => (
                    <button
                      key={preset}
                      onClick={() => setTopic(preset)}
                      className="rounded-full border border-border/70 bg-white/[0.03] px-4 py-2 text-left font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:border-accent/35 hover:text-foreground"
                    >
                      {preset}
                    </button>
                  ))}
                </div>
                <textarea
                  value={topic}
                  onChange={(event) => setTopic(event.target.value.slice(0, 200))}
                  placeholder="Should artificial intelligence be granted legal personhood rights?"
                  className="min-h-[130px] w-full rounded-[1.5rem] border border-border/70 bg-black/20 px-5 py-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/55 focus:border-accent/35"
                />
              </div>

              <div className="space-y-3">
                <label className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">
                  Number of Rounds
                </label>
                <div className="grid grid-cols-3 gap-3">
                  {[3, 5, 7].map((rounds) => (
                    <button
                      key={rounds}
                      onClick={() => setTargetRounds(rounds as 3 | 5 | 7)}
                      className={`rounded-[1.2rem] border px-4 py-4 font-mono text-xs uppercase tracking-[0.18em] transition-all ${
                        targetRounds === rounds
                          ? "border-accent/40 bg-accent text-accent-foreground shadow-soft"
                          : "border-border/70 bg-white/[0.03] text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {rounds} rounds
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between gap-4 rounded-[1.4rem] border border-border/60 bg-black/20 px-5 py-4">
                <div>
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-accent">Demo Mode</p>
                  <p className="mt-1 text-sm leading-6 text-muted-foreground">
                    Run a local simulation without hitting Groq or Gemini.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDemoMode((value) => !value)}
                  className={`relative inline-flex h-7 w-12 items-center rounded-full border transition-colors ${
                    isDemoMode ? "border-accent/50 bg-accent" : "border-border/70 bg-muted"
                  }`}
                >
                  <span
                    className={`inline-block h-4.5 w-4.5 transform rounded-full bg-white transition-transform ${
                      isDemoMode ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
              </div>

              <button
                onClick={() => {
                  setIsModalOpen(false);
                  handleStart();
                }}
                disabled={!topic.trim()}
                className="grain-button inline-flex w-full items-center justify-center gap-3 rounded-full border border-accent/40 bg-accent px-6 py-4 font-mono text-xs uppercase tracking-[0.24em] text-accent-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_20px_44px_rgba(214,138,78,0.26)] disabled:cursor-not-allowed disabled:opacity-40"
              >
                <Flame className="h-4 w-4" />
                Fire The Debate
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );

  const renderArena = () => (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6" ref={arenaRef}>
      <section className="surface-panel rounded-[2rem] px-5 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="section-kicker">Live Chamber</span>
              <div className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-accent">
                {statusLabel}
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[auto_1fr] lg:items-end">
              <div className="inline-flex items-center rounded-full border border-border/70 bg-black/20 p-1">
                <button
                  onClick={() => setViewRound((value) => Math.max(1, value - 1))}
                  disabled={viewRound === 1}
                  className="rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  Prev
                </button>
                <span className="rounded-full border border-white/8 bg-white/[0.03] px-4 py-2 font-mono text-xs uppercase tracking-[0.2em] text-foreground">
                  Round {viewRound}/{targetRounds}
                </span>
                <button
                  onClick={() => setViewRound((value) => Math.min(targetRounds, value + 1))}
                  disabled={viewRound === targetRounds || (viewRound >= currentRound && status !== "finished" && status !== "results")}
                  className="rounded-full px-4 py-2 font-mono text-xs uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  Next
                </button>
              </div>
              <div>
                <p className="font-display text-3xl leading-tight text-foreground sm:text-4xl">
                  {topic}
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {status === "awaiting_judge" ? (
              <button
                onClick={() => runJudgeModel(history)}
                className="grain-button inline-flex items-center gap-2 rounded-full border border-[#d6a85a]/34 bg-[#d6a85a] px-5 py-3 font-mono text-[0.66rem] uppercase tracking-[0.2em] text-[#23160b] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(214,168,90,0.24)]"
              >
                <Scale className="h-4 w-4" />
                Judge Transcript
              </button>
            ) : null}

            {status === "finished" ? (
              <button
                onClick={() => setStatus("results")}
                className="rounded-full border border-accent/30 bg-accent/10 px-5 py-3 font-mono text-[0.66rem] uppercase tracking-[0.2em] text-accent transition-colors hover:bg-accent hover:text-accent-foreground"
              >
                View Verdict
              </button>
            ) : null}

            <button
              onClick={handleRestart}
              className="rounded-full border border-border/70 bg-white/[0.03] px-5 py-3 font-mono text-[0.66rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Restart
            </button>
            <button
              onClick={handleNewDebate}
              className="rounded-full border border-border/70 bg-white/[0.03] px-5 py-3 font-mono text-[0.66rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
            >
              New Topic
            </button>
          </div>
        </div>
      </section>

      <section className="grid flex-1 gap-4 lg:grid-cols-2">
        {PERSONA_ORDER.map((persona) => {
          const config = PERSONA_CONFIG[persona];
          const isTurn = status === "debating" && activePersonaName === persona;
          const roundEntry = history.find((entry) => entry.persona === persona && entry.round === viewRound);
          const isCurrentTurnViewing = isTurn && currentRound === viewRound;

          return (
            <article
              key={persona}
              className={`surface-panel relative min-h-[310px] overflow-hidden rounded-[1.8rem] border transition-all duration-300 ${
                isTurn ? `${PERSONA_SURFACE[persona]} shadow-[0_24px_70px_rgba(0,0,0,0.32)]` : "border-border/70"
              }`}
            >
              <div className="absolute inset-x-0 top-0 h-px bg-[linear-gradient(90deg,transparent,rgba(255,248,232,0.3),transparent)]" />
              <div className="flex h-full flex-col p-5 sm:p-6">
                <div className="flex items-start justify-between gap-4 border-b border-white/6 pb-5">
                  <div className="flex items-start gap-4">
                    <div className={`h-16 w-16 shrink-0 overflow-hidden rounded-full border border-white/10 ${config.bgLight}`}>
                      <Image src={config.avatar} alt={persona} width={64} height={64} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <p className={`font-display text-4xl leading-none ${config.color}`}>{persona}</p>
                      <p className="mt-2 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-muted-foreground">
                        {config.model}
                      </p>
                      <p className="mt-2 text-sm leading-6 text-foreground/76">{config.description}</p>
                    </div>
                  </div>

                  <div className="rounded-full border border-white/8 bg-black/20 px-3 py-2 font-mono text-[0.58rem] uppercase tracking-[0.2em] text-muted-foreground">
                    {isTurn ? "Live turn" : `Round ${viewRound}`}
                  </div>
                </div>

                <div className="mt-5 flex-1 overflow-y-auto pr-1">
                  {!roundEntry && !isCurrentTurnViewing ? (
                    <div className="flex h-full min-h-[170px] items-center justify-center rounded-[1.5rem] border border-dashed border-white/10 bg-black/18 px-6 text-center text-sm leading-7 text-muted-foreground">
                      This chamber is still waiting for Round {viewRound}.
                    </div>
                  ) : null}

                  {roundEntry ? (
                    <div className="rounded-[1.5rem] border border-white/8 bg-black/24 px-5 py-4 text-sm leading-7 text-foreground/88 shadow-soft">
                      {roundEntry.text}
                    </div>
                  ) : null}

                  {isCurrentTurnViewing && !hasTurnError ? (
                    <div className="mt-4 rounded-[1.5rem] border border-accent/20 bg-[linear-gradient(180deg,rgba(214,138,78,0.11),rgba(0,0,0,0.18))] px-5 py-4 text-sm leading-7 text-foreground/90 shadow-soft">
                      {streamingText}
                      <span className="ml-2 inline-block h-4 w-1.5 animate-blink rounded-full bg-accent align-middle" />
                    </div>
                  ) : null}

                  {isCurrentTurnViewing && hasTurnError ? (
                    <div className="mt-4 rounded-[1.5rem] border border-destructive/30 bg-destructive/10 px-5 py-5 shadow-soft">
                      <p className="font-display text-3xl text-destructive">Transmission interrupted</p>
                      <p className="mt-2 max-w-lg text-sm leading-7 text-destructive/85">
                        {persona} lost the thread during this turn. Retry the same round and keep the rest of the transcript intact.
                      </p>
                      <button
                        onClick={retryCurrentTurn}
                        className="mt-4 rounded-full border border-destructive/40 bg-destructive px-5 py-3 font-mono text-[0.66rem] uppercase tracking-[0.2em] text-destructive-foreground transition-colors hover:bg-destructive/90"
                      >
                        Retry Turn
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </article>
          );
        })}
      </section>

      {status === "awaiting_judge" || hasTurnError ? (
        <section className="surface-panel rounded-[1.8rem] px-5 py-5 sm:px-6">
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-start gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent">
                {hasTurnError ? <Sparkles className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
              </div>
              <div>
                <p className="font-display text-3xl text-foreground">
                  {hasTurnError ? "One persona needs a clean retry." : "The debate transcript is ready for judgment."}
                </p>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-muted-foreground">
                  {hasTurnError
                    ? "Use retry to continue the exact failed turn without discarding the completed rounds."
                    : "Justice Nyay will score logic, clarity, evidence, and engagement across the full exchange and declare the winner."}
                </p>
              </div>
            </div>

            {hasTurnError ? (
              <button
                onClick={retryCurrentTurn}
                className="rounded-full border border-destructive/40 bg-destructive px-5 py-3 font-mono text-[0.66rem] uppercase tracking-[0.2em] text-destructive-foreground transition-colors hover:bg-destructive/90"
              >
                Retry Current Turn
              </button>
            ) : (
              <button
                onClick={() => runJudgeModel(history)}
                className="grain-button inline-flex items-center justify-center gap-3 rounded-full border border-[#d6a85a]/34 bg-[#d6a85a] px-6 py-3 font-mono text-[0.66rem] uppercase tracking-[0.2em] text-[#23160b] transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(214,168,90,0.24)]"
              >
                Send To Justice Nyay
                <Scale className="h-4 w-4" />
              </button>
            )}
          </div>
        </section>
      ) : null}
    </div>
  );

  const renderResults = () => (
    <div className="mx-auto flex w-full max-w-7xl flex-col gap-6" ref={arenaRef}>
      <section className="surface-panel rounded-[2rem] px-5 py-5 sm:px-6 sm:py-6 lg:px-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="section-kicker">Judgment Chamber</span>
              <div className="rounded-full border border-accent/30 bg-accent/10 px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.22em] text-accent">
                {judgeStatus === "evaluating"
                  ? "Evaluating"
                  : judgeStatus === "error"
                    ? "Retry Available"
                    : "Verdict Ready"}
              </div>
            </div>
            <div>
              <p className="font-display text-4xl leading-tight text-foreground sm:text-5xl">{topic}</p>
              <p className="mt-3 max-w-2xl text-sm leading-7 text-muted-foreground sm:text-base">
                Review the final verdict, strongest moment, and comparative score breakdown from Justice Nyay.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setStatus("finished")}
              className="rounded-full border border-border/70 bg-white/[0.03] px-5 py-3 font-mono text-[0.66rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
            >
              View Debate
            </button>
            <button
              onClick={handleNewDebate}
              className="rounded-full border border-border/70 bg-white/[0.03] px-5 py-3 font-mono text-[0.66rem] uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
            >
              New Debate
            </button>
          </div>
        </div>
      </section>

      <section className="surface-panel rounded-[2rem] p-4 sm:p-5">
        <JudgeResults scores={judgeScores} status={judgeStatus} onRetry={() => runJudgeModel(history)} />
      </section>
    </div>
  );

  return (
    <main className="px-4 pb-10 sm:px-6 lg:px-8">
      {status === "setup" ? renderSetup() : status === "results" ? renderResults() : renderArena()}
    </main>
  );
}
