"use client";

import { useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { Flame, RotateCcw, Scale, Sparkles, SquareTerminal, Trophy } from "lucide-react";
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

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0 },
};

export default function DebatesPage() {
  const [topic, setTopic] = useState("");
  const [targetRounds, setTargetRounds] = useState<3 | 5 | 7>(3);
  const [status, setStatus] = useState<DebateStatus>("setup");
  const [isDemoMode, setIsDemoMode] = useState(false);

  const [currentRound, setCurrentRound] = useState(1);
  const [viewRound, setViewRound] = useState(1);
  const [activePersonaIdx, setActivePersonaIdx] = useState(0);
  const [history, setHistory] = useState<ResponseLog[]>([]);
  const [streamingText, setStreamingText] = useState("");
  const [hasTurnError, setHasTurnError] = useState(false);

  const [judgeStatus, setJudgeStatus] = useState<"idle" | "evaluating" | "done" | "error">("idle");
  const [judgeScores, setJudgeScores] = useState<JudgeScores | null>(null);

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

  const handleStart = () => {
    if (!topic.trim()) return;
    resetForNewRun();
    setStatus("debating");
    startNextTurn(1, 0, []);
  };

  const handleRestart = () => {
    resetForNewRun();
    setStatus("debating");
    startNextTurn(1, 0, []);
  };

  const handleNewDebate = () => {
    setTopic("");
    resetForNewRun();
    setStatus("setup");
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

      const newHistory = [...currentHistory, { persona, text: demoResponse, round }];
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
        await sleep(BACKOFF_MS[attempt]);
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

  const runJudgeModel = async (fullHistory: ResponseLog[]) => {
    setJudgeStatus("evaluating");
    setStatus("results");

    const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

    if (isDemoMode) {
      await sleep(1800);
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
  };

  const renderSetup = () => (
    <motion.section
      initial="hidden"
      animate="show"
      variants={fadeUp}
      transition={{ duration: 0.55, ease: "easeOut" }}
      className="grid gap-8 lg:grid-cols-[1fr_0.9fr]"
    >
      <div className="border-b border-white/8 pb-8 sm:pb-10 lg:border-b-0 lg:border-r lg:pr-10">
        <span className="section-kicker">Debate Arena</span>
        <div className="mt-6 space-y-6">
          <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground/80">
            <SquareTerminal className="h-5 w-5" />
          </div>
          <div className="space-y-4">
            <h1 className="font-display text-5xl leading-[0.92] text-foreground sm:text-6xl">
              Choose a topic and let the arena run.
            </h1>
            <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
              Four personas debate in sequence, their responses stream live, and Justice Nyay judges the full exchange when the final round is complete.
            </p>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <label className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">Topic</label>
              <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">{topic.length}/200</span>
            </div>

            <div className="flex flex-wrap gap-2">
              {PRESET_TOPICS.map((preset) => (
                <button
                  key={preset}
                  onClick={() => setTopic(preset)}
                  className="rounded-full border border-white/8 bg-white/5 px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground"
                >
                  {preset}
                </button>
              ))}
            </div>

            <textarea
              value={topic}
              onChange={(event) => setTopic(event.target.value.slice(0, 200))}
              placeholder="Should artificial intelligence be granted legal personhood rights?"
              className="min-h-[140px] w-full border-y border-white/8 bg-transparent px-0 py-4 text-base text-foreground outline-none transition-colors placeholder:text-muted-foreground/60 focus:border-white/14"
            />
          </div>

          <div className="grid gap-4 sm:grid-cols-[1fr_auto] sm:items-end">
            <div className="space-y-3">
              <label className="font-mono text-[0.62rem] uppercase tracking-[0.2em] text-muted-foreground">Rounds</label>
                <div className="grid grid-cols-3 gap-3">
                  {[3, 5, 7].map((rounds) => (
                    <button
                      key={rounds}
                      onClick={() => setTargetRounds(rounds as 3 | 5 | 7)}
                      className={`border-b px-4 py-3 font-mono text-xs uppercase tracking-[0.16em] transition-all ${
                        targetRounds === rounds
                          ? "border-white/20 text-foreground"
                          : "border-white/8 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      {rounds}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-3 border-b border-white/8 px-0 py-3">
              <div>
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">Demo Mode</p>
              </div>
              <button
                type="button"
                onClick={() => setIsDemoMode((value) => !value)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${isDemoMode ? "bg-primary" : "bg-muted"}`}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDemoMode ? "translate-x-6" : "translate-x-1"}`} />
              </button>
            </div>
          </div>

          <button
            onClick={handleStart}
            disabled={!topic.trim()}
            className="grain-button inline-flex w-full items-center justify-center gap-3 rounded-full bg-primary px-7 py-4 font-mono text-xs uppercase tracking-[0.2em] text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Flame className="h-4 w-4" />
            Start Debate
          </button>
        </div>
      </div>

      <motion.div variants={fadeUp} transition={{ delay: 0.08, duration: 0.55 }} className="pt-2 lg:pl-2">
        <span className="section-kicker">Cast</span>
        <div className="mt-6 grid gap-0 sm:grid-cols-2 sm:divide-x sm:divide-white/8">
          {PERSONA_ORDER.map((persona, index) => {
            const config = PERSONA_CONFIG[persona];
            return (
              <motion.div
                key={persona}
                initial={{ opacity: 0, y: 18 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + index * 0.06, duration: 0.45, ease: "easeOut" }}
                className={`border-b border-white/8 p-4 ${index >= 2 ? "sm:border-b-0" : ""}`}
              >
                <div className="flex items-start gap-4">
                  <div className={`h-14 w-14 overflow-hidden rounded-full ${config.bgLight}`}>
                    <Image src={config.avatar} alt={persona} width={56} height={56} className="h-full w-full object-cover" />
                  </div>
                  <div>
                    <p className={`font-display text-3xl ${config.color}`}>{persona}</p>
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">{config.model}</p>
                    <p className="mt-2 text-sm leading-6 text-muted-foreground">{config.description}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </motion.div>
    </motion.section>
  );

  const renderArena = () => (
    <div className="space-y-6">
      <motion.section
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="border-b border-white/8 px-0 py-5 sm:py-6"
      >
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <span className="section-kicker">Active Debate</span>
              <div className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">
                {status === "awaiting_judge"
                  ? "Awaiting Judge"
                  : status === "finished"
                    ? "Transcript Complete"
                    : hasTurnError
                      ? `${activePersonaName} needs retry`
                      : `${activePersonaName} speaking`}
              </div>
            </div>
            <div className="space-y-3">
              <div className="inline-flex items-center rounded-full border border-white/8 bg-white/5 p-1">
                <button
                  onClick={() => setViewRound((value) => Math.max(1, value - 1))}
                  disabled={viewRound === 1}
                  className="rounded-full px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  Prev
                </button>
                <span className="rounded-full bg-white/8 px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-foreground">
                  Round {viewRound}/{targetRounds}
                </span>
                <button
                  onClick={() => setViewRound((value) => Math.min(targetRounds, value + 1))}
                  disabled={viewRound === targetRounds || (viewRound >= currentRound && status !== "finished" && status !== "results")}
                  className="rounded-full px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground transition-colors hover:text-foreground disabled:opacity-30"
                >
                  Next
                </button>
              </div>
              <h1 className="font-display text-4xl leading-tight text-foreground sm:text-5xl">{topic}</h1>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {status === "finished" ? (
              <button
                onClick={() => setStatus("results")}
                className="rounded-full border border-white/8 bg-white/5 px-5 py-3 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-foreground transition-colors hover:bg-white/8"
              >
                View Verdict
              </button>
            ) : null}
            <button
              onClick={handleRestart}
              className="inline-flex items-center gap-2 rounded-full border border-white/8 bg-white/5 px-5 py-3 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Restart
            </button>
            <button
              onClick={handleNewDebate}
              className="rounded-full border border-white/8 bg-white/5 px-5 py-3 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              New Topic
            </button>
          </div>
        </div>
      </motion.section>

      <section className="overflow-hidden border-y border-white/8 lg:grid lg:grid-cols-2 lg:divide-x lg:divide-white/8">
        {PERSONA_ORDER.map((persona, index) => {
          const config = PERSONA_CONFIG[persona];
          const roundEntry = history.find((entry) => entry.persona === persona && entry.round === viewRound);
          const isTurn = status === "debating" && activePersonaName === persona;
          const isCurrentTurnViewing = isTurn && currentRound === viewRound;

          return (
            <motion.article
              key={persona}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0, scale: isTurn ? 1.01 : 1 }}
              transition={{ delay: index * 0.05, duration: 0.35, ease: "easeOut" }}
              className={`min-h-[300px] border-b border-white/8 p-5 sm:p-6 lg:border-b-0 ${isTurn ? `bg-white/[0.03]` : ""}`}
            >
              <div className="flex h-full flex-col">
                <div className="flex items-start justify-between gap-4 border-b border-white/6 pb-5">
                  <div className="flex items-start gap-4">
                    <div className={`h-14 w-14 overflow-hidden rounded-full ${config.bgLight}`}>
                      <Image src={config.avatar} alt={persona} width={56} height={56} className="h-full w-full object-cover" />
                    </div>
                    <div>
                      <p className={`font-display text-3xl ${config.color}`}>{persona}</p>
                      <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">{config.model}</p>
                    </div>
                  </div>
                  <div className="rounded-full border border-white/8 bg-white/5 px-3 py-1.5 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">
                    {isTurn ? "Live" : `Round ${viewRound}`}
                  </div>
                </div>

                <div className="mt-5 flex-1 overflow-y-auto pr-1">
                  <AnimatePresence mode="wait">
                    {!roundEntry && !isCurrentTurnViewing ? (
                      <motion.div
                        key="empty"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex h-full min-h-[170px] items-center justify-center px-0 text-center text-sm leading-7 text-muted-foreground"
                      >
                        Waiting for {persona} in Round {viewRound}.
                      </motion.div>
                    ) : null}

                    {roundEntry ? (
                      <motion.div
                        key={`history-${persona}-${viewRound}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="px-0 py-1 text-sm leading-7 text-foreground/88"
                      >
                        {roundEntry.text}
                      </motion.div>
                    ) : null}

                    {isCurrentTurnViewing && !hasTurnError ? (
                      <motion.div
                        key={`stream-${persona}-${viewRound}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="mt-4 border-t border-white/8 px-0 pt-4 text-sm leading-7 text-foreground/88"
                      >
                        {streamingText}
                        <span className="ml-2 inline-block h-4 w-1.5 animate-blink rounded-full bg-foreground/70 align-middle" />
                      </motion.div>
                    ) : null}

                    {isCurrentTurnViewing && hasTurnError ? (
                      <motion.div
                        key={`error-${persona}-${viewRound}`}
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -12 }}
                        className="mt-4 border-t border-destructive/25 bg-destructive/10 px-4 py-5"
                      >
                        <p className="font-display text-3xl text-destructive">Turn failed</p>
                        <p className="mt-2 text-sm leading-7 text-destructive/85">
                          Retry this round and keep the rest of the transcript intact.
                        </p>
                        <button
                          onClick={retryCurrentTurn}
                          className="mt-4 rounded-full border border-destructive/40 bg-destructive px-5 py-3 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-destructive-foreground transition-colors hover:bg-destructive/90"
                        >
                          Retry Turn
                        </button>
                      </motion.div>
                    ) : null}
                  </AnimatePresence>
                </div>
              </div>
            </motion.article>
          );
        })}
      </section>

      <AnimatePresence>
        {status === "awaiting_judge" || hasTurnError ? (
          <motion.section
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 18 }}
            className="border-t border-white/8 px-0 py-5 sm:py-6"
          >
            <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex items-start gap-4">
                <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground/80">
                  {hasTurnError ? <Sparkles className="h-5 w-5" /> : <Trophy className="h-5 w-5" />}
                </div>
                <div>
                  <p className="font-display text-3xl text-foreground">
                    {hasTurnError ? "One turn needs a retry." : "The transcript is ready for judgment."}
                  </p>
                  <p className="mt-2 text-sm leading-7 text-muted-foreground">
                    {hasTurnError
                      ? "Use retry to continue the failed turn without discarding finished rounds."
                      : "Send the completed debate to Justice Nyay for the final score and verdict."}
                  </p>
                </div>
              </div>

              {hasTurnError ? (
                <button
                  onClick={retryCurrentTurn}
                  className="rounded-full border border-destructive/40 bg-destructive px-5 py-3 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-destructive-foreground transition-colors hover:bg-destructive/90"
                >
                  Retry Current Turn
                </button>
              ) : (
                <button
                  onClick={() => runJudgeModel(history)}
                  className="grain-button inline-flex items-center gap-3 rounded-full bg-primary px-6 py-3 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
                >
                  Send To Judge
                  <Scale className="h-4 w-4" />
                </button>
              )}
            </div>
          </motion.section>
        ) : null}
      </AnimatePresence>
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
              onClick={() => setStatus("finished")}
              className="rounded-full border border-white/8 bg-white/5 px-5 py-3 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              View Debate
            </button>
            <button
              onClick={handleNewDebate}
              className="rounded-full border border-white/8 bg-white/5 px-5 py-3 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
            >
              New Debate
            </button>
          </div>
        </div>
      </div>

      <JudgeResults scores={judgeScores} status={judgeStatus} onRetry={() => runJudgeModel(history)} />
    </motion.section>
  );

  return (
    <main className="px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl">
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
