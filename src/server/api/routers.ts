import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { COOKIE_NAME } from "../../shared/const";
import { getSessionCookieOptions } from "../_core/cookies";
import { systemRouter } from "../_core/systemRouter";
import { publicProcedure, protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";

export const appRouter = router({
  system: systemRouter,

  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  // User profile procedures
  user: router({
    profile: protectedProcedure.query(async ({ ctx }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });
      return user;
    }),

    updateProfile: protectedProcedure
      .input(
        z.object({
          name: z.string().optional(),
          email: z.string().email().optional(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Update user in database
        const user = await db.getUserById(ctx.user.id);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

        await db.upsertUser({
          openId: user.openId,
          name: input.name ?? user.name,
          email: input.email ?? user.email,
        });

        return { success: true };
      }),

    updateStripeCustomerId: protectedProcedure
      .input(z.object({ stripeCustomerId: z.string() }))
      .mutation(async ({ ctx, input }) => {
        const user = await db.getUserById(ctx.user.id);
        if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

        await db.upsertUser({
          openId: user.openId,
          stripeCustomerId: input.stripeCustomerId,
        });

        return { success: true };
      }),
  }),

  // Season procedures
  season: router({
    getCurrent: publicProcedure.query(async () => {
      const currentYear = new Date().getFullYear();
      const season = await db.getSeasonByYear(currentYear);
      if (!season) throw new TRPCError({ code: "NOT_FOUND", message: "Current season not found" });
      return season;
    }),

    getAll: publicProcedure.query(async () => {
      return db.getActiveSeasons();
    }),

    create: protectedProcedure
      .input(
        z.object({
          year: z.number().int(),
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }

        await db.createSeason(input);
        return { success: true };
      }),
  }),

  // Week procedures
  week: router({
    getBySeasonId: publicProcedure
      .input(z.object({ seasonId: z.number().int() }))
      .query(async ({ input }) => {
        return db.getWeeksBySeasonId(input.seasonId);
      }),

    getCurrent: publicProcedure.query(async () => {
      const season = await db.getSeasonByYear(new Date().getFullYear());
      if (!season) throw new TRPCError({ code: "NOT_FOUND", message: "Season not found" });

      const week = await db.getCurrentWeek(season.id);
      return week || null;
    }),

    getById: publicProcedure
      .input(z.object({ weekId: z.number().int() }))
      .query(async ({ input }) => {
        return db.getWeekById(input.weekId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          seasonId: z.number().int(),
          weekNumber: z.number().int(),
          startDate: z.date(),
          endDate: z.date(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }

        await db.createWeek(input);
        return { success: true };
      }),

    lock: protectedProcedure
      .input(z.object({ weekId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }

        const week = await db.getWeekById(input.weekId);
        if (!week) throw new TRPCError({ code: "NOT_FOUND", message: "Week not found" });

        // Update week to locked
        // Note: We need to add an update function to db.ts for weeks
        return { success: true };
      }),
  }),

  // Matchup procedures
  matchup: router({
    getByWeekId: publicProcedure
      .input(z.object({ weekId: z.number().int() }))
      .query(async ({ input }) => {
        return db.getMatchupsByWeekId(input.weekId);
      }),

    getById: publicProcedure
      .input(z.object({ matchupId: z.number().int() }))
      .query(async ({ input }) => {
        return db.getMatchupById(input.matchupId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          weekId: z.number().int(),
          externalGameId: z.string(),
          homeTeam: z.string(),
          awayTeam: z.string(),
          homeTeamAbbr: z.string(),
          awayTeamAbbr: z.string(),
          pointSpread: z.string(),
          spreadFavor: z.enum(["home", "away"]),
          gameTime: z.date(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }

        await db.createMatchup(input);
        return { success: true };
      }),

    updateScore: protectedProcedure
      .input(
        z.object({
          matchupId: z.number().int(),
          homeScore: z.number().int(),
          awayScore: z.number().int(),
          gameStatus: z.enum(["scheduled", "live", "final"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }

        await db.updateMatchup(input.matchupId, {
          homeScore: input.homeScore,
          awayScore: input.awayScore,
          gameStatus: input.gameStatus,
        });

        return { success: true };
      }),
  }),

  // Pick procedures
  pick: router({
    getByWeek: protectedProcedure
      .input(z.object({ weekId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        return db.getUserPicksForWeek(ctx.user.id, input.weekId);
      }),

    submit: protectedProcedure
      .input(
        z.object({
          matchupId: z.number().int(),
          weekId: z.number().int(),
          pickedTeam: z.string(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check if week is locked
        const week = await db.getWeekById(input.weekId);
        if (!week) throw new TRPCError({ code: "NOT_FOUND", message: "Week not found" });
        if (week.isLocked) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Week is locked for picks" });
        }

        // Check if matchup exists
        const matchup = await db.getMatchupById(input.matchupId);
        if (!matchup) throw new TRPCError({ code: "NOT_FOUND", message: "Matchup not found" });

        // Check if user already has a pick for this matchup
        const existingPicks = await db.getUserPicksForWeek(ctx.user.id, input.weekId);
        const existingPick = existingPicks.find((p) => p.matchupId === input.matchupId);

        if (existingPick) {
          // Update existing pick
          await db.updatePick(existingPick.id, { pickedTeam: input.pickedTeam });
        } else {
          // Create new pick
          await db.createPick({
            userId: ctx.user.id,
            matchupId: input.matchupId,
            weekId: input.weekId,
            pickedTeam: input.pickedTeam,
          });
        }

        return { success: true };
      }),

    delete: protectedProcedure
      .input(z.object({ pickId: z.number().int() }))
      .mutation(async ({ ctx, input }) => {
        const pick = await db.getPickById(input.pickId);
        if (!pick) throw new TRPCError({ code: "NOT_FOUND", message: "Pick not found" });

        if (pick.userId !== ctx.user.id && ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Cannot delete other user's pick" });
        }

        // We need to add a delete function to db.ts
        return { success: true };
      }),
  }),

  // Payment procedures
  payment: router({
    getByWeek: protectedProcedure
      .input(z.object({ weekId: z.number().int() }))
      .query(async ({ ctx, input }) => {
        return db.getUserPaymentForWeek(ctx.user.id, input.weekId);
      }),

    create: protectedProcedure
      .input(
        z.object({
          weekId: z.number().int(),
          amount: z.number().int(),
        })
      )
      .mutation(async ({ ctx, input }) => {
        // Check if payment already exists
        const existing = await db.getUserPaymentForWeek(ctx.user.id, input.weekId);
        if (existing) {
          throw new TRPCError({ code: "BAD_REQUEST", message: "Payment already exists for this week" });
        }

        await db.createPayment({
          userId: ctx.user.id,
          weekId: input.weekId,
          amount: input.amount,
          status: "pending",
        });

        return { success: true };
      }),

    updateStatus: protectedProcedure
      .input(
        z.object({
          paymentId: z.number().int(),
          status: z.enum(["pending", "completed", "failed", "refunded"]),
        })
      )
      .mutation(async ({ ctx, input }) => {
        if (ctx.user.role !== "admin") {
          throw new TRPCError({ code: "FORBIDDEN", message: "Admin only" });
        }

        await db.updatePayment(input.paymentId, { status: input.status });
        return { success: true };
      }),
  }),

  // Leaderboard procedures
  leaderboard: router({
    weekly: publicProcedure
      .input(z.object({ weekId: z.number().int() }))
      .query(async ({ input }) => {
        return db.getWeeklyLeaderboard(input.weekId);
      }),

    seasonal: publicProcedure
      .input(z.object({ seasonId: z.number().int() }))
      .query(async ({ input }) => {
        return db.getSeasonalLeaderboard(input.seasonId);
      }),
  }),

  // Prize pool procedures
  prizePool: router({
    getByWeek: publicProcedure
      .input(z.object({ weekId: z.number().int() }))
      .query(async ({ input }) => {
        return db.getPrizePoolForWeek(input.weekId);
      }),
  }),
});

export type AppRouter = typeof appRouter;
