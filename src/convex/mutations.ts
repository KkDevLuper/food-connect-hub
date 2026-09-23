import { getAuthUserId } from "@convex-dev/auth/server";
import { internalMutation, mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { ROLES } from "./schema";
import {
  donationFields,
  requireRole,
  getMyRestaurant,
  getMyNgo,
  suggestEstimatedMeals,
} from "./helpers";
import { emit } from "./webhooks";

// -- tiny util queries --------------------------------------------------------

/** Used by the frontend's ticking-clock hook. */
export const now = query({
  args: {},
  handler: async () => Date.now(),
});

// -- donations ----------------------------------------------------------------

export const createDonation = mutation({
  args: donationFields,
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.RESTAURANT]);
    const restaurant = await getMyRestaurant(ctx, userId);
    if (!restaurant) throw new Error("Complete your restaurant profile first.");

    const nowMs = Date.now();
    if (args.pickupDeadline <= nowMs) {
      throw new Error("Pickup deadline must be in the future.");
    }
    if (args.pickupDeadline <= args.preparedAt) {
      throw new Error("Pickup deadline must be after the preparation time.");
    }
    if (args.quantity <= 0) throw new Error("Quantity must be greater than zero.");

    const donationId = await ctx.db.insert("food_donations", {
      restaurantId: restaurant._id,
      foodName: args.foodName,
      title: args.foodName,
      category: args.category,
      quantity: args.quantity,
      unit: args.unit,
      estimatedMeals:
        args.estimatedMeals && args.estimatedMeals > 0
          ? Math.round(args.estimatedMeals)
          : suggestEstimatedMeals(args.quantity, args.unit),
      preparedAt: args.preparedAt,
      pickupDeadline: args.pickupDeadline,
      pickupAddress: args.pickupAddress,
      pickupLat: restaurant.lat,
      pickupLng: restaurant.lng,
      notes: args.notes,
      status: "AVAILABLE",
    });

    await emit(ctx.db, "donation.created", {
      donationId,
      foodName: args.foodName,
      quantity: args.quantity,
      unit: args.unit,
      estimatedMeals: args.estimatedMeals ?? null,
      pickupDeadline: args.pickupDeadline,
      restaurantId: restaurant._id,
      restaurantName: restaurant.name,
    });
    return donationId;
  },
});

/** Restaurant-side status change. Only cancelling is allowed here. */
export const cancelDonation = mutation({
  args: { donationId: v.id("food_donations") },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.RESTAURANT]);
    const restaurant = await getMyRestaurant(ctx, userId);
    if (!restaurant) throw new Error("Complete your restaurant profile first.");

    const donation = await ctx.db.get(args.donationId);
    if (!donation) throw new Error("Donation not found.");
    if (donation.restaurantId !== restaurant._id) {
      throw new Error("You can only cancel your own donations.");
    }
    if (donation.status === "DELIVERED") {
      throw new Error("Delivered donations cannot be cancelled.");
    }
    if (donation.status === "EXPIRED") {
      throw new Error("Expired donations cannot be cancelled.");
    }

    // If an NGO had an active claim, cancel it too.
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
    await emit(ctx.db, "donation.cancelled", {
      donationId: args.donationId,
      foodName: donation.foodName,
      restaurantId: restaurant._id,
      from: donation.status,
    });
    return { ok: true as const };
  },
});

// -- claims -------------------------------------------------------------------

export const claimDonation = mutation({
  args: { donationId: v.id("food_donations") },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.NGO]);
    const ngo = await getMyNgo(ctx, userId);
    if (!ngo) throw new Error("Complete your NGO profile first.");

    const donation = await ctx.db.get(args.donationId);
    if (!donation) throw new Error("Donation not found.");
    if (donation.status !== "AVAILABLE") {
      throw new Error(
        "Someone beat you to it — this donation is no longer available.",
      );
    }
    if (donation.pickupDeadline <= Date.now()) {
      throw new Error("This donation expired before it could be claimed.");
    }

    // Duplicate-claim guard: one active claim per donation.
    const prior = await ctx.db
      .query("claims")
      .withIndex("by_donation", (q) => q.eq("donationId", args.donationId))
      .collect();
    if (prior.some((c) => c.status !== "REJECTED" && c.status !== "CANCELLED")) {
      throw new Error("This donation already has an active claim.");
    }

    const claimId = await ctx.db.insert("claims", {
      donationId: args.donationId,
      ngoId: ngo._id,
      status: "PENDING_CONFIRMATION",
      claimedAt: Date.now(),
    });
    await ctx.db.patch(args.donationId, {
      status: "CLAIMED",
      claimedByNgoId: ngo._id,
    });

    await emit(ctx.db, "donation.claimed", {
      donationId: args.donationId,
      claimId,
      ngoId: ngo._id,
      ngoName: ngo.name,
      foodName: donation.foodName,
      restaurantId: donation.restaurantId,
    });
    return claimId;
  },
});

/** Restaurant rejects an NGO's pending claim (donation goes back to AVAILABLE). */
export const rejectClaim = mutation({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.RESTAURANT]);
    const restaurant = await getMyRestaurant(ctx, userId);
    if (!restaurant) throw new Error("Complete your restaurant profile first.");

    const claim = await ctx.db.get(args.claimId);
    if (!claim) throw new Error("Claim not found.");
    const donation = await ctx.db.get(claim.donationId);
    if (!donation) throw new Error("Donation not found.");
    if (donation.restaurantId !== restaurant._id) {
      throw new Error("You can only manage claims on your own donations.");
    }
    if (claim.status !== "PENDING_CONFIRMATION") {
      throw new Error("Only pending claims can be rejected.");
    }

    await ctx.db.patch(args.claimId, { status: "REJECTED" });
    await ctx.db.patch(donation._id, { status: "AVAILABLE", claimedByNgoId: undefined });
    await emit(ctx.db, "claim.rejected", {
      donationId: donation._id,
      claimId: claim._id,
      ngoId: claim.ngoId,
    });
    return { ok: true as const };
  },
});

// -- pickup workflow ------------------------------------------------------------

/** Restaurant confirms the NGO's pending claim. */
export const confirmPickup = mutation({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.RESTAURANT]);
    const restaurant = await getMyRestaurant(ctx, userId);
    if (!restaurant) throw new Error("Complete your restaurant profile first.");

    const claim = await ctx.db.get(args.claimId);
    if (!claim) throw new Error("Claim not found.");
    const donation = await ctx.db.get(claim.donationId);
    if (!donation) throw new Error("Donation not found.");
    if (donation.restaurantId !== restaurant._id) {
      throw new Error("You can only confirm pickups for your own donations.");
    }
    if (claim.status !== "PENDING_CONFIRMATION") {
      throw new Error("Only claims awaiting confirmation can be confirmed.");
    }

    await ctx.db.patch(args.claimId, {
      status: "CONFIRMED",
      confirmedAt: Date.now(),
    });
    await ctx.db.patch(donation._id, { status: "PICKUP_CONFIRMED" });
    await emit(ctx.db, "pickup.confirmed", {
      donationId: donation._id,
      claimId: claim._id,
      ngoId: claim.ngoId,
      restaurantId: donation.restaurantId,
    });
    return { ok: true as const };
  },
});

/** NGO marks the food as picked up. */
export const completePickup = mutation({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.NGO]);
    const ngo = await getMyNgo(ctx, userId);
    if (!ngo) throw new Error("Complete your NGO profile first.");

    const claim = await ctx.db.get(args.claimId);
    if (!claim) throw new Error("Claim not found.");
    if (claim.ngoId !== ngo._id) {
      throw new Error("You can only manage your own claims.");
    }
    const donation = await ctx.db.get(claim.donationId);
    if (!donation) throw new Error("Donation not found.");
    if (claim.status !== "CONFIRMED") {
      throw new Error("Wait for the restaurant to confirm your claim first.");
    }

    const pickupRecordId = await ctx.db.insert("pickup_records", {
      claimId: claim._id,
      donationId: donation._id,
      ngoId: claim.ngoId,
      restaurantId: donation.restaurantId,
      pickedUpAt: Date.now(),
      mealsRescued: donation.estimatedMeals,
    });
    await ctx.db.patch(claim._id, { status: "PICKED_UP", pickedUpAt: Date.now() });
    await ctx.db.patch(donation._id, { status: "PICKUP_CONFIRMED", pickupRecordId });
    await emit(ctx.db, "pickup.completed", {
      donationId: donation._id,
      claimId: claim._id,
      pickupRecordId,
      ngoId: claim.ngoId,
      mealsRescued: donation.estimatedMeals,
    });
    return { ok: true as const };
  },
});

/** NGO marks the food as delivered to people in need. */
export const completeDelivery = mutation({
  args: { claimId: v.id("claims") },
  handler: async (ctx, args) => {
    const { userId } = await requireRole(ctx, [ROLES.NGO]);
    const ngo = await getMyNgo(ctx, userId);
    if (!ngo) throw new Error("Complete your NGO profile first.");

    const claim = await ctx.db.get(args.claimId);
    if (!claim) throw new Error("Claim not found.");
    if (claim.ngoId !== ngo._id) {
      throw new Error("You can only manage your own claims.");
    }
    const donation = await ctx.db.get(claim.donationId);
    if (!donation) throw new Error("Donation not found.");
    if (claim.status !== "PICKED_UP") {
      throw new Error("Complete the pickup before marking delivery.");
    }

    await ctx.db.patch(claim._id, { status: "DELIVERED", deliveredAt: Date.now() });
    await ctx.db.patch(donation._id, { status: "DELIVERED" });
    if (donation.pickupRecordId) {
      await ctx.db.patch(donation.pickupRecordId, { deliveredAt: Date.now() });
    }
    await emit(ctx.db, "donation.delivered", {
      donationId: donation._id,
      claimId: claim._id,
      ngoId: claim.ngoId,
      restaurantId: donation.restaurantId,
      mealsRescued: donation.estimatedMeals,
    });
    return { ok: true as const };
  },
});

// -- expiry sweep ----------------------------------------------------------------

/**
 * Cron step: flips AVAILABLE donations whose deadline passed to EXPIRED and
 * emits webhook events. Runs every minute; harmless when nothing is due.
 */
export const expireDueDonations = internalMutation({
  args: {},
  handler: async (ctx) => {
    const nowMs = Date.now();
    const available = await ctx.db
      .query("food_donations")
      .withIndex("by_status", (q) => q.eq("status", "AVAILABLE"))
      .collect();
    let count = 0;
    for (const d of available) {
      if (d.pickupDeadline <= nowMs) {
        await ctx.db.patch(d._id, { status: "EXPIRED" });
        await emit(ctx.db, "donation.expired", {
          donationId: d._id,
          foodName: d.foodName,
          restaurantId: d.restaurantId,
        });
        count++;
      }
    }
    return count;
  },
});
