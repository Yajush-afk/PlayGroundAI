"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { MessageSquareText, Laugh, BookOpen, Trophy } from "lucide-react";
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
    <nav className="fixed top-0 left-0 right-0 z-50 flex h-16 items-center border-b border-border/50 bg-background/80 px-6 backdrop-blur-md">
      <div className="flex w-full max-w-7xl mx-auto items-center justify-between">
        <Link href="/" className="flex items-center gap-2 group cursor-pointer">
          <div className="h-8 w-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center group-hover:shadow-[0_0_15px_rgba(99,102,241,0.5)] transition-all">
            <span className="text-white font-bold text-lg leading-none">P</span>
          </div>
          <span className="font-bold text-xl tracking-tight hidden sm:block">PlaygroundAI</span>
        </Link>

        <div className="flex items-center gap-1 sm:gap-2">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-accent/50",
                  isActive
                    ? "bg-accent text-accent-foreground"
                    : "text-muted-foreground"
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="hidden md:inline-block">{item.name}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </nav>
  );
}
