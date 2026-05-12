import { apiUrl } from "@/lib/api";

export type Persona = "Aria" | "Lex" | "Sage" | "Rex";
export type GameType = "debate" | "joke" | "scenario";

export interface LeagueStatus {
  generationEnabled: boolean;
  coolingDown: boolean;
  pausedUntil: string | null;
  nextRecommendedRunAt: string | null;
}

export interface LeagueMatch {
  id: string;
  season_id?: string | null;
  league_type?: "official" | "custom";
  game_type: GameType;
  status: string;
  prompt: string;
  topic?: string | null;
  winner?: Persona | null;
  summary?: string | null;
  judge_model?: string | null;
  participant_model?: string | null;
  total_estimated_requests?: number;
  created_at?: string;
  completed_at?: string | null;
}

export interface LeaderboardEntry {
  id?: string;
  season_id?: string;
  persona_name: Persona;
  game_type: GameType | "overall";
  matches_played: number;
  wins: number;
  podiums: number;
  total_points: number;
  average_score: number | string;
  current_streak: number;
}

export interface LeagueState {
  season: Record<string, unknown> | null;
  leaderboard: LeaderboardEntry[];
  latestMatches: LeagueMatch[];
  leagueStatus: LeagueStatus;
}

export interface LiveLeagueState {
  currentMatch: LeagueMatch | null;
  previousMatch: LeagueMatch | null;
  upNext: LeagueMatch | null;
  leaderboard: LeaderboardEntry[];
  leagueStatus: LeagueStatus;
}

export interface MatchParticipant {
  persona_name: Persona;
  final_rank: number | null;
  total_score: number;
  points_awarded: number;
  bonus_points: number;
}

export interface MatchRoundEntry {
  persona: Persona;
  text: string;
}

export interface MatchRound {
  id?: string;
  round_index: number;
  round_type: string;
  pair_key?: string | null;
  prompt: string;
  entries: MatchRoundEntry[];
  judge_result?: unknown;
}

export interface MatchDetail {
  match: LeagueMatch;
  participants: MatchParticipant[];
  rounds: MatchRound[];
}

export const PERSONAS: Persona[] = ["Aria", "Lex", "Sage", "Rex"];

export const PERSONA_META: Record<Persona, { title: string; avatar: string; accent: string; text: string; bio: string }> = {
  Aria: {
    title: "Empathetic Systems Thinker",
    avatar: "/avatars/aria.png",
    accent: "aria",
    text: "text-purple-300",
    bio: "Turns every contest toward human stakes, fairness, and the people who absorb the cost.",
  },
  Lex: {
    title: "Tactical Optimizer",
    avatar: "/avatars/lex.png",
    accent: "lex",
    text: "text-blue-300",
    bio: "Cuts through fluff with data, tradeoffs, and the shortest path to leverage.",
  },
  Sage: {
    title: "Paradox Philosopher",
    avatar: "/avatars/sage.png",
    accent: "sage",
    text: "text-emerald-300",
    bio: "Questions the premise, finds the hidden contradiction, and wins by reframing the arena.",
  },
  Rex: {
    title: "Old-School Competitor",
    avatar: "/avatars/rex.png",
    accent: "rex",
    text: "text-red-300",
    bio: "Blunt, practical, and allergic to fragile plans that would collapse outside the demo.",
  },
};

export const GAME_META: Record<GameType, { label: string; short: string; accent: string; format: string }> = {
  debate: {
    label: "Debate Arena",
    short: "Best argument wins",
    accent: "text-sky-300",
    format: "4 personas, 1 round",
  },
  joke: {
    label: "Joke Battle",
    short: "Funniest line wins",
    accent: "text-yellow-300",
    format: "4 one-liners + votes",
  },
  scenario: {
    label: "Scenario Showdown",
    short: "Best plan survives",
    accent: "text-emerald-300",
    format: "paired bracket",
  },
};

const fallbackMatch: LeagueMatch = {
  id: "preseason-exhibition",
  league_type: "official",
  game_type: "scenario",
  status: "completed",
  prompt: "You have 6 hours, $20, and a shopping cart. Make the most memorable birthday surprise possible.",
  winner: "Sage",
  summary: "Sage won the preseason exhibition by solving around the obvious budget constraint and turning the cart into a moving scavenger hunt.",
  judge_model: "gemini-2.5-flash",
  participant_model: "llama-3.1-8b-instant",
  total_estimated_requests: 9,
  completed_at: new Date().toISOString(),
};

export const fallbackLeaderboard: LeaderboardEntry[] = [
  { persona_name: "Sage", game_type: "overall", matches_played: 1, wins: 1, podiums: 1, total_points: 14, average_score: 37, current_streak: 1 },
  { persona_name: "Aria", game_type: "overall", matches_played: 1, wins: 0, podiums: 1, total_points: 7, average_score: 33, current_streak: 0 },
  { persona_name: "Lex", game_type: "overall", matches_played: 1, wins: 0, podiums: 1, total_points: 3, average_score: 30, current_streak: 0 },
  { persona_name: "Rex", game_type: "overall", matches_played: 1, wins: 0, podiums: 1, total_points: 3, average_score: 29, current_streak: 0 },
];

export const fallbackState: LeagueState = {
  season: { name: "Season 1", status: "preseason" },
  leaderboard: fallbackLeaderboard,
  latestMatches: [fallbackMatch],
  leagueStatus: {
    generationEnabled: false,
    coolingDown: false,
    pausedUntil: null,
    nextRecommendedRunAt: null,
  },
};

export const fallbackLiveState: LiveLeagueState = {
  currentMatch: null,
  previousMatch: fallbackMatch,
  upNext: {
    ...fallbackMatch,
    id: "preseason-up-next",
    status: "queued",
    game_type: "debate",
    prompt: "Should governments slow down automation to protect jobs?",
    winner: null,
    summary: null,
    completed_at: null,
  },
  leaderboard: fallbackLeaderboard,
  leagueStatus: fallbackState.leagueStatus,
};

export const fallbackDetail: MatchDetail = {
  match: fallbackMatch,
  participants: [
    { persona_name: "Sage", final_rank: 1, total_score: 37, points_awarded: 12, bonus_points: 2 },
    { persona_name: "Aria", final_rank: 2, total_score: 33, points_awarded: 7, bonus_points: 0 },
    { persona_name: "Lex", final_rank: 3, total_score: 30, points_awarded: 3, bonus_points: 0 },
    { persona_name: "Rex", final_rank: 4, total_score: 29, points_awarded: 3, bonus_points: 0 },
  ],
  rounds: [
    {
      round_index: 1,
      round_type: "scenario_semifinal",
      pair_key: "semifinal-a",
      prompt: fallbackMatch.prompt,
      entries: [
        { persona: "Aria", text: "Turn the cart into a rolling memory booth: friends add notes, $20 buys candles and snacks, and the route ends at a handmade surprise table." },
        { persona: "Lex", text: "Buy the highest-impact supplies: tape, markers, cheap snacks. Delegate setup, make the cart a mobile gift station, and optimize for surprise per dollar." },
      ],
    },
    {
      round_index: 2,
      round_type: "scenario_semifinal",
      pair_key: "semifinal-b",
      prompt: fallbackMatch.prompt,
      entries: [
        { persona: "Sage", text: "The cart is not transport; it is suspense. Build a moving scavenger hunt where each stop reveals a person, a clue, and a tiny proof they matter." },
        { persona: "Rex", text: "Keep it simple: food, people, one honest toast, and a cart full of practical decorations. Memorable beats clever when time is short." },
      ],
    },
    {
      round_index: 3,
      round_type: "scenario_final",
      pair_key: "final",
      prompt: fallbackMatch.prompt,
      entries: [
        { persona: "Sage", text: "Make the final stop a reversal: the birthday person thinks they are collecting memories, then finds everyone waiting with the completed cart shrine." },
        { persona: "Aria", text: "Ask each friend to contribute one personal note and one small task. The cart becomes a shared gift, not a purchased performance." },
      ],
    },
  ],
};

async function fetchJson<T>(path: string): Promise<T | null> {
  try {
    const target = typeof window === "undefined" ? serverApiUrl(path) : apiUrl(path);
    const response = await fetch(target, { cache: "no-store" });
    if (!response.ok) {
      return null;
    }
    return (await response.json()) as T;
  } catch {
    return null;
  }
}

function serverApiUrl(path: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_API_BASE_URL?.replace(/\/$/, "") ?? "";
  if (!baseUrl) {
    return path;
  }
  return `${baseUrl}${path.startsWith("/") ? path : `/${path}`}`;
}

export async function getLeagueState(): Promise<LeagueState> {
  const state = await fetchJson<LeagueState>("/api/league/state");
  if (!state || !Array.isArray(state.latestMatches)) {
    return fallbackState;
  }
  return {
    ...state,
    latestMatches: state.latestMatches.length > 0 ? state.latestMatches : fallbackState.latestMatches,
    leaderboard: state.leaderboard.length > 0 ? state.leaderboard : fallbackState.leaderboard,
  };
}

export async function getLiveLeagueState(): Promise<LiveLeagueState> {
  const state = await fetchJson<LiveLeagueState>("/api/league/live");
  if (!state) {
    return fallbackLiveState;
  }
  return {
    currentMatch: state.currentMatch,
    previousMatch: state.previousMatch ?? fallbackLiveState.previousMatch,
    upNext: state.upNext ?? fallbackLiveState.upNext,
    leaderboard: state.leaderboard.length > 0 ? state.leaderboard : fallbackLeaderboard,
    leagueStatus: state.leagueStatus,
  };
}

export async function getMatches(gameType?: GameType): Promise<LeagueMatch[]> {
  const query = gameType ? `?gameType=${gameType}&limit=30` : "?limit=30";
  const matches = await fetchJson<LeagueMatch[]>(`/api/matches${query}`);
  return matches && matches.length > 0 ? matches : fallbackState.latestMatches;
}

export async function getMatchDetail(id: string): Promise<MatchDetail> {
  if (id === fallbackMatch.id) {
    return fallbackDetail;
  }
  const detail = await fetchJson<MatchDetail>(`/api/matches/${id}`);
  return detail ?? fallbackDetail;
}

export async function getLeaderboard(gameType?: GameType | "overall"): Promise<LeaderboardEntry[]> {
  const query = gameType && gameType !== "overall" ? `?gameType=${gameType}` : "";
  const rows = await fetchJson<LeaderboardEntry[]>(`/api/leaderboard${query}`);
  return rows && rows.length > 0 ? rows : fallbackLeaderboard.filter((entry) => !gameType || entry.game_type === gameType);
}

export function formatGameType(gameType: GameType): string {
  return GAME_META[gameType].label;
}

export function formatDate(value?: string | null): string {
  if (!value) {
    return "Preseason";
  }
  return new Intl.DateTimeFormat("en", { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" }).format(new Date(value));
}

export function averageScore(entry: LeaderboardEntry): string {
  const value = typeof entry.average_score === "number" ? entry.average_score : Number(entry.average_score);
  return Number.isFinite(value) ? value.toFixed(1) : "0.0";
}
