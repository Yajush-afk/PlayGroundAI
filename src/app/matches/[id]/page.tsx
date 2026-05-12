import Link from "next/link";
import { ArrowLeft, Crown } from "lucide-react";
import { Footer } from "@/components/layout/Footer";
import { MatchReplay, ParticipantPodium, PersonaBadge } from "@/components/league/LeagueComponents";
import { GAME_META, formatDate, getMatchDetail } from "@/lib/league";

interface MatchDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function MatchDetailPage({ params }: MatchDetailPageProps) {
  const { id } = await params;
  const detail = await getMatchDetail(id);
  const meta = GAME_META[detail.match.game_type];

  return (
    <>
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <Link href="/matches" className="mb-5 inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground">
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to archive
          </Link>

          <section className="mb-6 rounded-[1.4rem] border border-white/10 bg-[linear-gradient(145deg,rgba(18,20,23,0.9),rgba(8,9,12,0.96))] p-6 shadow-panel sm:p-8">
            <div className="flex flex-wrap items-start justify-between gap-5">
              <div>
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">{meta.label} · {formatDate(detail.match.completed_at)}</p>
                <h1 className="mt-4 max-w-4xl font-display text-5xl leading-[0.95] text-foreground sm:text-6xl">{detail.match.prompt}</h1>
              </div>
              {detail.match.winner ? (
                <div className="rounded-[1rem] border border-yellow-200/25 bg-yellow-200/[0.07] p-4">
                  <div className="mb-3 flex items-center gap-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-yellow-100/80">
                    <Crown className="h-4 w-4" />
                    Winner
                  </div>
                  <PersonaBadge persona={detail.match.winner} />
                </div>
              ) : null}
            </div>
            {detail.match.summary ? <p className="mt-6 max-w-3xl text-sm leading-6 text-foreground/76">{detail.match.summary}</p> : null}
          </section>

          <div className="space-y-6">
            <ParticipantPodium detail={detail} />
            <MatchReplay detail={detail} />
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
