import { Trophy } from "lucide-react";

export interface JudgeScores {
  logic: number;
  clarity: number;
  evidence: number;
  engagement: number;
  summary: string;
  winner: string;
}

interface JudgeResultsProps {
  scores: JudgeScores | null;
  status: "idle" | "evaluating" | "done" | "error";
  onRetry?: () => void;
}

function ScoreBar({ label, score }: { label: string; score: number }) {
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{score}/10</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full bg-yellow-500/80 transition-all duration-1000 ease-out"
          style={{ width: `${(score / 10) * 100}%` }}
        />
      </div>
    </div>
  );
}

export function JudgeResults({ scores, status, onRetry }: JudgeResultsProps) {
  if (status === "idle") return null;

  return (
    <div className="mt-8 overflow-hidden rounded-2xl border border-yellow-500/20 bg-gradient-to-br from-yellow-500/5 to-transparent relative shadow-[0_0_15px_rgba(234,179,8,0.05)]">
      <div className="p-6 sm:p-8">
        <div className="flex items-center gap-3 mb-6">
          <div className="p-2.5 rounded-xl bg-yellow-500/10 text-yellow-500">
            <Trophy className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold bg-gradient-to-r from-yellow-500 to-amber-300 bg-clip-text text-transparent">
              Judge Verdict
            </h2>
            {status === "evaluating" && <p className="text-sm text-muted-foreground animate-pulse">Evaluating transcripts...</p>}
            {status === "error" && <p className="text-sm text-destructive mt-1">Judge deliberation failed.</p>}
          </div>
        </div>

        {status === "evaluating" && (
          <div className="h-32 flex items-center justify-center">
            <span className="text-muted-foreground text-sm flex gap-1">
              Analyzing arguments <span className="animate-bounce">.</span><span className="animate-bounce delay-100">.</span><span className="animate-bounce delay-200">.</span>
            </span>
          </div>
        )}

        {status === "error" && (
          <div className="h-24 flex items-center justify-center">
             <button
              onClick={onRetry}
              className="rounded-full bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive hover:bg-destructive/20 transition-colors"
            >
              Retry Scoring
            </button>
          </div>
        )}

        {status === "done" && scores && (
          <div className="grid gap-8 md:grid-cols-[1fr_250px] animate-in slide-in-from-bottom-4 duration-700">
            <div className="space-y-4">
              <h3 className="text-lg font-semibold border-b border-border/50 pb-2">Debate Summary</h3>
              <p className="text-muted-foreground leading-relaxed text-sm">
                {scores.summary}
              </p>
            </div>
            
            <div className="space-y-6">
              <div className="space-y-4 rounded-xl bg-background/50 p-4 border border-border/50">
                <ScoreBar label="Logic & Reasoning" score={scores.logic} />
                <ScoreBar label="Clarity of Argument" score={scores.clarity} />
                <ScoreBar label="Use of Evidence" score={scores.evidence} />
                <ScoreBar label="Engagement" score={scores.engagement} />
              </div>
              <div className="text-center">
                <p className="text-xs text-muted-foreground mb-1 uppercase tracking-wider">Overall Winner</p>
                <p className="text-2xl font-black text-yellow-500 tracking-tight">{scores.winner}</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
