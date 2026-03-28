import { useState, useMemo } from "react";
import { Trophy, ChevronLeft, ChevronRight, Menu } from "lucide-react";
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

function ScoreBar({ label, score, colorClass }: { label: string; score: number, colorClass: string }) {
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-xs sm:text-sm">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-bold text-foreground">{score}/10</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary shadow-inner">
        <div
          className={`h-full transition-all duration-1000 ease-out ${colorClass}`}
          style={{ width: `${(score / 10) * 100}%` }}
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
      <div className="w-full flex flex-col items-center justify-center p-12 bg-card/40 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl h-full">
        <div className="h-24 w-24 rounded-full bg-yellow-500/10 shadow-[0_0_40px_rgba(234,179,8,0.2)] animate-pulse flex items-center justify-center mb-6 overflow-hidden border border-yellow-500/20">
          <img src="/avatars/judge.png" alt="Judge" className="h-full w-full object-cover" />
        </div>
        <h3 className="text-xl font-bold bg-gradient-to-r from-yellow-500 to-amber-300 bg-clip-text text-transparent mb-2">Analyzing the Debate...</h3>
        <p className="text-sm text-muted-foreground animate-pulse">Deliberating arguments across all dimensions.</p>
      </div>
    );
  }

  if (status === "error") {
    return (
      <div className="w-full flex items-center justify-center gap-4 p-8 bg-destructive/5 border border-destructive/20 rounded-3xl shadow-sm text-center h-full">
        <p className="text-destructive font-semibold">Justice Nyay encountered an error calculating scores.</p>
        <button onClick={onRetry} className="bg-destructive/10 text-destructive px-4 py-2 rounded-full hover:bg-destructive/20 font-bold transition-colors">Retry</button>
      </div>
    );
  }

  if (status === "done" && scores) {
    if (sortedEvals.length === 0) return null;

    const currentEval = sortedEvals[activeIndex];
    const personaConfig = PERSONA_CONFIG[currentEval.persona as Persona];
    const winnerConfig = PERSONA_CONFIG[scores.winner as Persona];
    
    const getBgColor = (p: Persona) => {
      switch(p) {
        case "Aria": return "bg-purple-500";
        case "Lex": return "bg-blue-500";
        case "Sage": return "bg-green-500";
        case "Rex": return "bg-red-500";
        default: return "bg-primary";
      }
    };

    return (
      <div className="w-full h-full flex flex-col md:flex-row gap-6 p-6 sm:p-8 bg-card/40 backdrop-blur-xl border border-white/5 rounded-3xl shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95 duration-700">
        {/* Left absolute gradient glow based on winner */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-yellow-500 via-amber-300 to-yellow-500" />
        
        {/* Left Sidebar: Justice Nyay */}
        <div className="flex flex-col items-center justify-start shrink-0 pt-4 md:border-r border-border/50 md:pr-8">
          <div className="relative flex h-24 w-24 shrink-0 flex-col items-center justify-center rounded-full bg-yellow-500/10 shadow-[0_0_40px_rgba(234,179,8,0.2)] ring-2 ring-yellow-500/40 outline-none overflow-hidden mb-4">
            <img src="/avatars/judge.png" alt="Judge" className="h-full w-full object-cover" />
          </div>
          <h4 className="font-bold text-lg text-yellow-500 tracking-tight leading-none text-center">Justice Nyay</h4>
          <p className="text-[10px] text-yellow-600/80 uppercase tracking-widest mt-1.5 font-bold">Judge</p>
        </div>

        {/* Middle: Debate Summary */}
        <div className="flex-1 flex flex-col pt-4 min-w-[300px]">
          <div className="flex items-center gap-3 mb-5">
            <div className="p-2 bg-yellow-500/10 rounded-lg">
              <Trophy className="h-5 w-5 text-yellow-500" />
            </div>
            <h2 className="text-2xl font-black text-foreground">Final Verdict</h2>
          </div>
          {/* Verdict Box (expands to fill vertical gap) */}
          <div className="flex-1 min-h-0 bg-background/30 rounded-xl border border-border/50 shadow-inner p-4 mb-4 overflow-y-auto">
            <p className="text-foreground/80 leading-relaxed text-[13px] font-medium">
              {scores.summary}
            </p>
          </div>

          <div className="flex flex-col gap-4">
            {/* Strongest Moment */}
            <div className="pb-4 border-b border-border/50">
               <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                 <Trophy className="h-3 w-3 text-yellow-500" />
                 Strongest Moment
               </p>
               <p className="text-[12px] italic text-foreground/70 font-medium line-clamp-2">
                 "{scores.strongestMoment}"
               </p>
            </div>

            {/* Conclusion Box */}
            <div className="pb-4 border-b border-border/50">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <span className="inline-flex items-center justify-center h-3 w-3 rounded-full bg-amber-500/20 text-amber-500 text-[8px] font-black">✦</span>
                Conclusion
              </p>
              <div className="rounded-xl border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-background/40 to-background/20 p-3 shadow-inner">
                <p className="text-[12.5px] text-foreground/90 font-medium leading-snug">
                  {scores.conclusion}
                </p>
              </div>
            </div>

            {/* Overall Winner (anchored to bottom) */}
            <div className="pt-1">
             <p className="text-xs font-bold text-muted-foreground uppercase tracking-widest mb-3">Overall Winner</p>
             <div className="flex items-center gap-4">
               <div className={`h-14 w-14 shrink-0 rounded-full overflow-hidden shadow-inner ring-2 ring-white/10 ${winnerConfig?.bgLight || ''}`}>
                 {winnerConfig && <img src={winnerConfig.avatar} alt={scores.winner} className="h-full w-full object-cover" />}
               </div>
               <p className={`text-3xl sm:text-4xl font-black ${winnerConfig?.color || 'text-yellow-500'} inline-block drop-shadow-md`}>{scores.winner}</p>
             </div>
            </div>
          </div>
        </div>

        {/* Right: Participant Score Carousel */}
        <div className="w-full md:w-[320px] shrink-0 bg-background/50 rounded-2xl border border-white/5 p-6 flex flex-col relative h-full min-h-[380px] shadow-[inset_0_0_20px_rgba(0,0,0,0.2)]">
          {/* Header of card */}
          <div className="flex items-center gap-4 mb-6">
            <div className={`h-14 w-14 shrink-0 rounded-full overflow-hidden shadow-inner ring-2 ring-white/10 ${personaConfig?.bgLight || ''}`}>
              {personaConfig ? <img src={personaConfig.avatar} alt={currentEval.persona} className="h-full w-full object-cover" /> : null}
            </div>
            <div>
              <h3 className={`font-bold text-xl leading-tight ${personaConfig?.color || 'text-foreground'}`}>{currentEval.persona}</h3>
              <p className="text-xs text-muted-foreground font-semibold mt-0.5">
                Rank: {currentEval.rank === 1 ? <span className="text-yellow-500 font-bold">🏆 #1 Winner</span> : `#${currentEval.rank}`}
              </p>
            </div>
          </div>

          {/* Scores */}
          <div className="space-y-6 flex-1">
            <ScoreBar label="Logic & Reasoning" score={currentEval.scores.logic} colorClass={getBgColor(currentEval.persona)} />
            <ScoreBar label="Clarity of Argument" score={currentEval.scores.clarity} colorClass={getBgColor(currentEval.persona)} />
            <ScoreBar label="Use of Evidence" score={currentEval.scores.evidence} colorClass={getBgColor(currentEval.persona)} />
            <ScoreBar label="Engagement" score={currentEval.scores.engagement} colorClass={getBgColor(currentEval.persona)} />
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between mt-8 pt-4 border-t border-border/50">
            <div className="flex gap-1.5">
              <button 
                onClick={() => setActiveIndex(prev => (prev === 0 ? sortedEvals.length - 1 : prev - 1))}
                className="p-1.5 rounded-lg hover:bg-secondary/80 text-foreground transition-colors border border-border/50"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
              <button 
                onClick={() => setActiveIndex(prev => (prev === sortedEvals.length - 1 ? 0 : prev + 1))}
                className="p-1.5 rounded-lg hover:bg-secondary/80 text-foreground transition-colors border border-border/50"
              >
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            <div className="flex gap-1.5 px-3 py-1.5 bg-background/80 rounded-full border border-border/50">
              {sortedEvals.map((_, i) => (
                <div key={i} className={`h-1.5 w-1.5 rounded-full transition-colors ${i === activeIndex ? "bg-primary" : "bg-muted"}`} />
              ))}
            </div>
            <div className="relative">
              <button 
                onClick={() => setIsMenuOpen(!isMenuOpen)}
                className="p-1.5 rounded-lg hover:bg-secondary/80 text-muted-foreground hover:text-foreground transition-colors"
              >
                <Menu className="h-4 w-4" />
              </button>
              
              {isMenuOpen && (
                <div className="absolute bottom-[120%] right-0 mb-1 w-44 bg-card/95 backdrop-blur-md border border-white/10 shadow-2xl rounded-xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-200">
                  {sortedEvals.map((ev, i) => {
                    const c = PERSONA_CONFIG[ev.persona];
                    return (
                      <button
                        key={ev.persona}
                        onClick={() => { setActiveIndex(i); setIsMenuOpen(false); }}
                        className={`w-full flex items-center gap-3 px-4 py-3 hover:bg-secondary/80 transition-colors ${i === activeIndex ? "bg-secondary/50 text-foreground" : "text-muted-foreground"}`}
                      >
                        <img src={c.avatar} className="h-6 w-6 rounded-full object-cover border border-white/10" />
                        <span className="text-sm font-bold">{ev.persona}</span>
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return null;
}
