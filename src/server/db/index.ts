import { eq, and, desc, asc, isNull, isNotNull, gte, lte, sum, count } from "drizzle-orm";
import { drizzle } from "drizzle-orm/mysql2";
import {
  InsertUser,
  users,
  weeks,
  matchups,
  picks,
  payments,
  weeklyLeaderboard,
  seasonalLeaderboard,
  prizePool,
  seasons,
  emailNotifications,
} from "../../../drizzle/schema";
import { ENV } from "../_core/env";
import mysql from "mysql2/promise";

let _db: ReturnType<typeof drizzle> | null = null;
let pool: mysql.Pool | null = null;

export async function getDb() {
  if (_db) {
    return _db;
  }

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    console.warn("[Database] DATABASE_URL not configured");
    return null;
  }

  try {
    pool = mysql.createPool(connectionString);
    _db = drizzle(pool);
  } catch (error) {
    console.warn("[Database] Failed to connect:", error);
    _db = null;
  }

  return _db;
}

export async function upsertUser(user: InsertUser): Promise<void> {
  if (!user.openId) {
    throw new Error("User openId is required for upsert");
  }

  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot upsert user: database not available");
    return;
  }

  try {
    const values: InsertUser = {
      openId: user.openId,
    };
    const updateSet: Record<string, unknown> = {};

    const textFields = ["name", "email", "loginMethod", "stripeCustomerId"] as const;
    type TextField = (typeof textFields)[number];

    const assignNullable = (field: TextField) => {
      const value = user[field];
      if (value === undefined) return;
      const normalized = value ?? null;
      values[field] = normalized;
      updateSet[field] = normalized;
    };

    textFields.forEach(assignNullable);

    if (user.lastSignedIn !== undefined) {
      values.lastSignedIn = user.lastSignedIn;
      updateSet.lastSignedIn = user.lastSignedIn;
    }
    if (user.role !== undefined) {
      values.role = user.role;
      updateSet.role = user.role;
    } else if (user.openId === ENV.ownerOpenId) {
      values.role = "admin";
      updateSet.role = "admin";
    }

    if (!values.lastSignedIn) {
      values.lastSignedIn = new Date();
    }

    if (Object.keys(updateSet).length === 0) {
      updateSet.lastSignedIn = new Date();
    }

    await db.insert(users).values(values).onDuplicateKeyUpdate({
      set: updateSet,
    });
  } catch (error) {
    console.error("[Database] Failed to upsert user:", error);
    throw error;
  }
}

export async function getUserByOpenId(openId: string) {
  const db = await getDb();
  if (!db) {
    console.warn("[Database] Cannot get user: database not available");
    return undefined;
  }

  const result = await db.select().from(users).where(eq(users.openId, openId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getUserById(id: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(users).where(eq(users.id, id)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Season queries
export async function getActiveSeasons() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(seasons).where(eq(seasons.isActive, true));
}

export async function getSeasonByYear(year: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(seasons).where(eq(seasons.year, year)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createSeason(data: {
  year: number;
  startDate: Date;
  endDate: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  const result = await db.insert(seasons).values(data);
  return result;
}

// Week queries
export async function getWeeksBySeasonId(seasonId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(weeks).where(eq(weeks.seasonId, seasonId)).orderBy(asc(weeks.weekNumber));
}

export async function getWeekById(weekId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(weeks).where(eq(weeks.id, weekId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function getCurrentWeek(seasonId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const now = new Date();
  const result = await db
    .select()
    .from(weeks)
    .where(and(eq(weeks.seasonId, seasonId), lte(weeks.startDate, now), gte(weeks.endDate, now)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createWeek(data: {
  seasonId: number;
  weekNumber: number;
  startDate: Date;
  endDate: Date;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(weeks).values(data);
}

// Matchup queries
export async function getMatchupsByWeekId(weekId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(matchups).where(eq(matchups.weekId, weekId)).orderBy(asc(matchups.gameTime));
}

export async function getMatchupById(matchupId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(matchups).where(eq(matchups.id, matchupId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createMatchup(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(matchups).values(data);
}

export async function updateMatchup(matchupId: number, data: Partial<any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(matchups).set(data).where(eq(matchups.id, matchupId));
}

// Pick queries
export async function getUserPicksForWeek(userId: number, weekId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(picks).where(and(eq(picks.userId, userId), eq(picks.weekId, weekId)));
}

export async function getPicksByMatchupId(matchupId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(picks).where(eq(picks.matchupId, matchupId));
}

export async function createPick(data: {
  userId: number;
  matchupId: number;
  weekId: number;
  pickedTeam: string;
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(picks).values(data);
}

export async function updatePick(pickId: number, data: Partial<any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(picks).set(data).where(eq(picks.id, pickId));
}

export async function getPickById(pickId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(picks).where(eq(picks.id, pickId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

// Payment queries
export async function getUserPaymentForWeek(userId: number, weekId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db
    .select()
    .from(payments)
    .where(and(eq(payments.userId, userId), eq(payments.weekId, weekId)))
    .limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPayment(data: {
  userId: number;
  weekId: number;
  amount: number;
  status?: "pending" | "completed" | "failed" | "refunded";
}) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(payments).values(data);
}

export async function updatePayment(paymentId: number, data: Partial<any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(payments).set(data).where(eq(payments.id, paymentId));
}

export async function getPaymentsByWeekId(weekId: number) {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(payments).where(eq(payments.weekId, weekId));
}

// Weekly leaderboard queries
export async function getWeeklyLeaderboard(weekId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(weeklyLeaderboard)
    .where(eq(weeklyLeaderboard.weekId, weekId))
    .orderBy(asc(weeklyLeaderboard.rank));
}

export async function createWeeklyLeaderboardEntry(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(weeklyLeaderboard).values(data);
}

export async function updateWeeklyLeaderboardEntry(id: number, data: Partial<any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(weeklyLeaderboard).set(data).where(eq(weeklyLeaderboard.id, id));
}

// Seasonal leaderboard queries
export async function getSeasonalLeaderboard(seasonId: number) {
  const db = await getDb();
  if (!db) return [];
  return db
    .select()
    .from(seasonalLeaderboard)
    .where(eq(seasonalLeaderboard.seasonId, seasonId))
    .orderBy(asc(seasonalLeaderboard.rank));
}

export async function createSeasonalLeaderboardEntry(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(seasonalLeaderboard).values(data);
}

export async function updateSeasonalLeaderboardEntry(id: number, data: Partial<any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(seasonalLeaderboard).set(data).where(eq(seasonalLeaderboard.id, id));
}

// Prize pool queries
export async function getPrizePoolForWeek(weekId: number) {
  const db = await getDb();
  if (!db) return undefined;
  const result = await db.select().from(prizePool).where(eq(prizePool.weekId, weekId)).limit(1);
  return result.length > 0 ? result[0] : undefined;
}

export async function createPrizePool(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(prizePool).values(data);
}

export async function updatePrizePool(weekId: number, data: Partial<any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(prizePool).set(data).where(eq(prizePool.weekId, weekId));
}

// Email notification queries
export async function createEmailNotification(data: any) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.insert(emailNotifications).values(data);
}

export async function getPendingEmailNotifications() {
  const db = await getDb();
  if (!db) return [];
  return db.select().from(emailNotifications).where(eq(emailNotifications.status, "pending"));
}

export async function updateEmailNotification(id: number, data: Partial<any>) {
  const db = await getDb();
  if (!db) throw new Error("Database not available");
  return db.update(emailNotifications).set(data).where(eq(emailNotifications.id, id));
}
