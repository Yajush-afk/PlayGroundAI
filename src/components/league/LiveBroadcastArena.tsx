"use client";

import { useEffect, useState } from "react";
import { apiUrl } from "@/lib/api";
import { fallbackLiveState, type LeaderboardEntry, type LeagueMatch, type LeagueStatus, type LiveLeagueState } from "@/lib/league";
import { BroadcastArena } from "./LeagueComponents";

interface LiveBroadcastArenaProps {
  initialCurrentMatch: LeagueMatch | null;
  initialPreviousMatch: LeagueMatch | null;
  initialUpNext: LeagueMatch | null;
  initialStatus: LeagueStatus;
  initialLeaderboard: LeaderboardEntry[];
}

export function LiveBroadcastArena({
  initialCurrentMatch,
  initialPreviousMatch,
  initialUpNext,
  initialStatus,
  initialLeaderboard,
}: LiveBroadcastArenaProps) {
  const [state, setState] = useState<LiveLeagueState>({
    currentMatch: initialCurrentMatch,
    previousMatch: initialPreviousMatch,
    upNext: initialUpNext,
    leaderboard: initialLeaderboard,
    leagueStatus: initialStatus,
  });

  useEffect(() => {
    let cancelled = false;

    async function pollLiveState() {
      try {
        const response = await fetch(apiUrl("/api/league/live"), { cache: "no-store" });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as LiveLeagueState;
        if (!cancelled) {
          setState({
            currentMatch: payload.currentMatch,
            previousMatch: payload.previousMatch ?? fallbackLiveState.previousMatch,
            upNext: payload.upNext ?? fallbackLiveState.upNext,
            leaderboard: payload.leaderboard.length > 0 ? payload.leaderboard : fallbackLiveState.leaderboard,
            leagueStatus: payload.leagueStatus,
          });
        }
      } catch {
        return;
      }
    }

    void pollLiveState();
    const interval = window.setInterval(() => {
      void pollLiveState();
    }, 3000);

    return () => {
      cancelled = true;
      window.clearInterval(interval);
    };
  }, []);

  return (
    <BroadcastArena
      currentMatch={state.currentMatch}
      previousMatch={state.previousMatch}
      upNext={state.upNext}
      status={state.leagueStatus}
      leaderboard={state.leaderboard}
    />
  );
}
