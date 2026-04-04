"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowRight, BookOpen, Laugh, MessageSquareText, Scale, Trophy } from "lucide-react";

const personas = [
  { name: "Aria", role: "Progressive", color: "text-purple-400" },
  { name: "Lex", role: "Libertarian", color: "text-blue-400" },
  { name: "Sage", role: "Philosopher", color: "text-green-400" },
  { name: "Rex", role: "Traditionalist", color: "text-red-400" },
];

const features = [
  {
    title: "Live streaming",
    copy: "Each persona speaks in real time so the exchange feels like an unfolding event, not a static answer.",
  },
  {
    title: "Structured judging",
    copy: "Justice Nyay scores logic, clarity, evidence, and engagement after the full transcript is complete.",
  },
  {
    title: "Prompted characters",
    copy: "The models are shaped as personas with worldviews, debate styles, and weaknesses they must own.",
  },
];

const modes = [
  { title: "Joke Battle", href: "/joke-battle", icon: Laugh },
  { title: "Story Simulation", href: "/story-sim", icon: BookOpen },
  { title: "Leaderboard", href: "/leaderboard", icon: Trophy },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function Home() {
  return (
    <main className="px-4 pb-10 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col gap-12">
        <motion.section
          initial="hidden"
          animate="show"
          transition={{ duration: 0.6, ease: "easeOut" }}
          variants={fadeUp}
          className="mt-4 grid min-h-[calc(100svh-7rem)] items-center gap-12 border-b border-white/8 pb-12 pt-4 sm:mt-6 sm:min-h-[calc(100svh-8rem)] sm:pb-16 lg:grid-cols-[1.1fr_0.9fr]"
        >
          <div className="space-y-8">
            <motion.div variants={fadeUp} transition={{ delay: 0.05, duration: 0.55 }} className="space-y-4">
              <span className="section-kicker">Live AI Arena</span>
              <h1 className="font-display text-5xl leading-[0.92] text-foreground sm:text-6xl lg:text-7xl">
                Watch distinct AI personas debate your ideas in public.
              </h1>
              <p className="max-w-2xl text-base leading-7 text-muted-foreground sm:text-lg">
                PlayGroundAI turns prompting into a staged format: four personas, one topic, streamed arguments, and a neutral judge who decides what actually held up.
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ delay: 0.12, duration: 0.55 }}
              className="flex flex-col gap-3 sm:flex-row"
            >
              <Link
                href="/debates"
                className="grain-button inline-flex items-center justify-center gap-3 rounded-full bg-primary px-7 py-4 font-mono text-xs uppercase tracking-[0.2em] text-primary-foreground transition-transform duration-300 hover:-translate-y-0.5"
              >
                Start A Debate
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://x.com/Yajush_who"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center rounded-full border border-white/8 bg-white/5 px-7 py-4 font-mono text-xs uppercase tracking-[0.2em] text-muted-foreground transition-colors hover:text-foreground"
              >
                Follow Updates
              </a>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ delay: 0.18, duration: 0.55 }}
              className="grid gap-4 border-t border-white/8 pt-6 sm:grid-cols-3"
            >
              {features.map((feature, index) => (
                <div
                  key={feature.title}
                  className={`py-2 ${index < features.length - 1 ? "sm:border-r sm:border-white/8 sm:pr-5" : ""} ${index > 0 ? "sm:pl-1" : ""}`}
                >
                  <p className="font-display text-2xl text-foreground">{feature.title}</p>
                  <p className="mt-3 text-sm leading-6 text-muted-foreground">{feature.copy}</p>
                </div>
              ))}
            </motion.div>
          </div>

          <motion.div
            variants={fadeUp}
            transition={{ delay: 0.12, duration: 0.6 }}
            className="border-l-0 border-t border-white/8 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"
          >
            <div className="flex items-center justify-between">
              <span className="section-kicker">Arena Preview</span>
              <Scale className="h-5 w-5 text-muted-foreground" />
            </div>
            <div className="mt-8 space-y-3">
              {personas.map((persona, index) => (
                <motion.div
                  key={persona.name}
                  initial={{ opacity: 0, x: 18 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 + index * 0.08, duration: 0.45, ease: "easeOut" }}
                  className="flex items-center justify-between border-b border-white/8 py-4 last:border-b-0"
                >
                  <div>
                    <p className={`font-display text-3xl ${persona.color}`}>{persona.name}</p>
                    <p className="font-mono text-[0.58rem] uppercase tracking-[0.18em] text-muted-foreground">
                      {persona.role}
                    </p>
                  </div>
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-secondary/70">
                    <MessageSquareText className="h-4 w-4 text-foreground/80" />
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="grid min-h-[calc(100svh-7rem)] content-center gap-8 border-b border-white/8 py-12 sm:min-h-[calc(100svh-8rem)] lg:grid-cols-[0.9fr_1.1fr]"
        >
          <div>
            <span className="section-kicker">Product Thesis</span>
            <h2 className="mt-5 font-display text-4xl leading-tight text-foreground sm:text-5xl">
              The point is not just answers. It is conflict, pressure, and judgment.
            </h2>
          </div>
          <div className="border-t border-white/8 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
            <p className="text-base leading-7 text-muted-foreground sm:text-lg">
              PlayGroundAI works when the interface stays quiet and the ideas become the spectacle. The design should feel precise, minimal, and fast enough that the streamed debate remains the center of attention.
            </p>
          </div>
        </motion.section>

        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.2 }}
          variants={fadeUp}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="flex min-h-[calc(100svh-7rem)] flex-col justify-center py-12 sm:min-h-[calc(100svh-8rem)]"
        >
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
            <div>
              <span className="section-kicker">More Modes</span>
              <h2 className="mt-4 font-display text-4xl text-foreground sm:text-5xl">The arena expands beyond debates.</h2>
            </div>
            <p className="max-w-xl text-sm leading-6 text-muted-foreground sm:text-base">
              These routes are staged next, but the same product language should carry across humor, storytelling, and ranking.
            </p>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {modes.map((mode, index) => {
              const Icon = mode.icon;

              return (
                <motion.div
                  key={mode.title}
                  initial={{ opacity: 0, y: 20 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: index * 0.08, duration: 0.45, ease: "easeOut" }}
                >
                  <Link
                    href={mode.href}
                    className="group block border-t border-white/8 pt-5 transition-colors duration-300 hover:text-foreground"
                  >
                    <div className="flex h-12 w-12 items-center justify-center rounded-full bg-secondary text-foreground/80">
                      <Icon className="h-5 w-5" />
                    </div>
                    <h3 className="mt-6 font-display text-3xl text-foreground">{mode.title}</h3>
                    <div className="mt-4 inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover:text-foreground">
                      Explore route
                      <ArrowRight className="h-3.5 w-3.5" />
                    </div>
                  </Link>
                </motion.div>
              );
            })}
          </div>
        </motion.section>
      </div>
    </main>
  );
}
