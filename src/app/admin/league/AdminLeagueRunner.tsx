"use client";

import { useState } from "react";
import { Play, ShieldCheck } from "lucide-react";
import { apiUrl } from "@/lib/api";

type GameChoice = "auto" | "debate" | "joke" | "scenario";

export function AdminLeagueRunner() {
  const [adminKey, setAdminKey] = useState("");
  const [gameType, setGameType] = useState<GameChoice>("auto");
  const [dryRun, setDryRun] = useState(true);
  const [queueOnly, setQueueOnly] = useState(false);
  const [isRunning, setIsRunning] = useState(false);
  const [result, setResult] = useState<string>("");

  const runMatch = async () => {
    setIsRunning(true);
    setResult("");
    try {
      const response = await fetch(apiUrl("/api/admin/league/run-match"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Admin-League-Key": adminKey,
        },
        body: JSON.stringify({ gameType, dryRun, queueOnly }),
      });
      const text = await response.text();
      setResult(`${response.status} ${response.statusText}\n${text}`);
    } catch (error) {
      setResult(error instanceof Error ? error.message : "Unknown admin runner error");
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <section className="mt-6 rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-5 sm:p-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-muted-foreground">Run Match</p>
          <h2 className="mt-2 font-display text-3xl text-foreground">Protected official generation</h2>
        </div>
        <ShieldCheck className="h-6 w-6 text-emerald-200" />
      </div>

      <div className="mt-6 grid gap-4 md:grid-cols-[1fr_auto_auto_auto]">
        <label className="block">
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">Admin key</span>
          <input
            value={adminKey}
            onChange={(event) => setAdminKey(event.target.value)}
            type="password"
            className="mt-2 w-full rounded-xl border border-white/10 bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-yellow-200/45"
            placeholder="ADMIN_LEAGUE_KEY"
          />
        </label>

        <label className="block">
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">Game</span>
          <select
            value={gameType}
            onChange={(event) => setGameType(event.target.value as GameChoice)}
            className="mt-2 w-full rounded-xl border border-white/10 bg-background/70 px-4 py-3 text-sm text-foreground outline-none transition-colors focus:border-yellow-200/45 md:w-44"
          >
            <option value="auto">Auto</option>
            <option value="debate">Debate</option>
            <option value="joke">Joke</option>
            <option value="scenario">Scenario</option>
          </select>
        </label>

        <label className="flex items-end gap-3 rounded-xl border border-white/8 bg-background/40 px-4 py-3">
          <input type="checkbox" checked={dryRun} onChange={(event) => setDryRun(event.target.checked)} className="h-4 w-4 accent-yellow-200" />
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">Dry run</span>
        </label>

        <label className="flex items-end gap-3 rounded-xl border border-white/8 bg-background/40 px-4 py-3">
          <input type="checkbox" checked={queueOnly} onChange={(event) => setQueueOnly(event.target.checked)} className="h-4 w-4 accent-yellow-200" />
          <span className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">Queue only</span>
        </label>
      </div>

      <button
        type="button"
        onClick={runMatch}
        disabled={isRunning || !adminKey.trim()}
        className="btn-primary mt-5 px-5 py-3 text-[0.62rem] disabled:opacity-45"
      >
        {isRunning ? "Running" : "Run Admin Match"}
        <Play className="h-3.5 w-3.5" />
      </button>

      {result ? (
        <pre className="mt-5 max-h-80 overflow-auto rounded-xl border border-white/8 bg-black/35 p-4 text-xs leading-5 text-foreground/80">
          {result}
        </pre>
      ) : null}
    </section>
  );
}
