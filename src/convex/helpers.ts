import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { v } from "convex/values";
import type { Doc, Id } from "./_generated/dataModel";
import { ROLES, type Role } from "./schema";

/** Require a signed-in user; throws a friendly error otherwise. */
export async function requireUser(ctx: {
  auth: { getUserIdentity: () => Promise<{ subject: string } | null> };
}): Promise<Id<"users">> {
  const userId = await getAuthUserId(ctx as never);
  if (!userId) throw new Error("You must be signed in to do that.");
  return userId;
}

/**
 * Resolve the caller's role. Guests (anonymous sign-in) get whatever role the
 * onboarding flow has stored on their user row; until then they are unassigned.
 */
export async function requireRole(
  ctx: any,
  allowed: Role[],
): Promise<{ userId: Id<"users">; user: Doc<"users"> }> {
  const userId = await requireUser(ctx);
  const user = await ctx.db.get(userId);
  if (!user) throw new Error("Your account no longer exists.");
  if (!allowed.includes((user.role ?? "user") as Role)) {
    throw new Error("You do not have permission to do that.");
  }
  return { userId, user };
}

/** Look up the signed-in user's restaurant org row, if any. */
export async function getMyRestaurant(ctx: any, userId: Id<"users">) {
  return await ctx.db
    .query("restaurants")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
}

/** Look up the signed-in user's NGO org row, if any. */
export async function getMyNgo(ctx: any, userId: Id<"users">) {
  return await ctx.db
    .query("ngos")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .first();
}

export async function getOrgForRole(ctx: any, userId: Id<"users">, role: Role) {
  if (role === ROLES.RESTAURANT) return getMyRestaurant(ctx, userId);
  if (role === ROLES.NGO) return getMyNgo(ctx, userId);
  return null;
}

// -- shared estimate constants ----------------------------------------------
// Clearly-labelled demo heuristics, not scientific figures.
export const ESTIMATES = {
  /** kg of food assumed per rescued meal serving (FAO-flavoured demo guess). */
  KG_PER_MEAL: 0.5,
  /** kg CO2e per kg of food kept out of landfill (approx.). */
  KG_CO2_PER_KG: 2.5,
};

/** Rough meal count derived from quantity+unit when the user doesn't set one. */
export function suggestEstimatedMeals(quantity: number, unit: string): number {
  const u = unit.toLowerCase();
  if (u.includes("meal")) return Math.round(quantity);
  if (u.includes("kg")) return Math.max(1, Math.round(quantity / ESTIMATES.KG_PER_MEAL));
  if (u.includes("tray") || u.includes("box") || u.includes("pack")) return Math.round(quantity);
  return Math.max(1, Math.round(quantity * 1.5));
}

// -- geo (haversine) ----------------------------------------------------------
export function haversineKm(
  a: { lat?: number; lng?: number },
  b: { lat?: number; lng?: number },
): number | null {
  if (
    typeof a.lat !== "number" ||
    typeof a.lng !== "number" ||
    typeof b.lat !== "number" ||
    typeof b.lng !== "number"
  ) {
    return null;
  }
  const R = 6371;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const lat1 = (a.lat * Math.PI) / 180;
  const lat2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * R * Math.asin(Math.sqrt(h)) * 10) / 10;
}

// -- validation schemas (convex validators reused by mutations) ---------------
export const profileFields = {
  name: v.string(),
  contactName: v.optional(v.string()),
  phone: v.optional(v.string()),
  address: v.string(),
  lat: v.optional(v.number()),
  lng: v.optional(v.number()),
};

export const donationFields = {
  foodName: v.string(),
  category: v.string(),
  quantity: v.number(),
  unit: v.string(),
  estimatedMeals: v.optional(v.number()),
  preparedAt: v.number(),
  pickupDeadline: v.number(),
  pickupAddress: v.string(),
  notes: v.optional(v.string()),
};
