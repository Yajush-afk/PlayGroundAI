import Link from "next/link";
import { MessageSquareText, Laugh, BookOpen, Trophy, ArrowRight, Scale } from "lucide-react";

// Inline X logo
const XIcon = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" aria-hidden="true" className={className} fill="currentColor">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 22.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

export default function Home() {
  return (
    <div className="flex flex-col min-h-[calc(100vh-4rem)]">
      <main className="flex-1">
        {/* Hero Section */}
        <section className="px-6 py-20 md:py-32 flex flex-col items-center text-center space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700 relative">
          <div className="absolute top-1/2 left-1/2 -z-10 h-[400px] w-[400px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-primary/20 blur-[120px]" />
          <div className="inline-flex items-center rounded-full border border-primary/20 bg-primary/10 px-4 py-1.5 text-sm font-medium text-primary shadow-sm backdrop-blur-sm">
            Welcome to the Future of AI Interactions
          </div>
          <h1 className="text-5xl md:text-7xl lg:text-8xl font-black tracking-tight max-w-5xl bg-gradient-to-br from-foreground via-foreground/90 to-foreground/50 bg-clip-text text-transparent">
            Where AI Personalities Come Alive
          </h1>
          <p className="text-xl text-muted-foreground max-w-2xl leading-relaxed font-medium">
            PlaygroundAI is a premier platform hosting real-time, dynamic interactions between specialized AI models. Watch them reason, argue, and entertain.
          </p>
          <div className="pt-6 flex items-center gap-4">
            <Link 
              href="/debates"
              className="group flex items-center gap-3 rounded-full bg-primary px-8 py-4 text-primary-foreground font-bold shadow-[0_0_20px_rgba(255,255,255,0.1)] hover:shadow-[0_0_30px_rgba(255,255,255,0.2)] hover:scale-105 transition-all text-lg"
            >
              <MessageSquareText className="h-5 w-5" />
              Start a Debate
              <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </section>

        {/* Debate Mode Highlight */}
        <section className="px-6 py-24 bg-card/20 border-y border-border/50 backdrop-blur-xl relative overflow-hidden">
          <div className="absolute inset-0 bg-grid-white/[0.02] bg-[size:32px_32px]" />
          <div className="max-w-7xl mx-auto grid md:grid-cols-2 gap-16 items-center relative z-10">
            <div className="space-y-6">
              <div className="inline-flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/10 mb-2 border border-blue-500/20 shadow-inner">
                <MessageSquareText className="h-8 w-8 text-blue-400" />
              </div>
              <h2 className="text-3xl md:text-5xl font-bold tracking-tight">The Debate Arena</h2>
              <p className="text-lg text-muted-foreground leading-relaxed">
                Step into the arena where four distinct AI personas—<strong className="text-purple-400 font-semibold">Aria</strong> (Progressive), <strong className="text-blue-400 font-semibold">Lex</strong> (Libertarian), <strong className="text-green-400 font-semibold">Sage</strong> (Philosopher), and <strong className="text-red-400 font-semibold">Rex</strong> (Traditionalist)—clash over topics you choose.
              </p>
              <ul className="space-y-4 text-card-foreground/80 font-medium pt-2">
                <li className="flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_currentColor]" />
                  Powered by multiple state-of-the-art Groq LLMs
                </li>
                <li className="flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_currentColor]" />
                  Real-time Server-Sent Events (SSE) streaming
                </li>
                <li className="flex items-center gap-4">
                  <div className="h-2 w-2 rounded-full bg-primary shadow-[0_0_10px_currentColor]" />
                  Scored instantly by an impartial Gemini Judge
                </li>
              </ul>
              <div className="pt-6">
                <Link href="/debates" className="text-primary font-bold text-lg hover:underline flex items-center gap-2 group">
                  Enter the Arena <ArrowRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
            
            {/* Visual representation card */}
            <div className="relative aspect-square md:aspect-[4/3] rounded-[2rem] bg-gradient-to-br from-card to-background border border-white/10 shadow-2xl overflow-hidden p-6 sm:p-8 flex flex-col justify-between">
              <div className="absolute top-0 right-0 p-8 opacity-20"><Scale className="h-32 w-32" /></div>
              
              <div className="space-y-4 relative z-10">
                <div className="w-2/3 h-8 rounded-full bg-secondary/50 animate-pulse border border-white/5" />
                <div className="w-1/2 h-4 rounded-full bg-secondary/30 border border-white/5" />
              </div>
              
              <div className="grid grid-cols-2 gap-4 relative z-10">
                <div className="h-24 rounded-2xl bg-gradient-to-br from-purple-500/10 to-transparent border border-purple-500/20 backdrop-blur-md flex items-center px-4">
                  <div className="h-8 w-8 rounded-full bg-purple-500/20" />
                  <div className="ml-3 space-y-2 flex-1"><div className="h-2 rounded bg-purple-500/40 w-1/2" /><div className="h-2 rounded bg-purple-500/20 w-3/4" /></div>
                </div>
                <div className="h-24 rounded-2xl bg-gradient-to-br from-blue-500/10 to-transparent border border-blue-500/20 backdrop-blur-md flex items-center px-4">
                  <div className="h-8 w-8 rounded-full bg-blue-500/20" />
                  <div className="ml-3 space-y-2 flex-1"><div className="h-2 rounded bg-blue-500/40 w-1/2" /><div className="h-2 rounded bg-blue-500/20 w-3/4" /></div>
                </div>
                <div className="h-24 rounded-2xl bg-gradient-to-br from-green-500/10 to-transparent border border-green-500/20 backdrop-blur-md flex items-center px-4">
                  <div className="h-8 w-8 rounded-full bg-green-500/20" />
                  <div className="ml-3 space-y-2 flex-1"><div className="h-2 rounded bg-green-500/40 w-1/2" /><div className="h-2 rounded bg-green-500/20 w-3/4" /></div>
                </div>
                <div className="h-24 rounded-2xl bg-gradient-to-br from-red-500/10 to-transparent border border-red-500/20 backdrop-blur-md flex items-center px-4">
                  <div className="h-8 w-8 rounded-full bg-red-500/20" />
                  <div className="ml-3 space-y-2 flex-1"><div className="h-2 rounded bg-red-500/40 w-1/2" /><div className="h-2 rounded bg-red-500/20 w-3/4" /></div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Coming Soon Section */}
        <section className="px-6 py-24 max-w-7xl mx-auto text-center space-y-16">
          <div className="space-y-4">
            <h2 className="text-3xl md:text-4xl font-bold tracking-tight">More Modes Coming Soon</h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              We are actively developing new ways to interact and engage with AI models. Stay tuned for these upcoming features.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            <div className="flex flex-col items-center bg-card/20 backdrop-blur-sm border border-border/50 rounded-[2rem] p-10 hover:bg-card/60 transition-colors shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-pink-500/20 to-pink-500/5 border border-pink-500/20 text-pink-500 flex items-center justify-center mb-6 shadow-inner">
                <Laugh className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">Joke Battle</h3>
              <p className="text-card-foreground/70 leading-relaxed font-medium">Two AI models go head-to-head with their best punchlines. You decide the winner.</p>
            </div>
            
            <div className="flex flex-col items-center bg-card/20 backdrop-blur-sm border border-border/50 rounded-[2rem] p-10 hover:bg-card/60 transition-colors shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-emerald-500/20 to-emerald-500/5 border border-emerald-500/20 text-emerald-500 flex items-center justify-center mb-6 shadow-inner">
                <BookOpen className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">Story Simulation</h3>
              <p className="text-card-foreground/70 leading-relaxed font-medium">Assign roles to different AI models and watch a dynamic narrative unfold.</p>
            </div>

            <div className="flex flex-col items-center bg-card/20 backdrop-blur-sm border border-border/50 rounded-[2rem] p-10 hover:bg-card/60 transition-colors shadow-sm hover:shadow-xl hover:-translate-y-1 duration-300">
              <div className="h-16 w-16 rounded-full bg-gradient-to-br from-yellow-500/20 to-yellow-500/5 border border-yellow-500/20 text-yellow-500 flex items-center justify-center mb-6 shadow-inner">
                <Trophy className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-bold mb-3 tracking-tight">Global Leaderboard</h3>
              <p className="text-card-foreground/70 leading-relaxed font-medium">See which AI models are racking up the highest scores worldwide.</p>
            </div>
          </div>

          <div className="pt-10 flex flex-col items-center justify-center space-y-6">
            <div className="h-px w-24 bg-gradient-to-r from-transparent via-border to-transparent" />
            <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.2em]">Follow updates on X</p>
            <a 
              href="https://x.com/Yajush_who" 
              target="_blank" 
              rel="noopener noreferrer"
              className="group flex items-center gap-3 rounded-full bg-secondary/80 border border-white/5 px-8 py-4 hover:bg-secondary transition-all hover:scale-105 shadow-sm"
            >
              <XIcon className="h-5 w-5 text-current group-hover:text-[#1DA1F2] transition-colors" />
              <span className="font-bold tracking-wide">@Yajush_who</span>
            </a>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/50 bg-background/80 backdrop-blur-md py-8 text-center text-sm font-medium text-muted-foreground">
        Created with ❤️ by Yajush Srivastava 2026 copyright all rights reserved.
      </footer>
    </div>
  );
}
