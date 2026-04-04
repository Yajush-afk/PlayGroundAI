import Link from "next/link";
import { ArrowRight, type LucideIcon } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  eyebrow: string;
  phase: string;
  icon: LucideIcon;
}

export function ComingSoon({ title, description, eyebrow, phase, icon: Icon }: ComingSoonProps) {
  return (
    <main className="px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1.05fr_0.95fr]">
        <section className="surface-panel ornate-border rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10 lg:px-10">
          <div className="flex h-14 w-14 items-center justify-center rounded-full border border-accent/30 bg-accent/10 text-accent shadow-soft">
            <Icon className="h-6 w-6" />
          </div>
          <div className="mt-6 space-y-5">
            <span className="section-kicker">{eyebrow}</span>
            <h1 className="font-display text-5xl leading-[0.92] text-foreground sm:text-6xl">{title}</h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">{description}</p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/debates"
              className="grain-button inline-flex items-center justify-center gap-3 rounded-full border border-accent/40 bg-accent px-6 py-4 font-mono text-xs uppercase tracking-[0.22em] text-accent-foreground transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_18px_40px_rgba(214,138,78,0.24)]"
            >
              Enter Debate Arena
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-border/70 bg-white/[0.03] px-6 py-4 font-mono text-xs uppercase tracking-[0.22em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Back To Observatory
            </Link>
          </div>
        </section>

        <section className="surface-panel rounded-[2rem] px-6 py-8 sm:px-8 sm:py-10">
          <span className="section-kicker">Roadmap Signal</span>
          <div className="mt-6 rounded-[1.6rem] border border-accent/24 bg-[linear-gradient(180deg,rgba(214,138,78,0.1),rgba(0,0,0,0.16))] p-6 shadow-soft">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-accent">Status</p>
            <p className="mt-3 font-display text-4xl text-foreground">{phase}</p>
            <p className="mt-3 text-sm leading-7 text-foreground/76">
              This page is intentionally staged as part of the broader PlayGroundAI world. The interface is not missing by accident; it is reserved for the next expansion of the reasoning arena.
            </p>
          </div>

          <div className="mt-5 grid gap-4 sm:grid-cols-2">
            <div className="rounded-[1.4rem] border border-border/60 bg-black/18 p-5">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">Product Goal</p>
              <p className="mt-3 font-display text-3xl text-foreground">Distinct mode logic</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                Each future page should feel mechanically different, not like a reskinned debate route.
              </p>
            </div>
            <div className="rounded-[1.4rem] border border-border/60 bg-black/18 p-5">
              <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">Design Rule</p>
              <p className="mt-3 font-display text-3xl text-foreground">Same universe</p>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">
                The typography, materials, and tone remain consistent so the platform still feels authored as one product.
              </p>
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}
