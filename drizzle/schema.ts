import {
  int,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  varchar,
  decimal,
  boolean,
  json,
} from "drizzle-orm/mysql-core";

/**
 * Core user table backing auth flow.
 * Extended with pick'em pool specific fields.
 */
export const users = mysqlTable("users", {
  id: int("id").autoincrement().primaryKey(),
  openId: varchar("openId", { length: 64 }).notNull().unique(),
  name: text("name"),
  email: varchar("email", { length: 320 }),
  loginMethod: varchar("loginMethod", { length: 64 }),
  role: mysqlEnum("role", ["user", "admin"]).default("user").notNull(),
  // Pick'em pool specific fields
  stripeCustomerId: varchar("stripeCustomerId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
  lastSignedIn: timestamp("lastSignedIn").defaultNow().notNull(),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;

/**
 * NFL season and week tracking
 */
export const seasons = mysqlTable("seasons", {
  id: int("id").autoincrement().primaryKey(),
  year: int("year").notNull().unique(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  isActive: boolean("isActive").default(true).notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Season = typeof seasons.$inferSelect;
export type InsertSeason = typeof seasons.$inferInsert;

/**
 * Weekly matchups container
 */
export const weeks = mysqlTable("weeks", {
  id: int("id").autoincrement().primaryKey(),
  seasonId: int("seasonId").notNull(),
  weekNumber: int("weekNumber").notNull(),
  startDate: timestamp("startDate").notNull(),
  endDate: timestamp("endDate").notNull(),
  isLocked: boolean("isLocked").default(false).notNull(), // Prevent picks after deadline
  isScored: boolean("isScored").default(false).notNull(), // Results entered
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Week = typeof weeks.$inferSelect;
export type InsertWeek = typeof weeks.$inferInsert;

/**
 * Individual NFL matchups for each week
 */
export const matchups = mysqlTable("matchups", {
  id: int("id").autoincrement().primaryKey(),
  weekId: int("weekId").notNull(),
  externalGameId: varchar("externalGameId", { length: 64 }).notNull(), // ESPN/NFL API ID
  homeTeam: varchar("homeTeam", { length: 64 }).notNull(),
  awayTeam: varchar("awayTeam", { length: 64 }).notNull(),
  homeTeamAbbr: varchar("homeTeamAbbr", { length: 10 }).notNull(),
  awayTeamAbbr: varchar("awayTeamAbbr", { length: 10 }).notNull(),
  pointSpread: decimal("pointSpread", { precision: 5, scale: 1 }).notNull(), // e.g., -3.5
  spreadFavor: varchar("spreadFavor", { length: 10 }).notNull(), // "home" or "away"
  gameTime: timestamp("gameTime").notNull(),
  homeScore: int("homeScore"),
  awayScore: int("awayScore"),
  gameStatus: mysqlEnum("gameStatus", ["scheduled", "live", "final"]).default("scheduled").notNull(),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Matchup = typeof matchups.$inferSelect;
export type InsertMatchup = typeof matchups.$inferInsert;

/**
 * User picks for each matchup
 */
export const picks = mysqlTable("picks", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  matchupId: int("matchupId").notNull(),
  weekId: int("weekId").notNull(),
  pickedTeam: varchar("pickedTeam", { length: 64 }).notNull(), // Team abbreviation
  isCorrect: boolean("isCorrect"), // null = not yet scored, true/false after scoring
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Pick = typeof picks.$inferSelect;
export type InsertPick = typeof picks.$inferInsert;

/**
 * Weekly payment tracking
 */
export const payments = mysqlTable("payments", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  weekId: int("weekId").notNull(),
  amount: int("amount").notNull(), // in cents, $10 = 1000
  status: mysqlEnum("status", ["pending", "completed", "failed", "refunded"]).default("pending").notNull(),
  stripePaymentIntentId: varchar("stripePaymentIntentId", { length: 255 }),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type Payment = typeof payments.$inferSelect;
export type InsertPayment = typeof payments.$inferInsert;

/**
 * Weekly leaderboard snapshots
 */
export const weeklyLeaderboard = mysqlTable("weeklyLeaderboard", {
  id: int("id").autoincrement().primaryKey(),
  weekId: int("weekId").notNull(),
  userId: int("userId").notNull(),
  correctPicks: int("correctPicks").notNull().default(0),
  totalPicks: int("totalPicks").notNull().default(0),
  rank: int("rank").notNull(),
  prizeAmount: int("prizeAmount"), // in cents, null if not won
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type WeeklyLeaderboard = typeof weeklyLeaderboard.$inferSelect;
export type InsertWeeklyLeaderboard = typeof weeklyLeaderboard.$inferInsert;

/**
 * Season-long leaderboard
 */
export const seasonalLeaderboard = mysqlTable("seasonalLeaderboard", {
  id: int("id").autoincrement().primaryKey(),
  seasonId: int("seasonId").notNull(),
  userId: int("userId").notNull(),
  totalCorrectPicks: int("totalCorrectPicks").notNull().default(0),
  totalPicks: int("totalPicks").notNull().default(0),
  rank: int("rank").notNull(),
  prizeAmount: int("prizeAmount"), // in cents, null if not won
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type SeasonalLeaderboard = typeof seasonalLeaderboard.$inferSelect;
export type InsertSeasonalLeaderboard = typeof seasonalLeaderboard.$inferInsert;

/**
 * Prize pool tracking
 */
export const prizePool = mysqlTable("prizePool", {
  id: int("id").autoincrement().primaryKey(),
  weekId: int("weekId").notNull(),
  totalCollected: int("totalCollected").notNull().default(0), // in cents
  participantCount: int("participantCount").notNull().default(0),
  winnerCount: int("winnerCount").notNull().default(0),
  prizePerWinner: int("prizePerWinner"), // in cents, calculated after week is scored
  createdAt: timestamp("createdAt").defaultNow().notNull(),
  updatedAt: timestamp("updatedAt").defaultNow().onUpdateNow().notNull(),
});

export type PrizePool = typeof prizePool.$inferSelect;
export type InsertPrizePool = typeof prizePool.$inferInsert;

/**
 * Email notification log
 */
export const emailNotifications = mysqlTable("emailNotifications", {
  id: int("id").autoincrement().primaryKey(),
  userId: int("userId").notNull(),
  type: mysqlEnum("type", ["weekly_winner", "seasonal_winner", "payment_reminder", "week_open", "week_closing"]).notNull(),
  weekId: int("weekId"),
  seasonId: int("seasonId"),
  status: mysqlEnum("status", ["pending", "sent", "failed"]).default("pending").notNull(),
  sentAt: timestamp("sentAt"),
  createdAt: timestamp("createdAt").defaultNow().notNull(),
});

export type EmailNotification = typeof emailNotifications.$inferSelect;
export type InsertEmailNotification = typeof emailNotifications.$inferInsert;
