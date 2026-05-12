"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";
import { Activity, ArrowRight, CalendarClock, CircleDollarSign, Crown, Gauge, RadioTower, Shield, Sparkles, Trophy, Zap } from "lucide-react";
import {
  GAME_META,
  PERSONA_META,
  PERSONAS,
  averageScore,
  formatDate,
  type GameType,
  type LeaderboardEntry,
  type LeagueMatch,
  type LeagueStatus,
  type MatchDetail,
  type MatchRound,
  type Persona,
} from "@/lib/league";

const personaBorder: Record<Persona, string> = {
  Aria: "border-purple-400/35 bg-purple-400/[0.055]",
  Lex: "border-blue-400/35 bg-blue-400/[0.055]",
  Sage: "border-emerald-400/35 bg-emerald-400/[0.055]",
  Rex: "border-red-400/35 bg-red-400/[0.055]",
};

const gameBadge: Record<GameType, string> = {
  debate: "border-sky-300/25 bg-sky-300/[0.08] text-sky-200",
  joke: "border-yellow-300/25 bg-yellow-300/[0.08] text-yellow-200",
  scenario: "border-emerald-300/25 bg-emerald-300/[0.08] text-emerald-200",
};

export function LeagueStatusStrip({ status }: { status: LeagueStatus }) {
  const tone = status.coolingDown ? "text-yellow-200 border-yellow-300/25 bg-yellow-300/[0.08]" : "text-emerald-200 border-emerald-300/25 bg-emerald-300/[0.08]";
  return (
    <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[0.58rem] uppercase tracking-[0.18em] ${tone}`}>
      {status.coolingDown ? <CalendarClock className="h-3.5 w-3.5" /> : <RadioTower className="h-3.5 w-3.5" />}
      {status.coolingDown ? "League cooling down" : status.generationEnabled ? "Official league armed" : "Replay mode"}
    </div>
  );
}

export function PersonaBadge({ persona, compact = false }: { persona: Persona; compact?: boolean }) {
  const meta = PERSONA_META[persona];
  return (
    <div className={`inline-flex max-w-full min-w-0 items-center gap-2 rounded-full border px-2.5 py-2 sm:gap-3 sm:px-3 ${personaBorder[persona]}`}>
      <Image src={meta.avatar} alt={persona} width={compact ? 28 : 34} height={compact ? 28 : 34} className="h-7 w-7 rounded-full object-cover" />
      <div className="min-w-0">
        <p className={`font-display text-lg leading-none ${meta.text}`}>{persona}</p>
        {!compact ? <p className="truncate font-mono text-[0.5rem] uppercase tracking-[0.16em] text-muted-foreground">{meta.title}</p> : null}
      </div>
    </div>
  );
}

export function LatestMatchArena({ match, status }: { match: LeagueMatch; status: LeagueStatus }) {
  const meta = GAME_META[match.game_type];
  return (
    <section className="relative border-b border-white/8 px-3 pb-8 pt-3 sm:px-6 sm:pb-10 sm:pt-4 lg:px-8">
      <div className="mx-auto grid h-full max-w-7xl gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="flex min-h-[28rem] flex-col justify-between rounded-[1.1rem] border border-white/10 bg-[linear-gradient(145deg,rgba(15,18,22,0.92),rgba(8,9,12,0.96))] p-4 shadow-panel sm:min-h-[31rem] sm:rounded-[1.4rem] sm:p-7">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] ${gameBadge[match.game_type]}`}>
              <Zap className="h-3.5 w-3.5" />
              {meta.label}
            </div>
            <LeagueStatusStrip status={status} />
          </div>

          <div className="py-8 sm:py-10">
            <p className="font-mono text-[0.65rem] uppercase tracking-[0.24em] text-muted-foreground">Latest Official Match</p>
            <h1 className="mt-5 max-w-4xl font-display text-4xl leading-[0.95] text-foreground sm:text-6xl lg:text-7xl">
              AI personas battle for the monthly league table.
            </h1>
            <p className="mt-6 max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">{match.prompt}</p>
          </div>

          <div className="grid gap-3 border-t border-white/8 pt-5 sm:grid-cols-3">
            <StatTile label="Winner" value={match.winner ?? "Pending"} icon={<Crown className="h-4 w-4" />} />
            <StatTile label="Format" value={meta.format} icon={<Activity className="h-4 w-4" />} />
            <StatTile label="Judged" value={formatDate(match.completed_at)} icon={<Gauge className="h-4 w-4" />} />
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <ScoreboardPreview match={match} />
          <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.035] p-5">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-muted-foreground">Judge Summary</p>
            <p className="mt-4 text-sm leading-6 text-foreground/78">{match.summary ?? "The next official result will appear here after the judge scores the stored match."}</p>
            <Link href={`/matches/${match.id}`} className="mt-5 inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-foreground transition-colors hover:text-yellow-200">
              Open replay <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
          <GameModeRail />
        </div>
      </div>
    </section>
  );
}

export function BroadcastArena({
  currentMatch,
  previousMatch,
  upNext,
  status,
  leaderboard,
}: {
  currentMatch: LeagueMatch | null;
  previousMatch: LeagueMatch | null;
  upNext: LeagueMatch | null;
  status: LeagueStatus;
  leaderboard: LeaderboardEntry[];
}) {
  const centerMatch = currentMatch ?? previousMatch ?? upNext;
  const hasLiveMatch = currentMatch !== null;
  const centerStatus = hasLiveMatch ? "Current Match In Progress" : "No Match Running";
  const meta = centerMatch ? GAME_META[centerMatch.game_type] : GAME_META.debate;
  const overall = leaderboard.filter((entry) => entry.game_type === "overall");

  return (
    <section className="border-b border-white/8 px-3 pb-8 pt-3 sm:px-6 sm:pb-10 sm:pt-4 lg:px-8">
      <div className="mx-auto grid max-w-7xl gap-4 lg:grid-cols-[17rem_minmax(0,1fr)_19rem]">
        <div className="order-2 lg:order-1">
          <BroadcastSideCard title="Previous Match" match={previousMatch} emptyText="No completed official match yet." />
        </div>

        <div className="order-1 overflow-hidden rounded-[1.15rem] border border-white/12 bg-[linear-gradient(145deg,rgba(18,20,23,0.96),rgba(6,7,10,0.99))] shadow-panel sm:rounded-[1.5rem] lg:order-2">
          <div className="border-b border-white/8 bg-white/[0.025] px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${hasLiveMatch ? "animate-pulse bg-emerald-300 shadow-[0_0_18px_rgba(80,220,150,0.7)]" : "bg-yellow-200 shadow-[0_0_14px_rgba(250,220,120,0.55)]"}`} />
                <p className="font-mono text-[0.62rem] uppercase tracking-[0.22em] text-foreground/82">Broadcast Control</p>
              </div>
              <LeagueStatusStrip status={status} />
            </div>
          </div>

          <div className="p-4 sm:p-6">
            <div className="grid gap-4 md:grid-cols-[1fr_auto] md:items-start">
              <div>
                <div className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 font-mono text-[0.6rem] uppercase tracking-[0.18em] ${gameBadge[centerMatch?.game_type ?? "debate"]}`}>
                  <Zap className="h-3.5 w-3.5" />
                  {meta.label}
                </div>
                <p className="mt-5 font-mono text-[0.72rem] uppercase tracking-[0.26em] text-yellow-100/70">{centerStatus}</p>
                <h1 className="mt-4 max-w-4xl font-display text-4xl leading-[0.95] text-foreground sm:text-6xl">
                  {centerMatch?.prompt ?? "Official broadcast will appear here."}
                </h1>
              </div>

              <div className="rounded-xl border border-white/8 bg-background/40 p-4 md:w-48">
                <p className="font-mono text-[0.55rem] uppercase tracking-[0.18em] text-muted-foreground">Match State</p>
                <p className="mt-3 font-display text-3xl capitalize leading-none text-foreground">{centerMatch?.status ?? "idle"}</p>
                <p className="mt-3 text-xs leading-5 text-muted-foreground">{hasLiveMatch ? "Generation is owned by the backend runner." : "Use admin runner to queue or start a match."}</p>
              </div>
            </div>

            <BroadcastProgress status={centerMatch?.status ?? "idle"} />

            <div className="mt-5 grid gap-3 border-t border-white/8 pt-5 sm:grid-cols-3">
              <StatTile label="Current" value={hasLiveMatch ? "Live" : "Replay"} icon={<Activity className="h-4 w-4" />} />
              <StatTile label="Winner" value={centerMatch?.winner ?? "Pending"} icon={<Crown className="h-4 w-4" />} />
              <StatTile label="Format" value={meta.format} icon={<Gauge className="h-4 w-4" />} />
            </div>

            {centerMatch ? (
              <Link href={`/matches/${centerMatch.id}`} className="mt-5 inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-foreground transition-colors hover:text-yellow-200">
                Open broadcast replay <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            ) : null}
          </div>
        </div>

        <div className="order-3 grid gap-4">
          <BroadcastSideCard title="Up Next" match={upNext} emptyText="No queued match. Use the admin runner to queue one." />
          <MiniStandings entries={overall.length > 0 ? overall : leaderboard} />
        </div>
      </div>
    </section>
  );
}

function BroadcastProgress({ status }: { status: string }) {
  const steps = ["queued", "running", "judging", "completed"];
  const currentIndex = Math.max(0, steps.indexOf(status));
  return (
    <div className="mt-6 grid gap-2 sm:grid-cols-4">
      {steps.map((step, index) => {
        const active = index <= currentIndex || status === "failed";
        return (
          <div key={step} className={`rounded-xl border px-3 py-3 ${active ? "border-yellow-200/24 bg-yellow-200/[0.06] text-yellow-50" : "border-white/8 bg-white/[0.025] text-muted-foreground"}`}>
            <p className="font-mono text-[0.54rem] uppercase tracking-[0.18em]">Step {index + 1}</p>
            <p className="mt-2 font-display text-xl capitalize leading-none">{step}</p>
          </div>
        );
      })}
    </div>
  );
}

function BroadcastSideCard({ title, match, emptyText }: { title: string; match: LeagueMatch | null; emptyText: string }) {
  return (
    <section className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4">
      <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-muted-foreground">{title}</p>
      {match ? (
        <>
          <div className={`mt-4 inline-flex rounded-full border px-3 py-1.5 font-mono text-[0.52rem] uppercase tracking-[0.16em] ${gameBadge[match.game_type]}`}>
            {GAME_META[match.game_type].label}
          </div>
          <h2 className="mt-4 line-clamp-3 font-display text-2xl leading-tight text-foreground">{match.prompt}</h2>
          <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/8 pt-4">
            <span className="font-mono text-[0.55rem] uppercase tracking-[0.16em] text-muted-foreground">{match.status}</span>
            {match.winner ? <PersonaBadge persona={match.winner} compact /> : null}
          </div>
        </>
      ) : (
        <p className="mt-4 text-sm leading-6 text-muted-foreground">{emptyText}</p>
      )}
    </section>
  );
}

function MiniStandings({ entries }: { entries: LeaderboardEntry[] }) {
  const sorted = [...entries].sort((a, b) => b.total_points - a.total_points).slice(0, 4);
  return (
    <section className="rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-muted-foreground">Standings</p>
        <Trophy className="h-5 w-5 text-yellow-200" />
      </div>
      <div className="mt-4 space-y-2">
        {sorted.map((entry, index) => (
          <div key={`${entry.game_type}-${entry.persona_name}`} className="flex items-center justify-between gap-3 rounded-xl border border-white/7 bg-background/35 p-3">
            <div className="flex min-w-0 items-center gap-2">
              <span className="font-mono text-xs text-muted-foreground">#{index + 1}</span>
              <PersonaBadge persona={entry.persona_name} compact />
            </div>
            <p className="font-display text-2xl text-foreground">{entry.total_points}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function StatTile({ label, value, icon }: { label: string; value: string; icon: ReactNode }) {
  return (
    <div className="rounded-xl border border-white/8 bg-white/[0.035] p-4">
      <div className="flex items-center gap-2 text-muted-foreground">{icon}<span className="font-mono text-[0.56rem] uppercase tracking-[0.18em]">{label}</span></div>
      <p className="mt-3 font-display text-2xl leading-none text-foreground">{value}</p>
    </div>
  );
}

function ScoreboardPreview({ match }: { match: LeagueMatch }) {
  return (
    <div className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4">
      <div className="mb-4 flex items-center justify-between gap-3">
        <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-muted-foreground">Contestants</p>
        <span className="rounded-full border border-white/8 px-2.5 py-1 font-mono text-[0.52rem] uppercase tracking-[0.16em] text-muted-foreground">Season 1</span>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        {PERSONAS.map((persona) => (
          <div key={persona} className={`rounded-xl border p-3 ${personaBorder[persona]} ${match.winner === persona ? "ring-1 ring-yellow-200/40" : ""}`}>
            <PersonaBadge persona={persona} compact />
            <p className="mt-3 text-xs leading-5 text-muted-foreground">{PERSONA_META[persona].bio}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

export function GameModeRail() {
  return (
    <div className="grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
      {(Object.keys(GAME_META) as GameType[]).map((game) => (
        <Link key={game} href={`/matches?gameType=${game}`} className={`rounded-xl border p-4 transition-transform hover:-translate-y-0.5 ${gameBadge[game]}`}>
          <p className="font-display text-xl leading-tight sm:text-2xl">{GAME_META[game].label}</p>
          <p className="mt-2 text-xs leading-5 opacity-75">{GAME_META[game].short}</p>
        </Link>
      ))}
    </div>
  );
}

export function LeaderboardTable({ entries, title = "Season Standings" }: { entries: LeaderboardEntry[]; title?: string }) {
  const sorted = [...entries].sort((a, b) => b.total_points - a.total_points);
  return (
    <section className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-4 sm:p-5">
      <div className="mb-4 flex items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-muted-foreground">Leaderboard</p>
          <h2 className="mt-2 font-display text-3xl text-foreground">{title}</h2>
        </div>
        <Trophy className="h-6 w-6 text-yellow-200" />
      </div>
      <div className="space-y-2">
        {sorted.length === 0 ? (
          <div className="rounded-xl border border-white/8 bg-background/35 p-5 text-sm leading-6 text-muted-foreground">
            No scored matches yet. Once the admin runner creates this game type, standings will populate here.
          </div>
        ) : sorted.map((entry, index) => {
          const persona = entry.persona_name;
          return (
            <div key={`${entry.game_type}-${persona}`} className="grid grid-cols-[1fr_auto] items-center gap-3 rounded-xl border border-white/7 bg-background/35 p-3 sm:grid-cols-[auto_1fr_auto]">
              <div className="hidden h-8 w-8 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] font-mono text-xs text-foreground sm:flex">#{index + 1}</div>
              <div className="min-w-0">
                <PersonaBadge persona={persona} compact />
                <div className="mt-2 grid grid-cols-3 gap-2 font-mono text-[0.54rem] uppercase tracking-[0.13em] text-muted-foreground sm:flex sm:gap-4">
                  <span>{entry.wins} wins</span>
                  <span>{entry.matches_played} played</span>
                  <span>{averageScore(entry)} avg</span>
                </div>
              </div>
              <div className="text-right">
                <p className="font-display text-3xl leading-none text-foreground">{entry.total_points}</p>
                <p className="font-mono text-[0.52rem] uppercase tracking-[0.16em] text-muted-foreground">pts</p>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

export function MatchCard({ match }: { match: LeagueMatch }) {
  const meta = GAME_META[match.game_type];
  return (
    <Link href={`/matches/${match.id}`} className="group block rounded-[1.1rem] border border-white/8 bg-white/[0.03] p-5 transition-all hover:-translate-y-0.5 hover:border-white/16 hover:bg-white/[0.05]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className={`rounded-full border px-3 py-1.5 font-mono text-[0.55rem] uppercase tracking-[0.16em] ${gameBadge[match.game_type]}`}>{meta.label}</span>
        <span className="font-mono text-[0.56rem] uppercase tracking-[0.18em] text-muted-foreground">{formatDate(match.completed_at)}</span>
      </div>
      <h3 className="mt-4 line-clamp-2 font-display text-2xl leading-tight text-foreground">{match.prompt}</h3>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/8 pt-4">
        {match.winner ? <PersonaBadge persona={match.winner} compact /> : <span className="text-sm text-muted-foreground">Awaiting judge</span>}
        <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-foreground" />
      </div>
    </Link>
  );
}

export function MatchReplay({ detail }: { detail: MatchDetail }) {
  return (
    <div className="space-y-5">
      {detail.rounds.map((round) => (
        <RoundBlock key={`${round.round_index}-${round.pair_key ?? round.round_type}`} round={round} />
      ))}
    </div>
  );
}

function RoundBlock({ round }: { round: MatchRound }) {
  return (
    <section className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="font-mono text-[0.58rem] uppercase tracking-[0.2em] text-muted-foreground">Round {round.round_index}</p>
          <h2 className="mt-1 font-display text-3xl capitalize text-foreground">{round.pair_key?.replace("-", " ") ?? round.round_type.replace("_", " ")}</h2>
        </div>
        <Shield className="h-5 w-5 text-muted-foreground" />
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {round.entries.map((entry, index) => (
          <article key={`${entry.persona}-${index}`} className={`rounded-xl border p-4 ${personaBorder[entry.persona]}`}>
            <PersonaBadge persona={entry.persona} />
            <p className="mt-4 text-sm leading-6 text-foreground/80">{entry.text}</p>
          </article>
        ))}
      </div>
    </section>
  );
}

export function ParticipantPodium({ detail }: { detail: MatchDetail }) {
  return (
    <section className="rounded-[1.2rem] border border-white/8 bg-white/[0.03] p-5">
      <p className="font-mono text-[0.58rem] uppercase tracking-[0.22em] text-muted-foreground">Final Scores</p>
      <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {detail.participants.map((participant) => (
          <div key={participant.persona_name} className={`rounded-xl border p-4 ${personaBorder[participant.persona_name]}`}>
            <div className="flex items-start justify-between gap-3">
              <PersonaBadge persona={participant.persona_name} compact />
              <span className="font-mono text-xs text-muted-foreground">#{participant.final_rank ?? "-"}</span>
            </div>
            <p className="mt-5 font-display text-4xl leading-none text-foreground">{participant.points_awarded + participant.bonus_points}</p>
            <p className="mt-1 font-mono text-[0.56rem] uppercase tracking-[0.16em] text-muted-foreground">{participant.total_score} judge score</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function AgentGrid() {
  return (
    <div className="grid gap-4 md:grid-cols-2">
      {PERSONAS.map((persona) => (
        <article key={persona} className={`rounded-[1.2rem] border p-5 ${personaBorder[persona]}`}>
          <div className="flex items-center gap-4">
            <Image src={PERSONA_META[persona].avatar} alt={persona} width={64} height={64} className="h-16 w-16 rounded-full object-cover" />
            <div>
              <h2 className={`font-display text-4xl leading-none ${PERSONA_META[persona].text}`}>{persona}</h2>
              <p className="mt-1 font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">{PERSONA_META[persona].title}</p>
            </div>
          </div>
          <p className="mt-5 text-sm leading-6 text-foreground/75">{PERSONA_META[persona].bio}</p>
          <div className="mt-5 grid grid-cols-3 gap-2">
            <MiniSignal label="Debate" />
            <MiniSignal label="Jokes" />
            <MiniSignal label="Scenario" />
          </div>
        </article>
      ))}
    </div>
  );
}

function MiniSignal({ label }: { label: string }) {
  return (
    <div className="rounded-lg border border-white/8 bg-background/30 p-3">
      <Sparkles className="h-3.5 w-3.5 text-yellow-200" />
      <p className="mt-2 font-mono text-[0.52rem] uppercase tracking-[0.14em] text-muted-foreground">{label}</p>
    </div>
  );
}

export function CustomLeaguePanel() {
  return (
    <section className="rounded-[1.4rem] border border-white/10 bg-[linear-gradient(145deg,rgba(18,20,23,0.9),rgba(8,9,12,0.96))] p-6 shadow-panel sm:p-8">
      <div className="flex flex-wrap items-start justify-between gap-5">
        <div>
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">BYO API League</p>
          <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.95] text-foreground sm:text-6xl">Run your own private arena without touching official quota.</h1>
        </div>
        <CircleDollarSign className="h-8 w-8 text-yellow-200" />
      </div>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["Keys stay temporary", "The custom league should use user keys for that request/session only."],
          ["Separate standings", "Private runs do not affect the official season leaderboard."],
          ["Richer formats", "Custom matches can later unlock longer debates and alternate providers."],
        ].map(([title, copy]) => (
          <div key={title} className="rounded-xl border border-white/8 bg-white/[0.035] p-4">
            <p className="font-display text-2xl text-foreground">{title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl border border-yellow-200/20 bg-yellow-200/[0.06] p-4 text-sm leading-6 text-yellow-50/78">
        Custom league execution is planned after the official replay and leaderboard flow is stable. This screen is now the product slot for that workflow.
      </div>
    </section>
  );
}

export function AdminLeaguePanel() {
  return (
    <section className="rounded-[1.4rem] border border-white/10 bg-[linear-gradient(145deg,rgba(18,20,23,0.9),rgba(8,9,12,0.96))] p-6 shadow-panel sm:p-8">
      <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">Admin Runner</p>
      <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.95] text-foreground sm:text-6xl">
        Generate official matches without exposing quota to visitors.
      </h1>
      <div className="mt-8 grid gap-4 md:grid-cols-3">
        {[
          ["Protected", "Requires X-Admin-League-Key before any official generation starts."],
          ["Quota aware", "Checks match caps, request caps, cooldowns, and provider locks."],
          ["Replay first", "Generated matches are stored, then public pages only read saved data."],
        ].map(([title, copy]) => (
          <div key={title} className="rounded-xl border border-white/8 bg-white/[0.035] p-4">
            <p className="font-display text-2xl text-foreground">{title}</p>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{copy}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
