"use client";

import Link from "next/link";
import { motion } from "motion/react";
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
      <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-[1fr_0.9fr]">
        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="border-b border-white/8 px-0 py-6 sm:py-10"
        >
          <div className="flex h-14 w-14 items-center justify-center rounded-full bg-secondary text-foreground/80">
            <Icon className="h-6 w-6" />
          </div>
          <div className="mt-6 space-y-4">
            <span className="section-kicker">{eyebrow}</span>
            <h1 className="font-display text-5xl leading-[0.92] text-foreground sm:text-6xl">{title}</h1>
            <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">{description}</p>
          </div>

          <div className="mt-8 flex flex-col gap-3 sm:flex-row">
            <Link
              href="/debates"
              className="grain-button inline-flex items-center justify-center gap-3 rounded-full bg-primary px-6 py-4 font-mono text-xs uppercase tracking-[0.2em] text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
            >
              Enter Debate Arena
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center justify-center rounded-full border border-white/8 bg-white/5 px-6 py-4 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
            >
              Back Home
            </Link>
          </div>
        </motion.section>

        <motion.section
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.55, ease: "easeOut", delay: 0.08 }}
          className="border-t border-white/8 px-0 py-6 sm:border-l sm:border-t-0 sm:pl-10 sm:py-10"
        >
          <span className="section-kicker">Status</span>
          <p className="mt-6 font-display text-4xl text-foreground">{phase}</p>
          <p className="mt-3 text-sm leading-7 text-muted-foreground">
            This mode is still being shaped into a distinct interaction pattern so it feels native to PlayGroundAI rather than a cosmetic variation.
          </p>
        </motion.section>
      </div>
    </main>
  );
}
