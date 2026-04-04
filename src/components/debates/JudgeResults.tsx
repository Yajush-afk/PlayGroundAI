import { useMemo, useState } from "react";
import Image from "next/image";
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
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground">
          {label}
        </span>
        <span className="font-display text-2xl text-foreground">{score}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
        <div className={`h-full rounded-full transition-all duration-700 ${colorClass}`} style={{ width: `${score * 10}%` }} />
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
      <div className="flex min-h-[520px] items-center justify-center rounded-[1.7rem] border border-[#d6a85a]/22 bg-[radial-gradient(circle_at_top,rgba(214,168,90,0.14),transparent_48%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.12))] px-6 py-10">
        <div className="flex max-w-xl flex-col items-center text-center">
          <div className="h-24 w-24 overflow-hidden rounded-full border border-[#d6a85a]/30 shadow-[0_0_36px_rgba(214,168,90,0.14)]">
            <Image src="/avatars/judge.png" alt="Justice Nyay" width={96} height={96} className="h-full w-full object-cover" />
          </div>
          <p className="mt-8 font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#e0bf73]">
            Justice Nyay Deliberating
          </p>
          <h3 className="mt-3 font-display text-5xl leading-none text-foreground">Scoring the full transcript</h3>
          <p className="mt-4 text-sm leading-7 text-muted-foreground sm:text-base">
            The judge is balancing logic, clarity, evidence, and engagement across every round before issuing a final verdict.
          </p>
        </div>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="flex min-h-[420px] items-center justify-center rounded-[1.7rem] border border-destructive/25 bg-destructive/10 px-6 py-10">
        <div className="max-w-xl text-center">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-destructive/85">
            Judgment Interrupted
          </p>
          <h3 className="mt-3 font-display text-5xl leading-none text-destructive">The judge lost the thread.</h3>
          <p className="mt-4 text-sm leading-7 text-destructive/85 sm:text-base">
            The debate transcript is still intact. Retry the scoring pass and PlayGroundAI will send the same transcript back through the judge.
          </p>
          <button
            onClick={onRetry}
            className="mt-6 rounded-full border border-destructive/40 bg-destructive px-5 py-3 font-mono text-[0.66rem] uppercase tracking-[0.22em] text-destructive-foreground transition-colors hover:bg-destructive/90"
          >
            Retry Judgment
          </button>
        </div>
      </div>
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
          return "bg-[#b67de6]";
        case "Lex":
          return "bg-[#72b7ee]";
        case "Sage":
          return "bg-[#7ed39e]";
        case "Rex":
          return "bg-[#ef9177]";
        default:
          return "bg-accent";
      }
    };

    return (
      <div className="grid min-h-[620px] gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-[1.7rem] border border-[#d6a85a]/18 bg-[radial-gradient(circle_at_top,rgba(214,168,90,0.12),transparent_40%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.14))] p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4 border-b border-white/6 pb-6">
            <div>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-[#e0bf73]">
                Final Verdict
              </p>
              <h2 className="mt-3 font-display text-5xl leading-none text-foreground">Justice Nyay speaks</h2>
            </div>
            <div className="flex h-14 w-14 items-center justify-center rounded-full border border-[#d6a85a]/30 bg-[#d6a85a]/10 text-[#f0ca79]">
              <Scale className="h-5 w-5" />
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div className="rounded-[1.5rem] border border-white/8 bg-black/18 p-5 shadow-soft">
              <p className="text-sm leading-7 text-foreground/84 sm:text-base">{scores.summary}</p>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[1.4rem] border border-border/60 bg-black/18 p-5">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
                  Strongest Moment
                </p>
                <p className="mt-3 font-display text-3xl text-foreground">A decisive turn</p>
                <p className="mt-3 text-sm leading-7 text-foreground/76">{scores.strongestMoment}</p>
              </div>
              <div className="rounded-[1.4rem] border border-border/60 bg-black/18 p-5">
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
                  Conclusion
                </p>
                <p className="mt-3 font-display text-3xl text-foreground">Emergent truth</p>
                <p className="mt-3 text-sm leading-7 text-foreground/76">{scores.conclusion}</p>
              </div>
            </div>

            <div className="rounded-[1.5rem] border border-accent/24 bg-accent/10 p-5 shadow-soft">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-accent">Overall Winner</p>
              <div className="mt-4 flex items-center gap-4">
                <div className={`h-16 w-16 overflow-hidden rounded-full border border-white/10 ${winnerConfig?.bgLight ?? ""}`}>
                  {winnerConfig ? (
                    <Image src={winnerConfig.avatar} alt={scores.winner} width={64} height={64} className="h-full w-full object-cover" />
                  ) : null}
                </div>
                <div>
                  <p className={`font-display text-5xl leading-none ${winnerConfig?.color ?? "text-foreground"}`}>
                    {scores.winner}
                  </p>
                  <p className="mt-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
                    Highest composite score
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-[1.7rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.03),rgba(0,0,0,0.14))] p-6 sm:p-7">
          <div className="flex items-start justify-between gap-4 border-b border-white/6 pb-6">
            <div>
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">
                Score Carousel
              </p>
              <h3 className={`mt-3 font-display text-5xl leading-none ${personaConfig.color}`}>{currentEval.persona}</h3>
            </div>
            <div className={`h-16 w-16 overflow-hidden rounded-full border border-white/10 ${personaConfig.bgLight}`}>
              <Image src={personaConfig.avatar} alt={currentEval.persona} width={64} height={64} className="h-full w-full object-cover" />
            </div>
          </div>

          <div className="mt-6 space-y-5">
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-[1.2rem] border border-border/60 bg-black/18 p-4">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">Rank</p>
                <p className="mt-2 font-display text-4xl text-foreground">#{currentEval.rank}</p>
              </div>
              <div className="rounded-[1.2rem] border border-border/60 bg-black/18 p-4">
                <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">Total</p>
                <p className="mt-2 font-display text-4xl text-foreground">{currentEval.totalScore}/40</p>
              </div>
            </div>

            <div className="space-y-4 rounded-[1.4rem] border border-border/60 bg-black/18 p-5">
              <ScoreBar label="Logic" score={currentEval.scores.logic} colorClass={getBgColor(currentEval.persona)} />
              <ScoreBar label="Clarity" score={currentEval.scores.clarity} colorClass={getBgColor(currentEval.persona)} />
              <ScoreBar label="Evidence" score={currentEval.scores.evidence} colorClass={getBgColor(currentEval.persona)} />
              <ScoreBar label="Engagement" score={currentEval.scores.engagement} colorClass={getBgColor(currentEval.persona)} />
            </div>

            <div className="rounded-[1.4rem] border border-border/60 bg-black/18 p-5">
              <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-muted-foreground">
                Standout Move
              </p>
              <p className="mt-3 text-sm leading-7 text-foreground/78">{currentEval.standoutMove}</p>
            </div>
          </div>

          <div className="mt-6 flex items-center justify-between gap-4 border-t border-white/6 pt-6">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveIndex((prev) => (prev === 0 ? sortedEvals.length - 1 : prev - 1))}
                className="rounded-full border border-border/70 bg-white/[0.03] p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button
                onClick={() => setActiveIndex((prev) => (prev === sortedEvals.length - 1 ? 0 : prev + 1))}
                className="rounded-full border border-border/70 bg-white/[0.03] p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 rounded-full border border-border/60 bg-black/18 px-3 py-2">
              {sortedEvals.map((_, index) => (
                <span
                  key={index}
                  className={`h-1.5 w-1.5 rounded-full ${index === activeIndex ? "bg-accent" : "bg-white/16"}`}
                />
              ))}
            </div>

            <div className="relative">
              <button
                onClick={() => setIsMenuOpen((open) => !open)}
                className="rounded-full border border-border/70 bg-white/[0.03] p-2 text-muted-foreground transition-colors hover:text-foreground"
              >
                <Menu className="h-4 w-4" />
              </button>

              {isMenuOpen ? (
                <div className="absolute bottom-[calc(100%+0.75rem)] right-0 w-52 overflow-hidden rounded-[1.2rem] border border-border/60 bg-card/95 shadow-panel backdrop-blur-xl">
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
                          index === activeIndex ? "bg-white/[0.05] text-foreground" : "text-muted-foreground hover:bg-white/[0.03] hover:text-foreground"
                        }`}
                      >
                        <Image src={config.avatar} alt={evaluation.persona} width={32} height={32} className="h-8 w-8 rounded-full object-cover" />
                        <div>
                          <p className="font-display text-2xl leading-none text-inherit">{evaluation.persona}</p>
                          <p className="mt-1 font-mono text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground">
                            Rank #{evaluation.rank}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}
            </div>
          </div>
        </section>
      </div>
    );
  }

  return null;
}
