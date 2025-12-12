export type Team = {
  id: string;
  name: string;
  abbr: string;
  record: string;
  primaryColor: string;
  secondaryColor: string;
};

export type MatchupStatus = "scheduled" | "live" | "final";

export type Matchup = {
  id: string;
  weekId: number;
  kickoff: string; // ISO string
  venue: string;
  network: string;
  spread: string;
  overUnder?: number;
  favorite: "home" | "away" | "even";
  status: MatchupStatus;
  homeTeam: Team & {
    score?: number;
  };
  awayTeam: Team & {
    score?: number;
  };
};

export type Week = {
  id: number;
  weekNumber: number;
  lockDate: string;
  startDate: string;
  endDate: string;
  isLocked: boolean;
};

export type Pick = {
  matchupId: string;
  selected: "home" | "away" | null;
  confidence: number; // 1-16 style confidence ranking
};

export type LeaderboardRow = {
  id: string;
  name: string;
  wins: number;
  losses: number;
  points: number;
  streak: string;
  icon: string;
};

export type WeeklySummary = {
  correctPicks: number;
  totalGames: number;
  rank: number;
  potentialPoints: number;
  bonusTokens: number;
};

export type Payment = {
  id: string;
  label: string;
  amount: number;
  status: "paid" | "due" | "pending";
  dueDate: string;
};
