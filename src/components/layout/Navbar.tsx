"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { ArrowUpRight, Bot, History, KeyRound, Trophy } from "lucide-react";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const NAV_ITEMS = [
  { name: "Matches", href: "/matches", icon: History },
  { name: "Leaderboard", href: "/leaderboard", icon: Trophy },
  { name: "Agents", href: "/agents", icon: Bot },
  { name: "Custom", href: "/custom", icon: KeyRound },
];

export function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 top-0 z-50 px-2 py-3 sm:px-6 lg:px-8">
      <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-2 rounded-[1.1rem] border border-white/8 bg-background/82 px-2.5 py-2.5 shadow-panel backdrop-blur-xl sm:gap-3 sm:rounded-[1.6rem] sm:px-5 sm:py-3">
        <Link href="/" className="group flex min-w-0 items-center gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-yellow-200/25 bg-yellow-200/[0.08] text-sm font-semibold text-yellow-100 transition-transform duration-300 group-hover:scale-105 group-hover:-rotate-6 sm:h-11 sm:w-11 sm:text-base">
            P
          </div>
          <div className="hidden min-w-0 sm:block">
            <p className="font-mono text-[0.56rem] uppercase tracking-[0.28em] text-muted-foreground">
              AI League
            </p>
            <p className="font-display text-[1.45rem] leading-none tracking-[0.02em] text-foreground">
              PlayGroundAI
            </p>
          </div>
        </Link>

        <div className="flex min-w-0 items-center gap-1 overflow-x-auto rounded-full border border-white/8 bg-secondary/70 p-1 sm:gap-2 sm:p-1.5">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex shrink-0 items-center gap-2 rounded-full border px-2.5 py-2 text-xs font-semibold uppercase tracking-[0.12em] transition-all duration-300 sm:px-4 sm:tracking-[0.16em]",
                  isActive
                    ? "border-white/10 bg-white/8 text-foreground"
                    : "border-transparent text-muted-foreground hover:border-white/8 hover:bg-white/5 hover:text-foreground"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                <span className="hidden lg:inline-block">{item.name}</span>
              </Link>
            );
          })}
        </div>

        <Link
          href="/matches"
          className="btn-primary hidden py-2.5 px-5 text-[0.62rem] lg:inline-flex"
        >
          Watch Replay
          <ArrowUpRight className="h-3.5 w-3.5" />
        </Link>
      </div>
    </nav>
  );
}
