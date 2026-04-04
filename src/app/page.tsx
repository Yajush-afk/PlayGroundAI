"use client";

import Link from "next/link";
import Image from "next/image";
import { motion } from "motion/react";
import { ArrowRight, BookOpen, Laugh, MessageSquareText, Scale, Sparkles, Trophy, Zap } from "lucide-react";
import { PERSONA_CONFIG } from "@/components/debates/PersonaCard";
import type { Persona } from "@/components/debates/PersonaCard";
import { Footer } from "@/components/layout/Footer";

const personas: { name: Persona; tagline: string }[] = [
  { name: "Aria", tagline: "Champions human dignity and systemic equity above all." },
  { name: "Lex", tagline: "Follows data where it leads, regardless of comfort." },
  { name: "Sage", tagline: "Questions the premise before answering the question." },
  { name: "Rex", tagline: "Defends what has stood the test of centuries." },
];

const judgeGlow = "rgba(255, 200, 80, 0.2)";

const features = [
  {
    icon: Zap,
    title: "Live streaming",
    copy: "Each persona speaks in real time so the exchange feels like an unfolding event, not a static answer.",
  },
  {
    icon: Scale,
    title: "Structured judging",
    copy: "Justice Nyay scores logic, clarity, evidence, and engagement after the full transcript is complete.",
  },
  {
    icon: Sparkles,
    title: "Prompted characters",
    copy: "The models are shaped as personas with worldviews, debate styles, and weaknesses they must own.",
  },
];

const modes = [
  { title: "Joke Battle", href: "/joke-battle", icon: Laugh, desc: "Two AIs roast each other — humor, style, and wit compete for laughs." },
  { title: "Story Simulation", href: "/story-sim", icon: BookOpen, desc: "Personas co-author branching narratives with tension and consequence." },
  { title: "Leaderboard", href: "/leaderboard", icon: Trophy, desc: "Track which personas have performed best across all debates." },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

const personaGlowMap: Record<Persona, string> = {
  Aria: "rgba(160,100,255,0.22)",
  Lex: "rgba(60,140,255,0.22)",
  Sage: "rgba(60,200,110,0.22)",
  Rex: "rgba(255,80,80,0.22)",
};

export default function Home() {
  return (
    <>
    <main className="px-4 pb-16 sm:px-6 lg:px-8">
      <div className="mx-auto flex max-w-7xl flex-col">

        {/* ── Hero ──────────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          animate="show"
          transition={{ duration: 0.6, ease: "easeOut" }}
          variants={fadeUp}
          className="mt-4 grid min-h-[calc(100svh-7rem)] items-center gap-12 border-b border-white/8 pb-16 pt-4 sm:mt-6 lg:grid-cols-[1.15fr_0.85fr]"
        >
          <div className="space-y-10">
            <motion.div variants={fadeUp} transition={{ delay: 0.05, duration: 0.55 }} className="space-y-5">
              <span className="section-kicker">Live AI Arena</span>
              <h1 className="font-display text-5xl leading-[0.9] text-foreground sm:text-6xl lg:text-[4.5rem]">
                <span className="gradient-text-hero">Watch distinct AI personas</span>{" "}
                <span className="text-foreground/80">debate your ideas in public.</span>
              </h1>
              <p className="max-w-xl text-base leading-7 text-muted-foreground sm:text-lg">
                PlayGroundAI turns prompting into a staged format: four personas, one topic, streamed arguments, and a neutral judge who decides what actually held up.
              </p>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ delay: 0.12, duration: 0.55 }}
              className="flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <Link href="/debates" className="btn-primary">
                Start A Debate
                <ArrowRight className="h-4 w-4" />
              </Link>
              <a
                href="https://x.com/Yajush_who"
                target="_blank"
                rel="noopener noreferrer"
                className="btn-ghost"
              >
                Follow Updates
              </a>
            </motion.div>

            <motion.div
              variants={fadeUp}
              transition={{ delay: 0.18, duration: 0.55 }}
              className="grid gap-5 border-t border-white/8 pt-7 sm:grid-cols-3"
            >
              {features.map((feature, index) => {
                const Icon = feature.icon;
                return (
                  <div
                    key={feature.title}
                    className={`group space-y-3 py-2 ${index < features.length - 1 ? "sm:border-r sm:border-white/8 sm:pr-5" : ""} ${index > 0 ? "sm:pl-2" : ""}`}
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-white/6 text-muted-foreground">
                        <Icon className="h-3.5 w-3.5" />
                      </div>
                      <p className="font-display text-xl text-foreground">{feature.title}</p>
                    </div>
                    <p className="text-sm leading-6 text-muted-foreground">{feature.copy}</p>
                  </div>
                );
              })}
            </motion.div>
          </div>

          {/* ── Arena Preview ──────────────────────────────────── */}
          <motion.div
            variants={fadeUp}
            transition={{ delay: 0.14, duration: 0.6 }}
            className="border-l-0 border-t border-white/8 pt-8 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0"
          >
            <div className="flex items-center justify-between mb-6">
              <span className="section-kicker">Arena Cast</span>
              <div className="live-badge">Live</div>
            </div>

            <div className="space-y-3">
              {personas.map((p, index) => {
                const config = PERSONA_CONFIG[p.name];
                return (
                  <motion.div
                    key={p.name}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.22 + index * 0.08, duration: 0.4, ease: "easeOut" }}
                    className="group flex items-center gap-4 rounded-2xl border border-white/7 bg-white/[0.025] p-4 transition-all duration-300 hover:border-white/14 hover:bg-white/[0.04]"
                    style={{
                      boxShadow: `0 0 0 0 ${personaGlowMap[p.name]}`,
                      transition: "box-shadow 0.3s ease, border-color 0.3s ease, background 0.3s ease",
                    }}
                    whileHover={{ boxShadow: `0 4px 24px ${personaGlowMap[p.name]}` }}
                  >
                    <div className={`h-12 w-12 shrink-0 overflow-hidden rounded-full ${config.bgLight}`}>
                      <Image src={config.avatar} alt={p.name} width={48} height={48} className="h-full w-full object-cover" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className={`font-display text-2xl leading-none ${config.color}`}>{p.name}</p>
                      <p className="mt-1 text-xs leading-snug text-muted-foreground">{p.tagline}</p>
                    </div>
                    <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-white/6 opacity-0 transition-opacity group-hover:opacity-100">
                      <MessageSquareText className="h-3.5 w-3.5 text-muted-foreground" />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            {/* Justice Nyay — Judge card matching persona card style */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.58, duration: 0.4, ease: "easeOut" }}
              className="mt-10 group flex items-center gap-4 rounded-2xl border border-yellow-500/20 bg-white/[0.025] p-4 transition-all duration-300"
              whileHover={{ boxShadow: `0 4px 24px ${judgeGlow}`, borderColor: "rgba(250,200,60,0.4)" }}
            >
              <div className="flex h-12 w-12 shrink-0 overflow-hidden items-center justify-center rounded-full bg-yellow-500/10 ring-1 ring-yellow-500/20">
                <Image src="/avatars/judge.png" alt="Justice Nyay" width={48} height={48} className="h-full w-full object-cover" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-display text-2xl leading-none text-yellow-300">Justice Nyay</p>
                <p className="mt-1 text-xs leading-snug text-muted-foreground">Neutral arbiter — scores logic, clarity, evidence &amp; engagement.</p>
              </div>
              <div className="font-mono text-[0.52rem] uppercase tracking-[0.18em] text-yellow-500/60">Judge</div>
            </motion.div>
          </motion.div>
        </motion.section>

        {/* ── Product Thesis ─────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.15 }}
          variants={fadeUp}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="border-b border-white/8 py-16"
        >
          <div className="mx-auto w-full max-w-5xl grid gap-10 lg:grid-cols-[0.85fr_1.15fr]">
            <motion.div
              variants={fadeUp}
              transition={{ delay: 0.05, duration: 0.5 }}
            >
              <span className="section-kicker">Product Thesis</span>
              <h2 className="mt-5 font-display text-4xl leading-tight text-foreground sm:text-5xl">
                The point is not just answers. It is{" "}
                <span className="text-muted-foreground">conflict, pressure,</span> and judgment.
              </h2>
            </motion.div>
            <div className="space-y-6 border-t border-white/8 pt-6 lg:border-l lg:border-t-0 lg:pl-10 lg:pt-0">
              <motion.p
                variants={fadeUp}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="text-base leading-7 text-muted-foreground sm:text-lg"
              >
                PlayGroundAI works when the interface stays quiet and the ideas become the spectacle. The design should feel precise, minimal, and fast enough that the streamed debate remains the center of attention.
              </motion.p>
              <div className="grid grid-cols-3 gap-4 border-t border-white/8 pt-6">
                {[
                  { value: "4", label: "Distinct Personas" },
                  { value: "3+", label: "Judged Categories" },
                  { value: "Live", label: "Streaming Debate" },
                ].map((stat, i) => (
                  <motion.div
                    key={stat.label}
                    initial={{ opacity: 0, y: 16 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.5 }}
                    transition={{ delay: 0.15 + i * 0.09, duration: 0.45, ease: "easeOut" }}
                  >
                    <p className="font-display text-4xl text-foreground sm:text-5xl">{stat.value}</p>
                    <p className="mt-1 font-mono text-[0.6rem] uppercase tracking-[0.2em] text-muted-foreground">{stat.label}</p>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>
        </motion.section>

        {/* ── More Modes ─────────────────────────────────────────── */}
        <motion.section
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, amount: 0.1 }}
          variants={fadeUp}
          transition={{ duration: 0.55, ease: "easeOut" }}
          className="py-16 pb-10"
        >
          <div className="mx-auto w-full max-w-5xl">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <motion.div variants={fadeUp} transition={{ delay: 0.05, duration: 0.5 }}>
                <span className="section-kicker">More Modes</span>
                <h2 className="mt-4 font-display text-4xl text-foreground sm:text-5xl">The arena expands beyond debates.</h2>
              </motion.div>
              <motion.p
                variants={fadeUp}
                transition={{ delay: 0.1, duration: 0.5 }}
                className="max-w-xs text-sm leading-6 text-muted-foreground sm:text-base"
              >
                Same product language across humor, storytelling, and ranking.
              </motion.p>
            </div>

            <div className="mt-10 grid gap-4 md:grid-cols-3">
              {modes.map((mode, index) => {
                const Icon = mode.icon;
                return (
                  <motion.div
                    key={mode.title}
                    initial={{ opacity: 0, y: 24, scale: 0.97 }}
                    whileInView={{ opacity: 1, y: 0, scale: 1 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ delay: index * 0.1, duration: 0.5, ease: [0.25, 0.46, 0.45, 0.94] }}
                  >
                    <Link
                      href={mode.href}
                      className="group block rounded-2xl border border-white/7 bg-white/[0.025] p-6 transition-all duration-300 hover:border-white/14 hover:bg-white/[0.04]"
                    >
                      <motion.div
                        className="flex h-11 w-11 items-center justify-center rounded-full bg-secondary text-muted-foreground"
                        whileHover={{ scale: 1.12, rotate: 5 }}
                        transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      >
                        <Icon className="h-5 w-5" />
                      </motion.div>
                      <h3 className="mt-5 font-display text-2xl text-foreground">{mode.title}</h3>
                      <p className="mt-2 text-sm leading-6 text-muted-foreground">{mode.desc}</p>
                      <div className="mt-5 inline-flex items-center gap-2 font-mono text-[0.62rem] uppercase tracking-[0.18em] text-muted-foreground transition-colors group-hover:text-foreground">
                        Explore route
                        <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1" />
                      </div>
                    </Link>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </motion.section>
      </div>
    </main>
    <Footer />
    </>
  );
}
