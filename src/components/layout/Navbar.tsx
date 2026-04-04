"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquareText, Laugh, BookOpen, Trophy, ArrowUpRight } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NAV_ITEMS = [
  { name: "Debates", href: "/debates", icon: MessageSquareText },
  { name: "Joke Battle", href: "/joke-battle", icon: Laugh },
  { name: "Story Sim", href: "/story-sim", icon: BookOpen },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 top-0 z-50 px-4 py-4 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-4 rounded-[1.7rem] border border-border/70 bg-panel/80 px-4 py-3 shadow-panel backdrop-blur-xl sm:px-5">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-accent/40 bg-accent/12 text-[1.1rem] font-semibold text-accent shadow-[0_0_24px_rgba(214,138,78,0.18)] transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-105">
            P
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.58rem] uppercase tracking-[0.34em] text-muted-foreground">
              Reasoning Observatory
            </p>
            <p className="font-display text-[1.55rem] leading-none tracking-[0.03em] text-foreground transition-colors group-hover:text-accent">
              PlayGroundAI
            </p>
          </div>
        </Link>

        <div className="flex items-center gap-1.5 rounded-full border border-border/70 bg-ink/70 p-1.5 shadow-[inset_0_1px_0_rgba(255,248,232,0.05)] sm:gap-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold uppercase tracking-[0.18em] transition-all duration-300 sm:px-4",
                  isActive
                    ? "border-accent/60 bg-accent/14 text-foreground shadow-[0_0_18px_rgba(214,138,78,0.14)]"
                    : "border-transparent text-muted-foreground hover:border-border hover:bg-white/[0.03] hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden lg:inline-block">{item.name}</span>
              </Link>
            );
          })}
        </div>

        <Link
          href="/debates"
          className="hidden items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-4 py-2 font-mono text-[0.62rem] uppercase tracking-[0.22em] text-accent transition-all duration-300 hover:bg-accent hover:text-accent-foreground lg:flex"
        >
          Enter Arena
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </nav>
  );
}
