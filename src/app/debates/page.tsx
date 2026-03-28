"use client";

import { useState, useRef, useEffect } from "react";
import { Play, RotateCcw, SquareTerminal, Scale, Flame, X, Trophy } from "lucide-react";
import { Persona, PERSONA_CONFIG } from "@/components/debates/PersonaCard";
import { JudgeResults, JudgeScores } from "@/components/debates/JudgeResults";

type DebateStatus = "setup" | "debating" | "awaiting_judge" | "judging" | "finished" | "results" | "error";

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

export default function DebatesPage() {
  const [topic, setTopic] = useState("");
  const [targetRounds, setTargetRounds] = useState<3 | 5 | 7>(3);
  const [status, setStatus] = useState<DebateStatus>("setup");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);
  
  const [currentRound, setCurrentRound] = useState(1);
  const [viewRound, setViewRound] = useState(1);
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
    setViewRound(1);
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

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

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
      } else {
        // Round End
        if (round < targetRounds) {
          const nextRound = round + 1;
          setCurrentRound(nextRound);
          setViewRound(nextRound);
          setActivePersonaIdx(0);
          startNextTurn(nextRound, 0, newHistory);
        } else {
          // Debate End
          setStatus("awaiting_judge");
        }
      }
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

      // Robust retry with exponential backoff for Groq free-tier rate limits
      const MAX_RETRIES = 3;
      const BACKOFF_MS = [12000, 20000, 30000]; // 12s, 20s, 30s
      
      for (let attempt = 0; attempt < MAX_RETRIES && res.status === 429; attempt++) {
        const waitMs = BACKOFF_MS[attempt];
        console.warn(`[Rate Limited] Attempt ${attempt + 1}/${MAX_RETRIES} — waiting ${waitMs / 1000}s before retry...`);
        await new Promise(r => setTimeout(r, waitMs));
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
      
      if (!res.body) throw new Error("No response body");
      
      const reader = res.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let fullResponse = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        // Maintain the last fragment in the buffer
        buffer = lines.pop() || "";
        
        for (const line of lines) {
          if (line.trim() === "") continue;
          if (line.startsWith("data: ")) {
            const dataStr = line.slice(6).trim();
            if (dataStr === "[DONE]") continue;
            try {
              const data = JSON.parse(dataStr);
              if (data.choices?.[0]?.delta?.content) {
                fullResponse += data.choices[0].delta.content;
                setStreamingText(fullResponse);
              }
            } catch (e) {
              console.error("Stream parse error:", e, line);
            }
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
          setViewRound(nextRound);
          setActivePersonaIdx(0);
          startNextTurn(nextRound, 0, newHistory);
        } else {
          // Debate End
          setStatus("awaiting_judge");
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

    const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

    if (isDemoMode) {
      await sleep(2500); // simulate thinking
      setJudgeScores({
        summary: "This was a flawless UI simulation. All personas effectively delivered simulated local responses perfectly. The UI clearly displays the winner, Justice Nyay's final calls based on every participant's text, and tells who won, why, and how.",
        winner: "Sage",
        strongestMoment: "Sage brilliantly neutralizing the tension between pure metrics and human equity.",
        conclusion: "The conclusion based on the discussion by Aria, Lex, Sage and Rex is that structural equity and free market metrics must both be subordinated to philosophical truth to achieve lasting stability.",
        evaluations: [
          { persona: "Aria", rank: 2, scores: { logic: 8, clarity: 9, evidence: 8, engagement: 9 }, totalScore: 34, standoutMove: "Reframed the entire debate around systemic equity." },
          { persona: "Lex", rank: 3, scores: { logic: 9, clarity: 7, evidence: 9, engagement: 6 }, totalScore: 31, standoutMove: "Provided bulletproof statistical analysis on market efficiency." },
          { persona: "Sage", rank: 1, scores: { logic: 10, clarity: 9, evidence: 8, engagement: 10 }, totalScore: 37, standoutMove: "Deconstructed the core conflicting assumption both sides relied upon." },
          { persona: "Rex", rank: 4, scores: { logic: 7, clarity: 8, evidence: 7, engagement: 7 }, totalScore: 29, standoutMove: "Anchored the argument heavily in centuries of cultural survival." }
        ]
      });
      setJudgeStatus("done");
      setStatus("results");
      return;
    }

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
      setStatus("results");
    } catch (e) {
      console.error(e);
      setJudgeStatus("error");
    }
  };

  const renderSetup = () => (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center justify-center space-y-6 sm:space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500 relative">
      <div className="text-center space-y-2">
        <div className="inline-flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 mb-1">
          <SquareTerminal className="h-5 w-5 text-primary" />
        </div>
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight">Debate Arena</h1>
        <p className="text-sm sm:text-base text-muted-foreground max-w-xl mx-auto px-4 mt-2">
          Four distinct AI personalities. One topic. Watch them clash in real-time.
        </p>
      </div>

      <div className="w-full pt-2">
        <div className="flex items-center justify-center relative mb-6">
          <div className="absolute inset-x-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
          <span className="relative z-10 bg-background px-4 text-[10px] sm:text-xs font-semibold tracking-[0.2em] text-muted-foreground uppercase text-center">
            Meet the Cast
          </span>
        </div>
        
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 sm:gap-6 lg:gap-8">
          {PERSONA_ORDER.map(p => {
            const config = PERSONA_CONFIG[p];
            return (
              <div 
                key={p} 
                className="group flex flex-col items-center text-center transition-all duration-300"
              >
                <div className={`relative flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-full transition-all duration-500 group-hover:scale-105 group-hover:shadow-[0_0_30px_rgba(255,255,255,0.1)] overflow-hidden ${config.bgLight}`}>
                  <img src={config.avatar} alt={p} className="h-full w-full object-cover" />
                </div>
                
                <div className="mt-4 space-y-1 sm:space-y-1.5 flex flex-col items-center">
                  <h4 className={`font-bold text-lg sm:text-xl tracking-tight ${config.color}`}>{p}</h4>
                  <div className="inline-flex items-center">
                    <span className="text-[9px] font-bold tracking-widest text-muted-foreground/80 uppercase">
                      {config.model}
                    </span>
                  </div>
                  <p className="text-xs sm:text-sm text-foreground/70 leading-tight font-medium px-2 max-w-[200px]">
                    {config.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
        
        <div className="mt-8 sm:mt-10 flex flex-col sm:flex-row items-center justify-center gap-4 sm:gap-6 group transition-all duration-300">
          <div className="flex h-20 w-20 sm:h-24 sm:w-24 shrink-0 items-center justify-center rounded-full bg-yellow-500/10 shadow-[0_0_30px_rgba(234,179,8,0.2)] group-hover:shadow-[0_0_40px_rgba(234,179,8,0.3)] group-hover:scale-105 animate-pulse overflow-hidden transition-all duration-500 ring-2 ring-yellow-500/20 ring-offset-4 ring-offset-background">
            <img src="/avatars/judge.png" alt="Judge" className="h-full w-full object-cover" />
          </div>
          <div className="text-center sm:text-left space-y-1 sm:space-y-1.5">
            <h4 className="font-extrabold text-2xl sm:text-3xl text-yellow-500 tracking-tight leading-none group-hover:text-yellow-400 transition-colors">Justice Nyay</h4>
            <div className="pt-1 flex justify-center sm:justify-start">
              <span className="inline-flex items-center px-2 py-0.5 rounded-md bg-yellow-500/10 border border-yellow-500/20 text-[9px] sm:text-[10px] font-bold tracking-widest text-yellow-600/80 uppercase">
                gemini-2.5-flash
              </span>
            </div>
            <p className="text-xs sm:text-sm text-foreground/80 font-bold leading-none">The Judge • Impartial Evaluator</p>
          </div>
        </div>
      </div>

      <div className="flex justify-center mt-4">
        <button 
          onClick={() => setIsModalOpen(true)}
          className="rounded-full bg-primary px-12 py-4 text-primary-foreground font-bold text-lg shadow-lg hover:shadow-xl hover:scale-105 transition-all w-full sm:w-auto"
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
                
                <div className="flex flex-wrap gap-2 mb-3">
                  {PRESET_TOPICS.map((t, i) => (
                    <button
                      key={i}
                      onClick={() => setTopic(t)}
                      className="text-[10px] sm:text-xs bg-secondary/50 hover:bg-secondary text-secondary-foreground border border-border/50 px-3 py-1.5 rounded-full transition-colors text-left leading-tight"
                    >
                      {t}
                    </button>
                  ))}
                </div>

                <textarea
                  value={topic}
                  onChange={(e) => setTopic(e.target.value.slice(0, 200))}
                  placeholder="e.g. Should artificial intelligence be granted legal personhood?"
                  className="w-full min-h-[100px] rounded-2xl border bg-background px-5 py-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/50 resize-none transition-all placeholder:text-muted-foreground/50 shadow-inner"
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

              <div className="flex items-center justify-between bg-primary/5 p-4 rounded-2xl border border-primary/20">
                <div className="space-y-0.5">
                  <label className="text-sm font-semibold text-foreground">Test UI Mode</label>
                  <p className="text-xs text-muted-foreground">Run standard simulation locally without API keys</p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsDemoMode(!isDemoMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none ${isDemoMode ? 'bg-primary' : 'bg-muted'}`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${isDemoMode ? 'translate-x-6' : 'translate-x-1'}`} />
                </button>
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
    return (
      <div className="max-w-[1400px] w-full mx-auto h-[calc(100vh-6rem)] flex flex-col pt-2 sm:pt-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-background/50 border border-border/50 p-4 sm:p-5 rounded-2xl mb-4 sm:mb-6 shadow-sm">
          <div className="space-y-1.5 flex-1 min-w-0 pr-4">
             <div className="flex items-center gap-3 mb-1">
               <div className="flex items-center bg-primary/10 rounded-lg border border-primary/20 font-bold overflow-hidden shadow-inner">
                 <button onClick={() => setViewRound(r => Math.max(1, r - 1))} disabled={viewRound === 1} className="px-3 py-1 text-primary hover:bg-primary/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-black">{"<"}</button>
                 <span className="text-[10px] text-primary uppercase tracking-widest px-2 border-x border-primary/10">
                   Round {viewRound}/{targetRounds}
                 </span>
                 <button onClick={() => setViewRound(r => Math.min(targetRounds, r + 1))} disabled={viewRound === targetRounds || viewRound >= currentRound && status !== "finished" && status !== "results"} className="px-3 py-1 text-primary hover:bg-primary/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors font-black">{">"}</button>
               </div>
               <span className="text-muted-foreground text-xs font-semibold capitalize flex items-center gap-1.5">
                  <div className={`h-2.5 w-2.5 rounded-full ${status === "judging" ? "bg-yellow-500 animate-pulse" : status === "awaiting_judge" ? "bg-yellow-400" : status === "finished" ? "bg-emerald-500" : "bg-primary animate-pulse"}`} />
                  {status === "judging" ? "Judge Deliberating" : status === "awaiting_judge" ? "Debate Over" : status}
               </span>
             </div>
             <h2 className="font-bold text-base sm:text-lg line-clamp-2 text-foreground/90 leading-tight">"{topic}"</h2>
          </div>
          <div className="flex gap-2 sm:gap-3 shrink-0">
            {status === "finished" && (
              <button
                onClick={() => setStatus("results")}
                className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-yellow-500/20 bg-yellow-500/10 hover:bg-yellow-500/20 text-yellow-500 transition-all shadow-sm flex items-center gap-2"
              >
                <Trophy className="h-4 w-4" />
                View Results
              </button>
            )}
            {status === "awaiting_judge" && (
              <button
                onClick={() => {
                  setStatus("judging");
                  runJudgeModel(history);
                }}
                className="px-4 py-2 sm:px-6 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-yellow-500/20 bg-gradient-to-r from-yellow-500 to-amber-400 hover:from-yellow-400 hover:to-amber-300 text-yellow-950 transition-all shadow-[0_0_15px_rgba(234,179,8,0.4)] hover:shadow-[0_0_25px_rgba(234,179,8,0.6)] flex items-center justify-center gap-2 scale-100 hover:scale-105"
              >
                <div className="h-5 w-5 rounded-full overflow-hidden border border-yellow-800/30">
                  <img src="/avatars/judge.png" alt="Judge" className="h-full w-full object-cover" />
                </div>
                JUDGE!
              </button>
            )}
            <button
              onClick={() => {
                setStatus("debating");
                setCurrentRound(1);
                setViewRound(1);
                setActivePersonaIdx(0);
                setHistory([]);
                startNextTurn(1, 0, []);
              }}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-border/50 bg-background hover:bg-secondary text-foreground transition-all shadow-sm"
            >
              Restart
            </button>
            <button
              onClick={() => {
                setTopic("");
                setStatus("setup");
              }}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-primary/20 bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary transition-all shadow-sm"
            >
              New Debate
            </button>
          </div>
        </div>

        {/* 2x2 Grid Chat Room */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 min-h-0 pb-4">
          {PERSONA_ORDER.map((pName) => {
            const config = PERSONA_CONFIG[pName];
            const isTurn = status === "debating" && activePersonaName === pName;
            
            const getBorderStyles = () => {
              if (pName === "Aria") return "border-purple-500/50 shadow-[0_0_20px_rgba(168,85,247,0.15)] ring-4 ring-purple-500/20";
              if (pName === "Lex") return "border-blue-500/50 shadow-[0_0_20px_rgba(59,130,246,0.15)] ring-4 ring-blue-500/20";
              if (pName === "Sage") return "border-green-500/50 shadow-[0_0_20px_rgba(34,197,94,0.15)] ring-4 ring-green-500/20";
              if (pName === "Rex") return "border-red-500/50 shadow-[0_0_20px_rgba(239,68,68,0.15)] ring-4 ring-red-500/20";
              return "border-primary/50 ring-4 ring-primary/20";
            };

            const getMsgStyles = () => {
              if (pName === "Aria") return "bg-purple-500/10 border-purple-500/20";
              if (pName === "Lex") return "bg-blue-500/10 border-blue-500/20";
              if (pName === "Sage") return "bg-green-500/10 border-green-500/20";
              if (pName === "Rex") return "bg-red-500/10 border-red-500/20";
              return "bg-primary/10 border-primary/20";
            };
            
            const personaHistory = history.filter(h => h.persona === pName);
            
            return (
              <div key={pName} className="flex gap-3 sm:gap-4 h-full relative group min-h-[250px]">
                {/* Avatar Sidebar */}
                <div className="flex flex-col items-center shrink-0 w-12 sm:w-16 pt-3">
                  <div className={`h-12 w-12 sm:h-16 sm:w-16 rounded-full shrink-0 border-2 overflow-hidden shadow-sm flex items-center justify-center transition-all ${config.bgLight} ${isTurn ? `${getBorderStyles()} scale-105` : 'border-white/10'}`}>
                    <img src={config.avatar} alt={pName} className="h-full w-full object-cover" />
                  </div>
                  <span className={`text-[10px] sm:text-xs font-black mt-2.5 tracking-wide ${config.color}`}>{pName}</span>
                </div>
                
                {/* Chat Box */}
                <div className={`flex-1 flex flex-col bg-card/40 backdrop-blur-md rounded-3xl border ${isTurn ? getBorderStyles().split(' ring')[0] : 'border-white/5 shadow-inner'} overflow-hidden transition-all duration-300 relative`}>
                  
                  {/* Internal Scroll area */}
                  <div className="flex-1 overflow-y-auto p-4 sm:p-5 scrollbar-thin scrollbar-thumb-white/10 flex flex-col pt-1">
                    {(() => {
                      const rh = personaHistory.find(h => h.round === viewRound);
                      const isCurrentTurnViewing = isTurn && currentRound === viewRound;

                      if (!rh && !isCurrentTurnViewing) {
                        return (
                          <div className="h-full flex flex-col items-center justify-center text-muted-foreground/40 text-sm font-medium space-y-3 pb-8">
                            <div className="h-10 w-10 border border-dashed rounded-full border-muted-foreground/30" />
                            Awaiting text...
                          </div>
                        );
                      }

                      return (
                        <div className="flex-1 flex flex-col animate-in fade-in duration-300">
                          {rh && (
                            <div className="bg-background/80 rounded-[1.25rem] rounded-tl-sm px-5 py-4 border border-white/5 text-[13px] sm:text-[15px] leading-relaxed shadow-sm text-foreground/90 mb-4 inline-block">
                              {rh.text}
                            </div>
                          )}
                          {isCurrentTurnViewing && (
                             <div className={`${getMsgStyles()} rounded-[1.25rem] rounded-tl-sm px-5 py-4 border text-[13px] sm:text-[15px] leading-relaxed shadow-sm text-foreground/90 inline-block`}>
                               {streamingText}
                               <span className={`inline-block w-2 sm:w-2.5 h-3.5 sm:h-4 ml-1.5 rounded-sm bg-foreground animate-pulse align-middle opacity-50`} />
                             </div>
                          )}
                        </div>
                      );
                    })()}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderResults = () => {
    return (
      <div className="max-w-7xl mx-auto min-h-[calc(100vh-6rem)] flex flex-col pt-2 sm:pt-4 animate-in fade-in zoom-in-95 duration-500 w-full">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-background/50 border border-border/50 p-4 sm:p-5 rounded-2xl mb-6 shadow-sm">
          <div className="space-y-1.5 flex-1 min-w-0 pr-4">
             <div className="flex items-center gap-3 mb-1">
               <span className="bg-emerald-500/10 text-emerald-500 px-2.5 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-widest border border-emerald-500/20">
                 Debate Concluded
               </span>
             </div>
             <h2 className="font-bold text-base sm:text-lg line-clamp-2 text-foreground/90 leading-tight">"{topic}"</h2>
          </div>
          <div className="flex gap-2 sm:gap-3 shrink-0">
            <button
              onClick={() => setStatus("finished")}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-border/50 bg-background hover:bg-secondary text-foreground transition-all shadow-sm"
            >
              View Debate
            </button>
            <button
              onClick={() => {
                setTopic("");
                setStatus("setup");
              }}
              className="px-4 py-2 sm:px-5 sm:py-2.5 rounded-xl text-xs sm:text-sm font-bold border border-primary/20 bg-primary/10 hover:bg-primary hover:text-primary-foreground text-primary transition-all shadow-sm"
            >
              Try other modes
            </button>
          </div>
        </div>
        
          <div className="flex-1 flex flex-col items-center justify-center h-full min-h-0 bg-background/50 rounded-2xl border border-border/50">
            <JudgeResults scores={judgeScores} status={judgeStatus} />
          </div>
      </div>
    );
  };

  return (
    <main className={`h-[calc(100vh-4rem)] p-4 sm:p-6 lg:p-8 bg-background relative overflow-hidden flex flex-col ${status === "setup" ? "justify-center" : ""}`}>
      {/* Background aesthetics */}
      <div className="absolute top-0 inset-x-0 h-[500px] w-full bg-gradient-to-b from-primary/5 to-transparent pointer-events-none -z-10" />
      
      {status === "setup" ? renderSetup() : status === "results" ? renderResults() : renderArena()}
    </main>
  );
}
