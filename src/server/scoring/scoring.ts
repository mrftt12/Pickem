import * as db from "../db";
import type { Matchup, Pick } from "../../../drizzle/schema";

/**
 * Determines if a pick is correct based on the game result and point spread
 * A pick is correct if the picked team beat the point spread
 */
export function isPickCorrect(pick: Pick, matchup: Matchup): boolean | null {
  // If game hasn't been scored yet, return null
  if (matchup.gameStatus !== "final" || matchup.homeScore === null || matchup.awayScore === null) {
    return null;
  }

  const spread = Math.abs(parseFloat(matchup.pointSpread.toString()));
  const homeScore = matchup.homeScore;
  const awayScore = matchup.awayScore;
  const scoreDiff = homeScore - awayScore;

  // Determine if picked team beat the spread
  if (pick.pickedTeam === matchup.homeTeamAbbr) {
    // Picked home team
    if (matchup.spreadFavor === "home") {
      // Home is favored (e.g., -3.5)
      // Home needs to win by MORE than the spread
      return scoreDiff > spread;
    } else {
      // Home is underdog (e.g., +3.5)
      // Home needs to win or lose by LESS than the spread
      return scoreDiff > -spread;
    }
  } else {
    // Picked away team
    if (matchup.spreadFavor === "away") {
      // Away is favored
      // Away needs to win by MORE than the spread
      return -scoreDiff > spread;
    } else {
      // Away is underdog
      // Away needs to win or lose by LESS than the spread
      return -scoreDiff > -spread;
    }
  }
}

/**
 * Score all picks for a given week
 */
export async function scoreWeek(weekId: number): Promise<void> {
  const week = await db.getWeekById(weekId);
  if (!week) throw new Error("Week not found");

  const matchups = await db.getMatchupsByWeekId(weekId);
  if (matchups.length === 0) throw new Error("No matchups found for week");

  // Get all picks for the week
  const allPicks: Pick[] = [];
  for (const matchup of matchups) {
    const picks = await db.getPicksByMatchupId(matchup.id);
    allPicks.push(...picks);
  }

  // Score each pick
  for (const pick of allPicks) {
    const matchup = matchups.find((m) => m.id === pick.matchupId);
    if (!matchup) continue;

    const correct = isPickCorrect(pick, matchup);
    if (correct !== null) {
      await db.updatePick(pick.id, { isCorrect: correct });
    }
  }

  // Calculate leaderboard
  await calculateWeeklyLeaderboard(weekId);

  // Mark week as scored
  // We need to add an update function for weeks
}

/**
 * Calculate weekly leaderboard for a given week
 */
export async function calculateWeeklyLeaderboard(weekId: number): Promise<void> {
  const week = await db.getWeekById(weekId);
  if (!week) throw new Error("Week not found");

  // Get all picks for the week
  const matchups = await db.getMatchupsByWeekId(weekId);
  const allPicks: Pick[] = [];
  for (const matchup of matchups) {
    const picks = await db.getPicksByMatchupId(matchup.id);
    allPicks.push(...picks);
  }

  // Group picks by user and count correct picks
  const userStats = new Map<
    number,
    {
      userId: number;
      correctPicks: number;
      totalPicks: number;
    }
  >();

  for (const pick of allPicks) {
    if (!userStats.has(pick.userId)) {
      userStats.set(pick.userId, {
        userId: pick.userId,
        correctPicks: 0,
        totalPicks: 0,
      });
    }

    const stats = userStats.get(pick.userId)!;
    stats.totalPicks++;
    if (pick.isCorrect === true) {
      stats.correctPicks++;
    }
  }

  // Sort by correct picks descending
  const sortedStats = Array.from(userStats.values()).sort((a, b) => b.correctPicks - a.correctPicks);

  // Create leaderboard entries
  for (let i = 0; i < sortedStats.length; i++) {
    const stats = sortedStats[i];
    await db.createWeeklyLeaderboardEntry({
      weekId,
      userId: stats.userId,
      correctPicks: stats.correctPicks,
      totalPicks: stats.totalPicks,
      rank: i + 1,
    });
  }

  // Calculate prize pool
  await calculateWeeklyPrizePool(weekId);
}

/**
 * Calculate prize pool for a given week
 */
export async function calculateWeeklyPrizePool(weekId: number): Promise<void> {
  const payments = await db.getPaymentsByWeekId(weekId);
  const completedPayments = payments.filter((p) => p.status === "completed");

  const totalCollected = completedPayments.reduce((sum, p) => sum + p.amount, 0);
  const participantCount = completedPayments.length;

  // Get the leaderboard to find winners
  const leaderboard = await db.getWeeklyLeaderboard(weekId);

  if (leaderboard.length === 0) {
    // No leaderboard yet, create prize pool entry
    await db.createPrizePool({
      weekId,
      totalCollected,
      participantCount,
      winnerCount: 0,
    });
    return;
  }

  // Find the highest score
  const topScore = leaderboard[0]?.correctPicks ?? 0;

  // Find all winners (those with the top score)
  const winners = leaderboard.filter((entry) => entry.correctPicks === topScore);
  const winnerCount = winners.length;

  // Calculate prize per winner
  const prizePerWinner = winnerCount > 0 ? Math.floor(totalCollected / winnerCount) : 0;

  // Update leaderboard entries with prize amounts
  for (const winner of winners) {
    await db.updateWeeklyLeaderboardEntry(winner.id, { prizeAmount: prizePerWinner });
  }

  // Create or update prize pool
  const existingPool = await db.getPrizePoolForWeek(weekId);
  if (existingPool) {
    await db.updatePrizePool(weekId, {
      totalCollected,
      participantCount,
      winnerCount,
      prizePerWinner,
    });
  } else {
    await db.createPrizePool({
      weekId,
      totalCollected,
      participantCount,
      winnerCount,
      prizePerWinner,
    });
  }
}

/**
 * Calculate seasonal leaderboard for a given season
 */
export async function calculateSeasonalLeaderboard(seasonId: number): Promise<void> {
  const weeks = await db.getWeeksBySeasonId(seasonId);

  // Aggregate stats across all weeks
  const userStats = new Map<
    number,
    {
      userId: number;
      totalCorrectPicks: number;
      totalPicks: number;
    }
  >();

  for (const week of weeks) {
    const leaderboard = await db.getWeeklyLeaderboard(week.id);
    for (const entry of leaderboard) {
      if (!userStats.has(entry.userId)) {
        userStats.set(entry.userId, {
          userId: entry.userId,
          totalCorrectPicks: 0,
          totalPicks: 0,
        });
      }

      const stats = userStats.get(entry.userId)!;
      stats.totalCorrectPicks += entry.correctPicks;
      stats.totalPicks += entry.totalPicks;
    }
  }

  // Sort by total correct picks descending
  const sortedStats = Array.from(userStats.values()).sort((a, b) => b.totalCorrectPicks - a.totalCorrectPicks);

  // Create or update seasonal leaderboard entries
  for (let i = 0; i < sortedStats.length; i++) {
    const stats = sortedStats[i];
    await db.createSeasonalLeaderboardEntry({
      seasonId,
      userId: stats.userId,
      totalCorrectPicks: stats.totalCorrectPicks,
      totalPicks: stats.totalPicks,
      rank: i + 1,
    });
  }
}
