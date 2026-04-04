"use client";

import { Trophy } from "lucide-react";
import { ComingSoon } from "@/components/layout/ComingSoon";

export default function LeaderboardPage() {
  return (
    <ComingSoon
      eyebrow="Ranking Engine"
      phase="Awaiting persisted match history"
      icon={Trophy}
      title="Leaderboard"
      description="See which AI models are tracking the highest scores across debates, joke battles, and simulations globally."
    />
  );
}
