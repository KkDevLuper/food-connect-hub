import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { v } from "convex/values";
import { ROLES } from "./schema";
import { requireRole, getMyNgo, getMyRestaurant, haversineKm } from "./helpers";

/**
 * SMART MATCHING — deliberately simple and transparent (no AI claims).
 *
 * score = 0.40 * proximity      (closer NGO scores higher)
 *       + 0.30 * urgency        (donations with less time left rank NGOs higher)
 *       + 0.30 * capacityFit    (NGO must handle the quantity)
 *
 * Weights favour the hard constraints (can they physically make it and take
 * the food?) while urgency nudges ordering. All numbers are shown so users can
 * audit the recommendation.
 */
const WEIGHTS = { proximity: 0.4, urgency: 0.3, capacity: 0.3 };
const URGENT_WINDOW_MS = 2 * 60 * 60 * 1000; // 2 hours
const MAX_USEFUL_KM = 25;

export type MatchExplanation = {
  ngoId: string;
  ngoName: string;
  address: string;
  distanceKm: number | null;
  capacityMeals: number;
  score: number; // 0..100
  breakdown: {
    proximityScore: number; // 0..1
    urgencyScore: number; // 0..1
    capacityScore: number; // 0..1
  };
  reasons: string[];
};

/**
 * Pure scoring function — exported for tests and reuse.
 * `estimatedMeals` is what the donation needs; `minutesLeft` feeds urgency.
 */
export function scoreNgo(opts: {
  donation: { estimatedMeals: number; pickupDeadline: number };
  ngo: { _id: string; name: string; address: string; lat?: number; lng?: number; capacityMeals: number };
  restaurant: { lat?: number; lng?: number };
  nowMs: number;
}): MatchExplanation {
  const { donation, ngo, restaurant, nowMs } = opts;
  const reasons: string[] = [];

  // 1) Proximity — NGO to restaurant.
  const distanceKm = haversineKm(ngo, restaurant);
  let proximityScore: number;
  if (distanceKm === null) {
    proximityScore = 0.5; // unknown location -> neutral; reasons explain why
    reasons.push("Location not set — scored neutrally");
  } else if (distanceKm <= 3) {
    proximityScore = 1;
    reasons.push(`Very close: ${distanceKm} km away`);
  } else if (distanceKm >= MAX_USEFUL_KM) {
    proximityScore = 0;
    reasons.push(`Far: ${distanceKm} km away`);
  } else {
    proximityScore = 1 - (distanceKm - 3) / (MAX_USEFUL_KM - 3);
    reasons.push(`${distanceKm} km away`);
  }

  // 2) Urgency — how little time remains before the pickup deadline.
  const minutesLeft = Math.max(0, Math.round((donation.pickupDeadline - nowMs) / 60000));
  let urgencyScore: number;
  if (donation.pickupDeadline <= nowMs) {
    urgencyScore = 0;
    reasons.push("Deadline already passed");
  } else if (minutesLeft <= 60) {
    urgencyScore = 1;
    reasons.push(`Urgent: only ${minutesLeft} min left`);
  } else if (minutesLeft >= 240) {
    urgencyScore = 0.4;
    reasons.push(`${Math.round(minutesLeft / 60)} h remaining`);
  } else {
    urgencyScore = 1 - (minutesLeft - 60) / (240 - 60) * 0.6; // 1.0 → 0.4
    reasons.push(`${minutesLeft} min remaining`);
  }

  // 3) Capacity fit — NGO must be able to handle the quantity.
  const need = Math.max(1, donation.estimatedMeals);
  let capacityScore: number;
  if (ngo.capacityMeals >= need) {
    const headroom = ngo.capacityMeals / need;
    capacityScore = headroom >= 3 ? 0.85 : 1; // slight penalty for silly oversizing
    reasons.push(
      `Capacity fits: ${ngo.capacityMeals} meals/day ≥ ${need} needed`,
    );
  } else {
    capacityScore = Math.max(0, ngo.capacityMeals / need);
    reasons.push(
      `Tight capacity: ${ngo.capacityMeals} < ${need} meals needed`,
    );
  }

  const score = Math.round(
    (WEIGHTS.proximity * proximityScore +
      WEIGHTS.urgency * urgencyScore +
      WEIGHTS.capacity * capacityScore) *
      100,
  );

  return {
    ngoId: ngo._id,
    ngoName: ngo.name,
    address: ngo.address,
    distanceKm,
    capacityMeals: ngo.capacityMeals,
    score,
    breakdown: {
      proximityScore: Math.round(proximityScore * 100) / 100,
      urgencyScore: Math.round(urgencyScore * 100) / 100,
      capacityScore: Math.round(capacityScore * 100) / 100,
    },
    reasons,
  };
}

/**
 * Ranked NGO recommendations for one of the restaurant's donations.
 * Restaurant-facing: helps them pick a claimant or see who the system prefers.
 */
export const recommendNgos = query({
  args: { donationId: v.id("food_donations") },
  handler: async (ctx, args): Promise<MatchExplanation[]> => {
    const { userId } = await requireRole(ctx, [ROLES.RESTAURANT]);
    const restaurant = await getMyRestaurant(ctx, userId);
    if (!restaurant) return [];

    const donation = await ctx.db.get(args.donationId);
    if (!donation || donation.restaurantId !== restaurant._id) {
      throw new Error("Donation not found among your donations.");
    }

    const ngos = await ctx.db.query("ngos").collect();
    const nowMs = Date.now();
    return ngos
      .map((ngo) =>
        scoreNgo({
          donation: {
            estimatedMeals: donation.estimatedMeals,
            pickupDeadline: donation.pickupDeadline,
          },
          ngo: {
            _id: ngo._id,
            name: ngo.name,
            address: ngo.address,
            lat: ngo.lat,
            lng: ngo.lng,
            capacityMeals: ngo.capacityMeals,
          },
          restaurant: { lat: restaurant.lat, lng: restaurant.lng },
          nowMs,
        }),
      )
      .sort((a, b) => b.score - a.score);
  },
});

/**
 * NGO-facing: which available donations they should grab first.
 * Same transparent formula, inverted — the donation's own urgency counts.
 */
export const recommendDonations = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireRole(ctx, [ROLES.NGO]);
    const ngo = await getMyNgo(ctx, userId);
    if (!ngo) return [];

    const nowMs = Date.now();
    const available = (
      await ctx.db
        .query("food_donations")
        .withIndex("by_status", (q) => q.eq("status", "AVAILABLE"))
        .collect()
    ).filter((d) => d.pickupDeadline > nowMs);

    return available
      .map((d) => {
        const match = scoreNgo({
          donation: { estimatedMeals: d.estimatedMeals, pickupDeadline: d.pickupDeadline },
          ngo: {
            _id: ngo._id,
            name: ngo.name,
            address: ngo.address,
            lat: ngo.lat,
            lng: ngo.lng,
            capacityMeals: ngo.capacityMeals,
          },
          restaurant: { lat: d.pickupLat, lng: d.pickupLng },
          nowMs,
        });
        const minutesLeft = Math.max(
          0,
          Math.round((d.pickupDeadline - nowMs) / 60000),
        );
        return {
          donationId: d._id,
          foodName: d.foodName,
          category: d.category,
          quantity: d.quantity,
          unit: d.unit,
          estimatedMeals: d.estimatedMeals,
          pickupAddress: d.pickupAddress,
          pickupDeadline: d.pickupDeadline,
          minutesLeft,
          matchScore: match.score,
          reasons: match.reasons,
          distanceKm: match.distanceKm,
        };
      })
      .sort((a, b) => b.matchScore - a.matchScore);
  },
});

export { WEIGHTS as MATCH_WEIGHTS, URGENT_WINDOW_MS };
