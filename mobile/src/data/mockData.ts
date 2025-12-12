import season2025 from "./season2025.json";
import type { LeaderboardRow, Matchup, Payment, Week, WeeklySummary } from "../types/pickem";

type SeasonJson = {
  weeks: Week[];
  matchupsByWeek: Record<string, Matchup[]>;
  weeklySummaries: Record<string, WeeklySummary>;
};

const seasonData = season2025 as SeasonJson;

function normalizeRecord<T>(input: Record<string, T>): Record<number, T> {
  return Object.fromEntries(Object.entries(input).map(([key, value]) => [Number(key), value]));
}

export const weeks: Week[] = seasonData.weeks;
export const matchupsByWeek: Record<number, Matchup[]> = normalizeRecord<Matchup[]>(seasonData.matchupsByWeek);
export const weeklySummaries: Record<number, WeeklySummary> = normalizeRecord<WeeklySummary>(seasonData.weeklySummaries);

export const leaderboard: LeaderboardRow[] = [
  { id: "1", name: "Jordan", wins: 22, losses: 8, points: 33, streak: "W4", icon: "🔥" },
  { id: "2", name: "Casey", wins: 21, losses: 9, points: 31, streak: "W2", icon: "⚡" },
  { id: "3", name: "Quinn", wins: 20, losses: 10, points: 30, streak: "L1", icon: "🐅" },
  { id: "4", name: "Alex", wins: 19, losses: 11, points: 29, streak: "W1", icon: "🎯" },
  { id: "5", name: "Riley", wins: 18, losses: 12, points: 27, streak: "L2", icon: "🦅" },
];

export const payments: Payment[] = [
  { id: "pay-1", label: "Season Buy-In", amount: 100, status: "paid", dueDate: "2025-08-25" },
  { id: "pay-2", label: "Week 6 Side Pot", amount: 20, status: "due", dueDate: "2025-10-12" },
  { id: "pay-3", label: "Charity Booster", amount: 10, status: "pending", dueDate: "2025-10-30" },
];
