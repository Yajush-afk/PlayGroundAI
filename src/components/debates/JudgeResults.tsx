import { useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion } from "motion/react";
import { ChevronLeft, ChevronRight, Menu, Scale } from "lucide-react";
import { Persona, PERSONA_CONFIG } from "./PersonaCard";

export interface Evaluation {
  persona: Persona;
  scores: {
    logic: number;
    clarity: number;
    evidence: number;
    engagement: number;
  };
  totalScore: number;
  rank: number;
  standoutMove: string;
}

export interface JudgeScores {
  summary: string;
  winner: string;
  strongestMoment: string;
  conclusion: string;
  evaluations: Evaluation[];
}

interface JudgeResultsProps {
  scores: JudgeScores | null;
  status: "idle" | "evaluating" | "done" | "error";
  onRetry?: () => void;
}

function ScoreBar({ label, score, colorClass }: { label: string; score: number; colorClass: string }) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">{label}</span>
        <span className="font-display text-2xl text-foreground">{score}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${score * 10}%` }}
          transition={{ duration: 0.6, ease: "easeOut" }}
          className={`h-full rounded-full ${colorClass}`}
        />
      </div>
    </div>
  );
}

export function JudgeResults({ scores, status, onRetry }: JudgeResultsProps) {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const sortedEvals = useMemo(() => {
    if (!scores?.evaluations) return [];
    return [...scores.evaluations].sort((a, b) => a.rank - b.rank);
  }, [scores]);

  if (status === "idle") return null;

  if (status === "evaluating") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-[420px] items-center justify-center border-t border-white/8 px-6 py-10"
      >
        <div className="flex max-w-lg flex-col items-center text-center">
          <div className="h-24 w-24 overflow-hidden rounded-full border border-white/10 bg-secondary">
            <Image src="/avatars/judge.png" alt="Justice Nyay" width={96} height={96} className="h-full w-full object-cover" />
          </div>
          <p className="mt-8 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">
            Judge Deliberating
          </p>
          <h3 className="mt-3 font-display text-5xl text-foreground">Scoring the transcript</h3>
          <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
            Logic, clarity, evidence, and engagement are being weighed across every completed round.
          </p>
        </div>
      </motion.div>
    );
  }

  if (status === "error") {
    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex min-h-[360px] items-center justify-center border-t border-destructive/25 bg-destructive/10 px-6 py-10"
      >
        <div className="max-w-xl text-center">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-destructive/85">Judge Interrupted</p>
          <h3 className="mt-3 font-display text-5xl text-destructive">The scoring pass failed.</h3>
          <p className="mt-4 text-sm leading-7 text-destructive/85 sm:text-base">
            The transcript is still available. Retry and PlayGroundAI will send the exact same debate back to the judge.
          </p>
          <button
            onClick={onRetry}
            className="mt-6 rounded-full border border-destructive/40 bg-destructive px-5 py-3 font-mono text-[0.66rem] uppercase tracking-[0.2em] text-destructive-foreground transition-colors hover:bg-destructive/90"
          >
            Retry Judgment
          </button>
        </div>
      </motion.div>
    );
  }

  if (status === "done" && scores) {
    if (sortedEvals.length === 0) return null;

    const currentEval = sortedEvals[activeIndex];
    const personaConfig = PERSONA_CONFIG[currentEval.persona];
    const winnerConfig = PERSONA_CONFIG[scores.winner as Persona];

    const getBgColor = (persona: Persona) => {
      switch (persona) {
        case "Aria":
          return "bg-purple-500";
        case "Lex":
          return "bg-blue-500";
        case "Sage":
          return "bg-green-500";
        case "Rex":
          return "bg-red-500";
        default:
          return "bg-primary";
      }
    };

    return (
      <motion.div
        initial={{ opacity: 0, y: 18 }}
        animate={{ opacity: 1, y: 0 }}
        className="grid min-h-[560px] gap-8 lg:grid-cols-[1.05fr_0.95fr]"
      >
        <section className="border-b border-white/8 pb-8 sm:pb-10 lg:border-b-0 lg:border-r lg:pr-8">
          <div className="flex items-start justify-between gap-4 border-b border-white/6 pb-6">
            <div>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">Final Verdict</p>
              <h2 className="mt-3 font-display text-5xl text-foreground">Justice Nyay</h2>
            </div>
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground/80">
              <Scale className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div className="pb-5 border-b border-white/6">
              <p className="text-sm leading-7 text-foreground/85 sm:text-base">{scores.summary}</p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="border-b border-white/6 pb-5 xl:border-b-0 xl:border-r xl:pr-5">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">Strongest Moment</p>
                <p className="mt-3 text-sm leading-7 text-foreground/78">{scores.strongestMoment}</p>
              </div>
              <div className="pb-5 xl:pl-1">
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">Conclusion</p>
                <p className="mt-3 text-sm leading-7 text-foreground/78">{scores.conclusion}</p>
              </div>
            </div>

            <div className="border-t border-white/6 pt-5">
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">Winner</p>
              <div className="mt-4 flex items-center gap-4">
                <div className={`h-14 w-14 overflow-hidden rounded-full ${winnerConfig?.bgLight ?? "bg-secondary"}`}>
                  {winnerConfig ? <Image src={winnerConfig.avatar} alt={scores.winner} width={56} height={56} className="h-full w-full object-cover" /> : null}
                </div>
                <p className={`font-display text-5xl ${winnerConfig?.color ?? "text-foreground"}`}>{scores.winner}</p>
              </div>
            </div>
          </div>
        </section>

        <section className="lg:pl-2">
          <div className="flex items-center justify-between gap-4 border-b border-white/6 pb-6">
            <div>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">Score View</p>
              <h3 className={`mt-3 font-display text-5xl ${personaConfig.color}`}>{currentEval.persona}</h3>
            </div>
            <div className={`h-14 w-14 overflow-hidden rounded-full ${personaConfig.bgLight}`}>
              <Image src={personaConfig.avatar} alt={currentEval.persona} width={56} height={56} className="h-full w-full object-cover" />
            </div>
          </div>

          <AnimatePresence mode="wait">
            <motion.div
              key={currentEval.persona}
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -14 }}
              transition={{ duration: 0.25 }}
              className="mt-6 space-y-5"
            >
              <div className="grid grid-cols-2 gap-4">
                <div className="border-b border-white/6 pb-4">
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">Rank</p>
                  <p className="mt-2 font-display text-4xl text-foreground">#{currentEval.rank}</p>
                </div>
                <div className="border-b border-white/6 pb-4 text-right">
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">Total</p>
                  <p className="mt-2 font-display text-4xl text-foreground">{currentEval.totalScore}/40</p>
                </div>
              </div>

              <div className="space-y-4 border-b border-white/6 pb-5">
                <ScoreBar label="Logic" score={currentEval.scores.logic} colorClass={getBgColor(currentEval.persona)} />
                <ScoreBar label="Clarity" score={currentEval.scores.clarity} colorClass={getBgColor(currentEval.persona)} />
                <ScoreBar label="Evidence" score={currentEval.scores.evidence} colorClass={getBgColor(currentEval.persona)} />
                <ScoreBar label="Engagement" score={currentEval.scores.engagement} colorClass={getBgColor(currentEval.persona)} />
              </div>

              <div>
                <p className="font-mono text-[0.6rem] uppercase tracking-[0.18em] text-muted-foreground">Standout Move</p>
                <p className="mt-3 text-sm leading-7 text-foreground/78">{currentEval.standoutMove}</p>
              </div>
            </motion.div>
          </AnimatePresence>

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/6 pt-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveIndex((prev) => (prev === 0 ? sortedEvals.length - 1 : prev - 1))}
                className="rounded-full border border-white/8 bg-white/5 p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setActiveIndex((prev) => (prev === sortedEvals.length - 1 ? 0 : prev + 1))}
                className="rounded-full border border-white/8 bg-white/5 p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-3 py-2">
              {sortedEvals.map((_, index) => (
                <span key={index} className={`h-1.5 w-1.5 rounded-full ${index === activeIndex ? "bg-primary" : "bg-white/20"}`} />
              ))}
            </div>

            <div className="relative">
              <button
                onClick={() => setIsMenuOpen((open) => !open)}
                className="rounded-full border border-white/8 bg-white/5 p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Menu className="h-4 w-4" />
              </button>

              {isMenuOpen ? (
                <div className="absolute bottom-[calc(100%+0.75rem)] right-0 w-52 overflow-hidden rounded-[1.2rem] border border-white/8 bg-card/95 shadow-panel backdrop-blur-xl">
                  {sortedEvals.map((evaluation, index) => {
                    const config = PERSONA_CONFIG[evaluation.persona];

                    return (
                      <button
                        key={evaluation.persona}
                        onClick={() => {
                          setActiveIndex(index);
                          setIsMenuOpen(false);
                        }}
                        className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                          index === activeIndex ? "bg-white/8 text-foreground" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                        }`}
                      >
                        <Image src={config.avatar} alt={evaluation.persona} width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
                        <div>
                          <p className="font-display text-2xl leading-none">{evaluation.persona}</p>
                          <p className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground">Rank #{evaluation.rank}</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </motion.div>
    );
  }

  return null;
}
