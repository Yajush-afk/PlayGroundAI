import { Footer } from "@/components/layout/Footer";
import { CustomLeaguePanel } from "@/components/league/LeagueComponents";

export default function CustomLeaguePage() {
  return (
    <>
      <main className="px-4 py-8 sm:px-6 lg:px-8">
        <div className="mx-auto max-w-7xl">
          <CustomLeaguePanel />
        </div>
      </main>
      <Footer />
    </>
  );
}
