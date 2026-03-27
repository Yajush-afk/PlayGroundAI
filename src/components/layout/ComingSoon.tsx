import { Bell } from "lucide-react";

interface ComingSoonProps {
  title: string;
  description: string;
}

export function ComingSoon({ title, description }: ComingSoonProps) {
  return (
    <main className="flex flex-col items-center justify-center min-h-[calc(100vh-4rem)] p-8 text-center animate-in fade-in duration-500">
      <div className="max-w-md space-y-6">
        <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight bg-gradient-to-br from-white to-white/40 bg-clip-text text-transparent">
          {title}
        </h1>
        
        <p className="text-lg text-muted-foreground whitespace-pre-wrap">
          {description}
        </p>

        <div className="pt-4 flex justify-center">
          <button className="flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-sm hover:bg-primary/90 transition-all hover:scale-105 active:scale-95">
            <Bell className="h-4 w-4" />
            Notify Me
          </button>
        </div>
      </div>
    </main>
  );
}
