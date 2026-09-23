import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ROLES } from "./schema";
import { requireRole, ESTIMATES } from "./helpers";

/** Paginated-ish admin listing (latest 100 users). */
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, [ROLES.ADMIN]);
    const users = await ctx.db.query("users").order("desc").take(100);
    const out = [];
    for (const u of users) {
      let org: any = null;
      if (u.role === "restaurant") {
        org = await ctx.db
          .query("restaurants")
          .withIndex("by_user", (q) => q.eq("userId", u._id))
          .first();
      } else if (u.role === "ngo") {
        org = await ctx.db
          .query("ngos")
          .withIndex("by_user", (q) => q.eq("userId", u._id))
          .first();
      }
      out.push({
        _id: u._id,
        email: u.email ?? "(anonymous/guest)",
        name: u.name ?? null,
        role: u.role ?? null,
        orgName: org?.name ?? null,
        isAnonymous: u.isAnonymous ?? false,
        _creationTime: u._creationTime,
      });
    }
    return out;
  },
});

/** The admin impact dashboard: platform-wide totals and clearly-labelled estimates. */
export const impactStats = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, [ROLES.ADMIN]);

    const restaurants = (await ctx.db.query("restaurants").collect()).length;
    const ngos = (await ctx.db.query("ngos").collect()).length;
    const donations = await ctx.db.query("food_donations").collect();

    const byStatus = {
      AVAILABLE: 0,
      CLAIMED: 0,
      PICKUP_CONFIRMED: 0,
      DELIVERED: 0,
      EXPIRED: 0,
      CANCELLED: 0,
    };
    let mealsRescued = 0;
    for (const d of donations) {
      byStatus[d.status as keyof typeof byStatus] += 1;
      if (d.status === "DELIVERED") mealsRescued += d.estimatedMeals;
    }

    const kgDiverted = Math.round(mealsRescued * ESTIMATES.KG_PER_MEAL);
    const co2SavedKg = Math.round(kgDiverted * ESTIMATES.KG_CO2_PER_KG);

    return {
      totalRestaurants: restaurants,
      totalNgos: ngos,
      activeDonations:
        byStatus.AVAILABLE + byStatus.CLAIMED + byStatus.PICKUP_CONFIRMED,
      completedDonations: byStatus.DELIVERED,
      expiredDonations: byStatus.EXPIRED,
      cancelledDonations: byStatus.CANCELLED,
      totalDonations: donations.length,
      mealsRescued,
      // Clearly labelled estimates:
      foodWasteReducedKg: kgDiverted,
      co2SavedKg,
      byStatus,
      estimatesNote: `Estimates: ${ESTIMATES.KG_PER_MEAL} kg food per meal serving, ${ESTIMATES.KG_CO2_PER_KG} kg CO2e per kg food diverted.`,
    };
  },
});

/** Recent donations across the whole platform (admin table). */
export const listDonations = query({
  args: {},
  handler: async (ctx) => {
    await requireRole(ctx, [ROLES.ADMIN]);
    const docs = await ctx.db
      .query("food_donations")
      .order("desc")
      .take(100);
    const out = [];
    for (const d of docs) {
      const restaurant = await ctx.db.get(d.restaurantId);
      const ngo = d.claimedByNgoId ? await ctx.db.get(d.claimedByNgoId) : null;
      out.push({
        _id: d._id,
        foodName: d.foodName,
        category: d.category,
        quantity: d.quantity,
        unit: d.unit,
        estimatedMeals: d.estimatedMeals,
        status: d.status,
        pickupDeadline: d.pickupDeadline,
        restaurantName: restaurant?.name ?? "—",
        ngoName: ngo?.name ?? null,
        _creationTime: d._creationTime,
      });
    }
    return out;
  },
});

// -- admin mutations -----------------------------------------------------------

/** Admin override: cancel any donation (e.g. flagged unsafe or spam). */
export const cancelDonation = mutation({
  args: { donationId: v.id("food_donations") },
  handler: async (ctx, args) => {
    await requireRole(ctx, [ROLES.ADMIN]);
    const donation = await ctx.db.get(args.donationId);
    if (!donation) throw new Error("Donation not found.");
    if (donation.status === "DELIVERED" || donation.status === "EXPIRED") {
      throw new Error("Delivered or expired donations cannot be cancelled.");
    }
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_donation", (q) => q.eq("donationId", args.donationId))
      .collect();
    for (const c of claims) {
      if (c.status !== "REJECTED" && c.status !== "CANCELLED") {
        await ctx.db.patch(c._id, { status: "CANCELLED" });
      }
    }
    await ctx.db.patch(args.donationId, { status: "CANCELLED" });
    return { ok: true as const };
  },
});
