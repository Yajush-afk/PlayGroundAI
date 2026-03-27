import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export type Persona = "Aria" | "Lex" | "Sage" | "Rex";

export const PERSONA_CONFIG: Record<Persona, { color: string; bgLight: string; ring: string; model: string; description: string; animation: string; avatar: string }> = {
  Aria: { color: "text-purple-400", bgLight: "bg-purple-500/10", ring: "ring-purple-500/50", model: "llama-3.1-8b-instant", description: "Progressive & Confident", animation: "animate-float", avatar: "/avatars/aria.png" },
  Lex: { color: "text-blue-400", bgLight: "bg-blue-500/10", ring: "ring-blue-500/50", model: "gemma2-9b-it", description: "Nerdy & Intelligent", animation: "animate-breath", avatar: "/avatars/lex.png" },
  Sage: { color: "text-green-400", bgLight: "bg-green-500/10", ring: "ring-green-500/50", model: "llama-3.3-70b-versatile", description: "Nerdy & Intelligent", animation: "animate-sway", avatar: "/avatars/sage.png" },
  Rex: { color: "text-red-400", bgLight: "bg-red-500/10", ring: "ring-red-500/50", model: "mixtral-8x7b-32768", description: "Oversmart Dude", animation: "animate-pulse", avatar: "/avatars/rex.png" },
};

interface PersonaCardProps {
  name: Persona;
  status: "idle" | "typing" | "done" | "error";
  text: string;
  onRetry?: () => void;
  isActiveTurn?: boolean;
}

export function PersonaCard({ name, status, text, onRetry, isActiveTurn }: PersonaCardProps) {
  const config = PERSONA_CONFIG[name];

  return (
    <div
      className={cn(
        "relative flex flex-col gap-3 rounded-xl border bg-card p-5 shadow-sm transition-all duration-300",
        isActiveTurn ? `border-[1px] shadow-lg ${config.ring} scale-[1.02]` : "border-border/50 opacity-90 grayscale-[0.2]",
        status === "done" && "opacity-100 grayscale-0"
      )}
    >
      <div className="flex items-center gap-3">
        <div
          className={cn(
            "flex h-12 w-12 shrink-0 items-center justify-center rounded-full font-bold overflow-hidden transition-all shadow-md",
            config.bgLight,
            config.animation
          )}
        >
          <img src={config.avatar} alt={name} className="h-full w-full object-cover" />
        </div>
        <div>
          <h3 className={cn("font-semibold leading-none", config.color)}>
            {name}
          </h3>
          <p className="text-[10px] sm:text-xs text-muted-foreground mt-1 tracking-wide font-medium">
            {config.model}
          </p>
        </div>
      </div>

      <div className="flex-1 text-sm leading-relaxed text-card-foreground/90 whitespace-pre-wrap">
        {text ? (
          <>
            {text}
            {status === "typing" && (
              <span className="inline-block w-1.5 h-4 ml-1 bg-current align-middle animate-blink" />
            )}
          </>
        ) : status === "typing" ? (
          <span className="inline-block w-1.5 h-4 bg-current align-middle animate-blink" />
        ) : status === "error" ? (
          <div className="flex flex-col items-start gap-2 text-destructive">
            <span>{name} is thinking too hard — retry this round?</span>
            <button
              onClick={onRetry}
              className="rounded-md bg-destructive/10 px-3 py-1 text-xs font-semibold hover:bg-destructive/20 transition-colors"
            >
              Retry
            </button>
          </div>
        ) : (
          <span className="text-muted-foreground italic">...</span>
        )}
      </div>
    </div>
  );
}
