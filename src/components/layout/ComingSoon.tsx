"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, Bell, type LucideIcon } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
  eyebrow: string;
  phase: string;
  icon: LucideIcon;
}

export function ComingSoon({ title, description, eyebrow, phase, icon: Icon }: ComingSoonProps) {
  return (
    <main className="flex min-h-[calc(100svh-5rem)] items-center px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">

          {/* Left — Main info */}
          <motion.section
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, ease: "easeOut" }}
            className="border-b border-white/8 pb-8 lg:border-b-0 lg:border-r lg:pr-10 lg:pb-0"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.7, rotate: -10 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ duration: 0.5, delay: 0.1, type: "spring", stiffness: 280, damping: 20 }}
              className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/30 to-violet-500/30 text-violet-300"
            >
              <Icon className="h-6 w-6" />
            </motion.div>

            <div className="mt-6 space-y-4">
              <motion.span
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.4, delay: 0.18 }}
                className="section-kicker"
              >
                {eyebrow}
              </motion.span>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.22 }}
                className="font-display text-5xl leading-[0.92] text-foreground sm:text-6xl"
              >
                {title}
              </motion.h1>
              <motion.p
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: 0.28 }}
                className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg"
              >
                {description}
              </motion.p>
            </div>

            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.36 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link href="/debates" className="btn-primary">
                Enter Debate Arena
                <ArrowRight className="h-4 w-4" />
              </Link>
              <motion.a
                href="https://x.com/yajush_who"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost inline-flex items-center gap-2"
                whileHover={{ scale: 1.04 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: "spring", stiffness: 380, damping: 22 }}
              >
                <motion.span
                  animate={{ scale: [1, 1.3, 1] }}
                  transition={{ repeat: Infinity, repeatDelay: 2.5, duration: 0.5 }}
                >
                  <Bell className="h-3.5 w-3.5" />
                </motion.span>
                Notify Me on X
              </motion.a>
            </motion.div>
          </motion.section>

          {/* Right — Status */}
          <motion.section
            initial={{ opacity: 0, x: 24 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, ease: "easeOut", delay: 0.1 }}
            className="border-t border-white/8 px-0 py-6 sm:border-l sm:border-t-0 sm:pl-10 sm:py-0"
          >
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.25, duration: 0.4 }}
              className="section-kicker"
            >
              Status
            </motion.span>
            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.32, duration: 0.45 }}
              className="mt-6 font-display text-4xl text-foreground"
            >
              {phase}
            </motion.p>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.38, duration: 0.45 }}
              className="mt-3 text-sm leading-7 text-muted-foreground"
            >
              This mode is still being shaped into a distinct interaction pattern so it feels native to PlayGroundAI rather than a cosmetic variation.
            </motion.p>

            {/* Notify CTA block */}
            <motion.div
              initial={{ opacity: 0, y: 16, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: 0.46, duration: 0.5, type: "spring", stiffness: 260, damping: 22 }}
              className="mt-8 rounded-2xl border border-white/8 bg-white/[0.025] p-5"
            >
              <p className="font-mono text-[0.6rem] uppercase tracking-[0.22em] text-muted-foreground">Get Early Access</p>
              <p className="mt-2 text-sm leading-6 text-foreground/80">
                Follow updates on X to be the first to know when this mode goes live.
              </p>
              <motion.a
                href="https://x.com/yajush_who"
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors hover:text-foreground"
                whileHover={{ x: 3 }}
                transition={{ type: "spring", stiffness: 400, damping: 20 }}
              >
                <Bell className="h-3.5 w-3.5" />
                @Yajush_who on X
                <ArrowRight className="h-3 w-3" />
              </motion.a>
            </motion.div>
          </motion.section>

        </div>
      </div>
    </main>
  );
}
