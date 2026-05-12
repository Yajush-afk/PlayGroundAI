import Link from "next/link";
import { ArrowRight, History, Trophy } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { LeaderboardTable, MatchCard } from "@/components/league/LeagueComponents";
import { LiveBroadcastArena } from "@/components/league/LiveBroadcastArena";
import { getLeagueState, getLiveLeagueState } from "@/lib/league";

export default async function Home() {
  const [state, live] = await Promise.all([getLeagueState(), getLiveLeagueState()]);
  const latest = state.latestMatches[0];
  const overall = state.leaderboard.filter((entry) => entry.game_type === "overall");
  const leaderboard = overall.length > 0 ? overall : state.leaderboard;

  return (
    <>
      <main>
        <LiveBroadcastArena
          initialCurrentMatch={live.currentMatch}
          initialPreviousMatch={live.previousMatch ?? latest}
          initialUpNext={live.upNext}
          initialStatus={live.leagueStatus}
          initialLeaderboard={live.leaderboard.length > 0 ? live.leaderboard : leaderboard}
        />

        <section className="px-4 py-10 sm:px-6 lg:px-8">
          <div className="mx-auto grid max-w-7xl gap-6 lg:grid-cols-[0.82fr_1.18fr]">
            <LeaderboardTable entries={leaderboard} />

            <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-muted-foreground">Recent Broadcasts</p>
                  <h2 className="mt-2 font-display text-3xl text-foreground">Match Archive</h2>
                </div>
                <History className="h-6 w-6 text-muted-foreground" />
              </div>

              <div className="mt-5 grid gap-3 md:grid-cols-2">
                {state.latestMatches.slice(0, 4).map((match) => (
                  <MatchCard key={match.id} match={match} />
                ))}
              </div>

              <div className="mt-5 flex flex-wrap gap-3 border-t border-white/8 pt-5">
                <Link href="/matches" className="btn-primary px-5 py-3 text-[0.62rem]">
                  Browse Matches
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
                <Link href="/leaderboard" className="btn-ghost px-5 py-3 text-[0.62rem]">
                  Full Standings
                  <Trophy className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
