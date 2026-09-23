import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { ROLES } from "./schema";
import { requireRole, getMyRestaurant } from "./helpers";

/**
 * Claims waiting on the signed-in restaurant: joined with donation + NGO
 * names for the confirmation cards.
 */
export const pendingForMyDonations = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireRole(ctx, [ROLES.RESTAURANT]);
    const restaurant = await getMyRestaurant(ctx, userId);
    if (!restaurant) return [];

    const donations = await ctx.db
      .query("food_donations")
      .withIndex("by_restaurant", (q) =>
        q.eq("restaurantId", restaurant._id).eq("status", "CLAIMED"),
      )
      .collect();

    const out = [];
    for (const d of donations) {
      const claims = await ctx.db
        .query("claims")
        .withIndex("by_donation", (q) => q.eq("donationId", d._id))
        .collect();
      const pending = claims.find((c) => c.status === "PENDING_CONFIRMATION");
      if (!pending) continue;
      const ngo = await ctx.db.get(pending.ngoId);
      out.push({
        _id: pending._id,
        donationId: d._id,
        donationName: d.foodName,
        ngoName: ngo?.name ?? "NGO",
        claimedAt: pending.claimedAt,
        status: pending.status,
      });
    }
    return out;
  },
});

/** Every claim ever made on the restaurant's donations (history). */
export const historyForMyDonations = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireRole(ctx, [ROLES.RESTAURANT]);
    const restaurant = await getMyRestaurant(ctx, userId);
    if (!restaurant) return [];

    const donations = await ctx.db
      .query("food_donations")
      .withIndex("by_restaurant", (q) => q.eq("restaurantId", restaurant._id))
      .collect();
    const donationIds = new Set(donations.map((d) => d._id));

    const out = [];
    for (const d of donations) {
      const claims = await ctx.db
        .query("claims")
        .withIndex("by_donation", (q) => q.eq("donationId", d._id))
        .collect();
      for (const c of claims) {
        const ngo = await ctx.db.get(c.ngoId);
        out.push({
          _id: c._id,
          donationId: d._id,
          donationName: d.foodName,
          ngoName: ngo?.name ?? "NGO",
          claimedAt: c.claimedAt,
          status: c.status,
        });
      }
    }
    return out.sort((a, b) => b.claimedAt - a.claimedAt);
  },
});
