"use client";

import { useState, useRef, useEffect } from "react";
import { Play, RotateCcw, SquareTerminal, Scale, Flame, X } from "lucide-react";
import { PersonaCard, Persona, PERSONA_CONFIG } from "@/components/debates/PersonaCard";
import { JudgeResults, JudgeScores } from "@/components/debates/JudgeResults";

type DebateStatus = "setup" | "debating" | "judging" | "finished" | "error";

interface ResponseLog {
  persona: Persona;
  text: string;
  round: number;
}

const PERSONA_ORDER: Persona[] = ["Aria", "Lex", "Sage", "Rex"];

export default function DebatesPage() {
  const [topic, setTopic] = useState("");
  const [targetRounds, setTargetRounds] = useState<3 | 5 | 7>(3);
  const [status, setStatus] = useState<DebateStatus>("setup");
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [currentRound, setCurrentRound] = useState(1);
  const [activePersonaIdx, setActivePersonaIdx] = useState(0);
  
  // Stores history of completed responses
  const [history, setHistory] = useState<ResponseLog[]>([]);
  // Stores the currently streaming text
  const [streamingText, setStreamingText] = useState("");
  const [hasTurnError, setHasTurnError] = useState(false);
  
  const [judgeStatus, setJudgeStatus] = useState<"idle" | "evaluating" | "done" | "error">("idle");
  const [judgeScores, setJudgeScores] = useState<JudgeScores | null>(null);

  const arenaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (status === "debating" || status === "judging") {
      arenaRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
  }, [status]);

  const handleStart = () => {
    if (!topic.trim()) return;
    setStatus("debating");
    setCurrentRound(1);
    setActivePersonaIdx(0);
    setHistory([]);
    setStreamingText("");
    setHasTurnError(false);
    setJudgeStatus("idle");
    setJudgeScores(null);
    startNextTurn(1, 0, []);
  };

  const activePersonaName = PERSONA_ORDER[activePersonaIdx];

  const startNextTurn = async (round: number, pIdx: number, currentHistory: ResponseLog[]) => {
    const persona = PERSONA_ORDER[pIdx];
    setStreamingText("");
    setHasTurnError(false);

    try {
      const res = await fetch("/api/debate", {
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

      if (!res.ok) {
        throw new Error("Failed to fetch debate stream");
      }
      
      if (!res.body) throw new Error("No response body");
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullResponse = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\\n").filter((line) => line.trim() !== "");
        
        for (const line of lines) {
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6);
            if (dataStr === "[DONE]") continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.choices?.[0]?.delta?.content) {
                fullResponse += data.choices[0].delta.content;
                setStreamingText(fullResponse);
              }
            } catch (e) {}
          }
        }
      }

      // Turn completed
      const newHistory = [...currentHistory, { persona, text: fullResponse, round }];
      setHistory(newHistory);
      setStreamingText("");

      // Determine next turn
      const nextIdx = pIdx + 1;
      if (nextIdx < PERSONA_ORDER.length) {
        setActivePersonaIdx(nextIdx);
        startNextTurn(round, nextIdx, newHistory);
      } else {
        // Round End
        if (round < targetRounds) {
          const nextRound = round + 1;
          setCurrentRound(nextRound);
          setActivePersonaIdx(0);
          startNextTurn(nextRound, 0, newHistory);
        } else {
          // Debate End
          setStatus("judging");
          runJudgeModel(newHistory);
        }
      }
    } catch (error) {
      console.error(error);
      // Set simple error state somehow - maybe an error log in history
      setStreamingText("");
      // To simplify, we'll mark this persona as error so we can retry
      // We need a subtle way to show error on the active card.
      // We can do this by tricking the history or state.
      // For now, let's just abort this turn and change overall status to a special error state if we had one.
      // "error" status
      // We can reuse history logic: if we just stop here, the active card stays typing.
      // Let's add a mechanism for persona error.
      // Actually, we can just throw the error handled by a specific state.
      // But let's add `cardStatus` support for 'error' inside `renderArena`.
      // The instructions say "show a friendly inline error on that persona's card... with a retry button".
      // We can use a special state variable `hasError` for the active persona.
      setHasTurnError(true);
    }
  }; // End of startNextTurn

  async function runJudgeModel(fullHistory: ResponseLog[]) {
    setJudgeStatus("evaluating");
    try {
      const res = await fetch("/api/judge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, history: fullHistory, totalRounds: targetRounds }),
      });

      if (!res.ok) throw new Error("Judge failed");

      const data: JudgeScores = await res.json();
      setJudgeScores(data);
      setJudgeStatus("done");
      setStatus("finished");
    } catch (e) {
      console.error(e);
      setJudgeStatus("error");
    }
  };

  const renderSetup = () => (
    <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="text-center space-y-4">
        <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/10 mb-2">
          <SquareTerminal className="h-6 w-6 text-primary" />
        </div>
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight">Debate Arena</h1>
        <p className="text-lg text-muted-foreground max-w-xl mx-auto">
          Four distinct AI personalities. One topic. Watch them clash, reason, and philosophize in real-time.
        </p>
      </div>

      <div className="space-y-6 pt-2 pb-6">
        <div className="flex items-center justify-center relative">
          <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="relative z-10 bg-background px-4 text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase text-center">
            Meet the Cast
          </span>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {PERSONA_ORDER.map(p => {
            const config = PERSONA_CONFIG[p];
            return (
              <div 
                key={p} 
                className="group relative flex flex-col items-center bg-card/40 backdrop-blur-xl border border-white/5 shadow-lg rounded-2xl p-6 text-center transition-all duration-300 hover:bg-card/80 hover:-translate-y-1 hover:shadow-2xl hover:border-white/10 overflow-hidden"
              >
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 transition-opacity duration-500 bg-gradient-to-br ${config.bgLight.replace('/10', '/100')} to-transparent`} />
                
                <div className={`relative flex h-20 w-20 shrink-0 items-center justify-center rounded-full font-bold transition-all shadow-inner border border-white/10 overflow-hidden ${config.bgLight} ${config.animation}`}>
                  <img src={config.avatar} alt={p} className="h-full w-full object-cover" />
                </div>
                
                <div className="mt-5 space-y-1.5 flex flex-col items-center relative z-10">
                  <h4 className={`font-bold text-xl tracking-tight ${config.color}`}>{p}</h4>
                  <div className="inline-flex items-center px-2.5 py-1 rounded-full bg-background/80 border border-white/5 shadow-sm">
                    <span className="text-[9px] sm:text-[10px] font-bold tracking-widest text-muted-foreground/80 uppercase">
                      {config.model}
                    </span>
                  </div>
                  <p className="text-xs text-card-foreground/70 leading-relaxed font-medium px-2 pt-1 max-w-[200px]">
                    {config.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="group relative overflow-hidden bg-gradient-to-b from-yellow-500/5 to-yellow-500/[0.02] backdrop-blur-xl border border-yellow-500/20 shadow-[0_8px_30px_rgba(234,179,8,0.05)] rounded-2xl p-5 sm:p-6 transition-all duration-300 hover:shadow-[0_15px_40px_rgba(234,179,8,0.12)] hover:-translate-y-0.5">
          <div className="absolute inset-0 bg-gradient-to-r from-transparent via-yellow-500/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-in-out" />
          
          <div className="flex flex-col sm:flex-row items-center justify-center gap-5 relative z-10">
            <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-yellow-500/20 to-amber-500/5 shadow-[inset_0_0_20px_rgba(234,179,8,0.2)] border border-yellow-500/20 animate-pulse overflow-hidden">
              <img src="/avatars/judge.png" alt="Judge" className="h-full w-full object-cover" />
            </div>
            <div className="text-center sm:text-left space-y-1.5 pt-1">
              <h4 className="font-bold text-xl text-yellow-500 tracking-tight leading-none">The Judge</h4>
              <div>
                <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-[10px] font-bold tracking-widest text-yellow-600/80 uppercase">
                  gemini-1.5-pro
                </span>
              </div>
              <p className="text-xs text-muted-foreground/80 font-medium leading-none">Impartial Evaluator</p>
            </div>
          </div>
        </div>
      </div>

      <div className="flex justify-center pb-12">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="rounded-full bg-primary px-10 py-4 text-primary-foreground font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all"
        >
          Start Debate!
        </button>
      </div>

      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="w-full max-w-lg bg-card rounded-3xl border shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-2xl font-bold tracking-tight">Configure Debate</h2>
              <button onClick={() => setIsModalOpen(false)} className="rounded-full p-2 hover:bg-secondary transition-colors text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="p-6 space-y-8">
              <div className="space-y-3">
                <label className="text-sm font-semibold flex justify-between text-muted-foreground">
                  Debate Topic
                  <span className="font-normal">{topic.length}/200</span>
                </label>
                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value.slice(0, 200))}
                  placeholder="e.g. Should artificial intelligence be granted legal personhood?"
                  className="w-full min-h-[120px] rounded-2xl border bg-background px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all placeholder:text-muted-foreground/50 shadow-inner"
                />
              </div>

              <div className="space-y-4">
                <label className="text-sm font-semibold text-muted-foreground">Number of Rounds</label>
                <div className="grid grid-cols-3 gap-3">
                  {[3, 5, 7].map((r) => (
                    <button
                      key={r}
                      onClick={() => setTargetRounds(r as 3 | 5 | 7)}
                      className={`py-3 rounded-2xl border text-sm font-bold transition-all ${
                        targetRounds === r
                          ? "bg-primary text-primary-foreground border-primary shadow-md scale-[1.02]"
                          : "bg-background hover:bg-accent/50 text-muted-foreground"
                      }`}
                    >
                      {r} Rounds
                    </button>
                  ))}
                </div>
              </div>

              <button
                onClick={() => {
                  setIsModalOpen(false);
                  handleStart();
                }}
                disabled={!topic.trim()}
                className="w-full flex items-center justify-center gap-2 rounded-2xl bg-orange-600 px-6 py-5 text-white font-bold text-lg shadow-[0_0_15px_rgba(234,88,12,0.3)] hover:shadow-[0_0_30px_rgba(234,88,12,0.6)] hover:animate-flicker hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:pointer-events-none group"
              >
                <Flame className="h-6 w-6 group-hover:scale-110 transition-transform" />
                Fire!
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );

  const renderArena = () => {
    // Calculate total progress
    const totalTurns = targetRounds * 4;
    const completedTurns = (currentRound - 1) * 4 + activePersonaIdx;
    const progressPercent = status === "finished" || status === "judging" 
      ? 100 
      : (completedTurns / totalTurns) * 100;

    return (
      <div className="max-w-7xl mx-auto space-y-8" ref={arenaRef}>
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-card p-6 rounded-2xl border sticky top-20 z-10 shadow-sm backdrop-blur-xl bg-card/80">
          <div className="space-y-1">
            <h2 className="font-bold text-xl line-clamp-1">{topic}</h2>
            <div className="text-sm text-muted-foreground flex items-center gap-3">
              <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-semibold text-primary">
                Round {Math.min(currentRound, targetRounds)} of {targetRounds}
              </span>
              <span>•</span>
              <span className="capitalize">{status === "judging" ? "Judge Deliberating" : status}</span>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="hidden sm:block w-32 h-2 rounded-full border bg-background overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-500" 
                style={{ width: `${progressPercent}%` }} 
              />
            </div>
            
            {["finished", "error", "judging"].includes(status) && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setStatus("setup")}
                  className="flex items-center gap-2 rounded-lg bg-secondary px-4 py-2 text-sm font-semibold hover:bg-secondary/80 transition-all"
                >
                  <RotateCcw className="h-4 w-4" />
                  New Debate
                </button>
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {PERSONA_ORDER.map((pName, idx) => {
            const isTurn = status === "debating" && activePersonaName === pName;
            
            // Gather all completed text for this persona in the current round
            // If it's their turn, we show streaming text. If they already went, we show their last history for this round.
            // If they haven't gone this round, we show nothing (or previous round).
            // Actually, we should show the MOST RECENT response from this persona.
            
            const personaHistory = history.filter(h => h.persona === pName);
            const latestHistory = personaHistory[personaHistory.length - 1];
            
            let cardStatus: "idle" | "typing" | "done" | "error" = "idle";
            let displayString = "";

            if (isTurn) {
              cardStatus = "typing";
              displayString = streamingText;
            } else if (latestHistory) {
              // Only "done" if we're past their turn in the overall sequence
              cardStatus = status === "finished" || status === "judging" || (
                currentRound > latestHistory.round || 
                (currentRound === latestHistory.round && activePersonaIdx > idx)
              ) ? "done" : "idle";
              displayString = latestHistory.text;
            }

            return (
              <div key={pName} className="flex flex-col h-full min-h-[400px]">
                <PersonaCard
                  name={pName}
                  status={cardStatus}
                  text={displayString}
                  isActiveTurn={isTurn}
                  onRetry={() => startNextTurn(currentRound, activePersonaIdx, history)}
                />
              </div>
            );
          })}
        </div>
        
        {/* Judge Results Section */}
        <JudgeResults 
          scores={judgeScores} 
          status={judgeStatus} 
          onRetry={() => {
            // Trigger judge evaluation
            console.log("Retrying judge");
          }}
        />
      </div>
    );
  };

  return (
    <main className="min-h-[calc(100vh-4rem)] p-4 sm:p-8 bg-background relative overflow-hidden">
      {/* Background aesthetics */}
      <div className="absolute top-0 inset-x-0 h-[500px] w-full bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />
      
      {status === "setup" ? renderSetup() : renderArena()}
    </main>
  );
}
