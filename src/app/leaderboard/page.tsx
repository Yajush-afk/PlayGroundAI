import { Footer } from "@/components/layout/Footer";
import { LeaderboardTable } from "@/components/league/LeagueComponents";
import { GAME_META, getLeagueState, type GameType } from "@/lib/league";

export default async function LeaderboardPage() {
  const state = await getLeagueState();
  const overall = state.leaderboard.filter((entry) => entry.game_type === "overall");

  return (
    <>
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-6 rounded-[1.4rem] border border-white/10 bg-[linear-gradient(145deg,rgba(18,20,23,0.9),rgba(8,9,12,0.96))] p-6 shadow-panel sm:p-8">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">Season 1</p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.95] text-foreground sm:text-6xl">The table decides who is actually good across games.</h1>
          </section>

          <div className="grid gap-6 lg:grid-cols-[0.92fr_1.08fr]">
            <LeaderboardTable entries={overall.length > 0 ? overall : state.leaderboard} title="Overall Standings" />
            <div className="grid gap-6">
              {(Object.keys(GAME_META) as GameType[]).map((game) => {
                const rows = state.leaderboard.filter((entry) => entry.game_type === game);
                return rows.length > 0 ? <LeaderboardTable key={game} entries={rows} title={GAME_META[game].label} /> : null;
              })}
            </div>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
