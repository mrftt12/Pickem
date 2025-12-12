/**
 * Stripe product and pricing configuration for NFL Pick'em Pool
 * These are the products available for purchase in the application
 */

export const STRIPE_PRODUCTS = {
  WEEKLY_ENTRY: {
    name: "Weekly NFL Pick'em Entry",
    description: "Entry fee for one week of NFL pick'em pool",
    amount: 1000, // $10.00 in cents
    currency: "usd",
  },
};

export const WEEKLY_ENTRY_PRICE = 1000; // $10 in cents
