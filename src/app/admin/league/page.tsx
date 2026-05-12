import { Footer } from "@/components/layout/Footer";
import { AdminLeaguePanel } from "@/components/league/LeagueComponents";
import { AdminLeagueRunner } from "./AdminLeagueRunner";

export default function AdminLeaguePage() {
  return (
    <>
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <AdminLeaguePanel />
          <AdminLeagueRunner />
        </div>
      </main>
      <Footer />
    </>
  );
}
