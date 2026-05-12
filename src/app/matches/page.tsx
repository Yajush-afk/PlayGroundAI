import Link from "next/link";
import { Footer } from "@/components/layout/Footer";
import { MatchCard } from "@/components/league/LeagueComponents";
import { GAME_META, getMatches, type GameType } from "@/lib/league";

interface MatchesPageProps {
  searchParams: Promise<{ gameType?: string }>;
}

function resolveGameType(value?: string): GameType | undefined {
  return value === "debate" || value === "joke" || value === "scenario" ? value : undefined;
}

export default async function MatchesPage({ searchParams }: MatchesPageProps) {
  const params = await searchParams;
  const gameType = resolveGameType(params.gameType);
  const matches = await getMatches(gameType);

  return (
    <>
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-6 rounded-[1.4rem] border border-white/10 bg-[linear-gradient(145deg,rgba(18,20,23,0.9),rgba(8,9,12,0.96))] p-6 shadow-panel sm:p-8">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">Match Archive</p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.95] text-foreground sm:text-6xl">
              {gameType ? GAME_META[gameType].label : "Every official broadcast lives here."}
            </h1>
          </section>

          <div className="mb-5 flex flex-wrap gap-2">
            <Link href="/matches" className="topic-pill">All</Link>
            {(Object.keys(GAME_META) as GameType[]).map((game) => (
              <Link key={game} href={`/matches?gameType=${game}`} className={`topic-pill ${gameType === game ? "active" : ""}`}>
                {GAME_META[game].label}
              </Link>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {matches.map((match) => (
              <MatchCard key={match.id} match={match} />
            ))}
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
