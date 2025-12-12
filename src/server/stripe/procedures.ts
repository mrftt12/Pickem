import { TRPCError } from "@trpc/server";
import { z } from "zod";
import Stripe from "stripe";
import { protectedProcedure, router } from "../_core/trpc";
import * as db from "../db";
import { WEEKLY_ENTRY_PRICE } from "./products";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || "", {
  apiVersion: "2024-06-20",
});

export const stripeRouter = router({
  createCheckoutSession: protectedProcedure
    .input(
      z.object({
        weekId: z.number().int(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const user = await db.getUserById(ctx.user.id);
      if (!user) throw new TRPCError({ code: "NOT_FOUND", message: "User not found" });

      const week = await db.getWeekById(input.weekId);
      if (!week) throw new TRPCError({ code: "NOT_FOUND", message: "Week not found" });

      // Check if user already paid for this week
      const existingPayment = await db.getUserPaymentForWeek(ctx.user.id, input.weekId);
      if (existingPayment && existingPayment.status === "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Payment already completed for this week",
        });
      }

      // Get or create Stripe customer
      let stripeCustomerId = user.stripeCustomerId;
      if (!stripeCustomerId) {
        const customer = await stripe.customers.create({
          email: user.email || undefined,
          name: user.name || undefined,
          metadata: {
            userId: ctx.user.id.toString(),
          },
        });
        stripeCustomerId = customer.id;
        await db.upsertUser({
          openId: user.openId,
          stripeCustomerId,
        });
      }

      // Create checkout session
      const origin = ctx.req.headers.origin || "https://example.com";
      const session = await stripe.checkout.sessions.create({
        customer: stripeCustomerId,
        customer_email: user.email || undefined,
        client_reference_id: ctx.user.id.toString(),
        metadata: {
          user_id: ctx.user.id.toString(),
          week_id: input.weekId.toString(),
          customer_email: user.email || "",
          customer_name: user.name || "",
        },
        line_items: [
          {
            price_data: {
              currency: "usd",
              product_data: {
                name: `NFL Pick'em Pool - Week ${week.weekNumber}`,
                description: "Entry fee for this week's pick'em pool",
              },
              unit_amount: WEEKLY_ENTRY_PRICE,
            },
            quantity: 1,
          },
        ],
        mode: "payment",
        success_url: `${origin}/payment-success?week=${input.weekId}`,
        cancel_url: `${origin}/payment-cancel?week=${input.weekId}`,
        allow_promotion_codes: true,
      });

      if (!session.url) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: "Failed to create checkout session",
        });
      }

      return {
        checkoutUrl: session.url,
        sessionId: session.id,
      };
    }),

  getPaymentHistory: protectedProcedure.query(async ({ ctx }) => {
    // This would fetch from database or Stripe API
    // For now, return empty array
    return [];
  }),

  getPaymentStatus: protectedProcedure
    .input(z.object({ weekId: z.number().int() }))
    .query(async ({ ctx, input }) => {
      const payment = await db.getUserPaymentForWeek(ctx.user.id, input.weekId);
      return payment || null;
    }),
});
