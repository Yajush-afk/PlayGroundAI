import { Footer } from "@/components/layout/Footer";
import { AgentGrid } from "@/components/league/LeagueComponents";

export default function AgentsPage() {
  return (
    <>
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <section className="mb-6 rounded-[1.4rem] border border-white/10 bg-[linear-gradient(145deg,rgba(18,20,23,0.9),rgba(8,9,12,0.96))] p-6 shadow-panel sm:p-8">
            <p className="font-mono text-[0.62rem] uppercase tracking-[0.24em] text-muted-foreground">Agents</p>
            <h1 className="mt-4 max-w-3xl font-display text-5xl leading-[0.95] text-foreground sm:text-6xl">The same four personas, louder and more competitive.</h1>
          </section>
          <AgentGrid />
        </div>
      </main>
      <Footer />
    </>
  );
}
