import Link from "next/link";
import {
  ArrowRight,
  BookOpen,
  Laugh,
  Scale,
  Sparkles,
  Swords,
  Trophy,
} from "lucide-react";

const personas = [
  {
    name: "Aria",
    role: "Progressive Idealist",
    note: "Frames debates through systems, vulnerability, and lived stakes.",
    accent: "text-[#cf97ff]",
    glow: "from-[#cf97ff]/24 via-[#cf97ff]/10 to-transparent",
  },
  {
    name: "Lex",
    role: "Libertarian Analyst",
    note: "Cold statistical pressure with a bias toward liberty and proof.",
    accent: "text-[#84c6ff]",
    glow: "from-[#84c6ff]/24 via-[#84c6ff]/10 to-transparent",
  },
  {
    name: "Sage",
    role: "Philosophical Interrogator",
    note: "Treats every contradiction as evidence and every certainty as bait.",
    accent: "text-[#95ddb5]",
    glow: "from-[#95ddb5]/24 via-[#95ddb5]/10 to-transparent",
  },
  {
    name: "Rex",
    role: "Traditionalist Hammer",
    note: "Defends continuity, order, and ideas that survived history's pressure.",
    accent: "text-[#ff9b84]",
    glow: "from-[#ff9b84]/24 via-[#ff9b84]/10 to-transparent",
  },
];

const upcomingModes = [
  {
    title: "Joke Battle",
    href: "/joke-battle",
    icon: Laugh,
    copy: "A sharp two-model duel where timing, wit, and escalation matter more than pure logic.",
  },
  {
    title: "Story Simulation",
    href: "/story-sim",
    icon: BookOpen,
    copy: "Role-assigned AI fiction with personalities colliding inside one controlled narrative chamber.",
  },
  {
    title: "Leaderboard",
    href: "/leaderboard",
    icon: Trophy,
    copy: "Track which personas keep winning when the same topics are stress-tested at scale.",
  },
];

export default function Home() {
  return (
    <div className="relative overflow-hidden px-4 pb-10 sm:px-6 lg:px-8">
      <main className="mx-auto flex max-w-7xl flex-col gap-8">
        <section className="surface-panel ornate-border relative overflow-hidden rounded-[2.25rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-12 lg:py-14">
          <div className="absolute inset-y-0 right-0 hidden w-[38%] border-l border-white/5 bg-[linear-gradient(180deg,rgba(214,138,78,0.08),transparent_40%,rgba(88,135,132,0.06))] lg:block" />
          <div className="grid gap-10 lg:grid-cols-[1.15fr_0.85fr] lg:items-end">
            <div className="relative z-10 space-y-8">
              <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
                <div className="space-y-4">
                  <span className="section-kicker">Live Reasoning Arena</span>
                  <div className="max-w-4xl space-y-4">
                    <h1 className="font-display text-6xl leading-[0.9] tracking-tight text-foreground sm:text-7xl lg:text-[6.5rem]">
                      Where AI personas stop agreeing and start colliding.
                    </h1>
                    <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                      PlayGroundAI stages structured ideological combat between purpose-built AI voices, then hands the transcript to a neutral judge. It is part spectacle, part product, part observatory for how models reason under pressure.
                    </p>
                  </div>
                </div>
                <div className="rounded-[1.5rem] border border-accent/25 bg-black/20 px-5 py-4 shadow-soft sm:max-w-[14rem]">
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.28em] text-accent">Current Mode</p>
                  <p className="mt-2 font-display text-3xl text-foreground">Debate Arena</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Four voices. Real-time stream. One verdict.
                  </p>
                </div>
              </div>

              <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                <Link
                  href="/debates"
                  className="grain-button inline-flex items-center justify-center gap-3 rounded-full border border-accent/40 bg-accent px-7 py-4 font-mono text-xs uppercase tracking-[0.22em] text-accent-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(214,138,78,0.24)]"
                >
                  Enter The Arena
                  <ArrowRight className="h-4 w-4" />
                </Link>
                <a
                  href="https://x.com/Yajush_who"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-3 rounded-full border border-border/70 bg-white/[0.03] px-6 py-4 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:border-accent/30 hover:text-foreground"
                >
                  Follow Build Notes
                </a>
              </div>

              <div className="grid gap-4 pt-4 sm:grid-cols-3">
                <div className="rounded-[1.4rem] border border-border/60 bg-white/[0.03] p-5">
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">
                    Streaming
                  </p>
                  <p className="mt-3 font-display text-3xl text-foreground">SSE</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Token-by-token responses arrive live instead of appearing as a static wall of text.
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-border/60 bg-white/[0.03] p-5">
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">
                    Arbitration
                  </p>
                  <p className="mt-3 font-display text-3xl text-foreground">Gemini</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Justice Nyay scores logic, clarity, evidence, and engagement with structured output.
                  </p>
                </div>
                <div className="rounded-[1.4rem] border border-border/60 bg-white/[0.03] p-5">
                  <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">
                    Thesis
                  </p>
                  <p className="mt-3 font-display text-3xl text-foreground">Prompt = Persona</p>
                  <p className="mt-2 text-sm leading-6 text-muted-foreground">
                    Every model is given a worldview, debating instinct, and weakness it must own.
                  </p>
                </div>
              </div>
            </div>

            <div className="relative z-10 flex flex-col gap-4 lg:pl-6">
              <div className="rounded-[1.8rem] border border-accent/20 bg-[radial-gradient(circle_at_top,rgba(214,138,78,0.22),transparent_55%),linear-gradient(180deg,rgba(255,255,255,0.03),rgba(255,255,255,0.01))] p-6 shadow-soft">
                <div className="flex items-center justify-between">
                  <span className="font-mono text-[0.62rem] uppercase tracking-[0.3em] text-accent">
                    Observatory Readout
                  </span>
                  <Scale className="h-5 w-5 text-accent" />
                </div>
                <div className="mt-8 space-y-5">
                  <div className="flex items-end justify-between border-b border-white/8 pb-4">
                    <div>
                      <p className="font-display text-5xl text-foreground">04</p>
                      <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">
                        fixed personas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-display text-5xl text-foreground">01</p>
                      <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">
                        neutral judge
                      </p>
                    </div>
                  </div>
                  <div className="grid gap-3">
                    {personas.map((persona) => (
                      <div
                        key={persona.name}
                        className={`rounded-[1.2rem] border border-white/8 bg-gradient-to-r ${persona.glow} p-4`}
                      >
                        <div className="flex items-center justify-between gap-3">
                          <div>
                            <p className={`font-display text-3xl ${persona.accent}`}>{persona.name}</p>
                            <p className="font-mono text-[0.6rem] uppercase tracking-[0.24em] text-muted-foreground">
                              {persona.role}
                            </p>
                          </div>
                          <Sparkles className={`h-4 w-4 ${persona.accent}`} />
                        </div>
                        <p className="mt-3 text-sm leading-6 text-foreground/78">{persona.note}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="grid gap-8 lg:grid-cols-[0.85fr_1.15fr]">
          <div className="surface-panel rounded-[2rem] p-7 sm:p-8">
            <span className="section-kicker">Why It Feels Different</span>
            <div className="mt-6 space-y-6">
              <h2 className="font-display text-4xl leading-tight text-foreground sm:text-5xl">
                This is less chatbot, more editorialized collision chamber.
              </h2>
              <p className="text-base leading-7 text-muted-foreground">
                The interface is designed like a late-night debate salon crossed with a technical observatory. The memorable element is not a mascot or gimmick. It is the feeling that every screen is a stage built to expose reasoning under heat.
              </p>
            </div>
          </div>

          <div className="surface-panel rounded-[2rem] p-7 sm:p-8">
            <div className="flex items-center justify-between gap-4">
              <span className="section-kicker">Arena Mechanics</span>
              <Swords className="h-5 w-5 text-accent" />
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-3">
              <div className="rounded-[1.4rem] border border-border/60 bg-black/20 p-5">
                <p className="font-display text-3xl text-foreground">01</p>
                <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-accent">
                  Configure
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Choose a topic, pick the number of rounds, or switch into demo mode for UI-only runs.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-border/60 bg-black/20 p-5">
                <p className="font-display text-3xl text-foreground">02</p>
                <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-accent">
                  Observe
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Watch each persona stream its argument live, round by round, while history accumulates in the grid.
                </p>
              </div>
              <div className="rounded-[1.4rem] border border-border/60 bg-black/20 p-5">
                <p className="font-display text-3xl text-foreground">03</p>
                <p className="mt-3 font-mono text-[0.62rem] uppercase tracking-[0.24em] text-accent">
                  Judge
                </p>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">
                  Send the full transcript to Justice Nyay and get a winner, strongest moment, and scored breakdown.
                </p>
              </div>
            </div>
          </div>
        </section>

        <section className="surface-panel rounded-[2rem] p-7 sm:p-8 lg:p-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="section-kicker">Expansion Surface</span>
              <h2 className="mt-5 font-display text-4xl leading-tight text-foreground sm:text-5xl">
                More modes are staged as extensions of the same arena logic.
              </h2>
            </div>
            <p className="max-w-xl text-sm leading-7 text-muted-foreground sm:text-base">
              The product idea is larger than debate: humor duels, narrative simulations, and ranking systems all belong to the same world if the interface feels authored instead of templated.
            </p>
          </div>

          <div className="mt-8 grid gap-4 lg:grid-cols-3">
            {upcomingModes.map((mode) => {
              const Icon = mode.icon;
              return (
                <Link
                  key={mode.title}
                  href={mode.href}
                  className="group rounded-[1.6rem] border border-border/60 bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(0,0,0,0.1))] p-6 transition-all duration-300 hover:-translate-y-1 hover:border-accent/35 hover:bg-[linear-gradient(180deg,rgba(214,138,78,0.09),rgba(0,0,0,0.12))]"
                >
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex h-12 w-12 items-center justify-center rounded-full border border-accent/25 bg-accent/10 text-accent">
                      <Icon className="h-5 w-5" />
                    </div>
                    <ArrowRight className="h-4 w-4 text-muted-foreground transition-transform duration-300 group-hover:translate-x-1 group-hover:text-accent" />
                  </div>
                  <h3 className="mt-8 font-display text-3xl text-foreground">{mode.title}</h3>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{mode.copy}</p>
                </Link>
              );
            })}
          </div>
        </section>
      </main>

      <footer className="mx-auto mt-8 max-w-7xl px-2 pb-6 pt-2">
        <div className="flex flex-col gap-3 rounded-[1.6rem] border border-border/60 bg-black/20 px-6 py-5 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">
            Built by Yajush Srivastava · 2026
          </p>
          <p className="max-w-xl text-sm leading-6">
            PlayGroundAI is an interface for watching ideas break, recover, and win in public.
          </p>
        </div>
      </footer>
    </div>
  );
}
