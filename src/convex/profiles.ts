import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";
import { profileFields } from "./helpers";

/**
 * Everything the shell/onboarding needs about the signed-in user:
 * role, org row, and whether onboarding is still pending.
 */
export const myProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;

    const role = user.role ?? null;
    let org: any = null;
    if (role === "restaurant") {
      org = await ctx.db
        .query("restaurants")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    } else if (role === "ngo") {
      org = await ctx.db
        .query("ngos")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
    }

    return {
      userId,
      email: user.email ?? null,
      name: user.name ?? null,
      role,
      isAnonymous: user.isAnonymous ?? false,
      org,
      onboardingComplete:
        role === "admin" ? true : role !== null && org !== null,
    };
  },
});

/** Update the caller's org profile (and NGO capacity). */
export const updateProfile = mutation({
  args: { org: v.object(profileFields), capacityMeals: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You must be signed in to do that.");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Your account no longer exists.");

    if (user.role === "restaurant") {
      const org = await ctx.db
        .query("restaurants")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (!org) throw new Error("Restaurant profile missing — finish onboarding first.");
      await ctx.db.patch(org._id, { ...args.org });
      return { ok: true as const };
    }
    if (user.role === "ngo") {
      const org = await ctx.db
        .query("ngos")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (!org) throw new Error("NGO profile missing — finish onboarding first.");
      await ctx.db.patch(org._id, {
        ...args.org,
        capacityMeals: args.capacityMeals ?? org.capacityMeals,
      });
      return { ok: true as const };
    }
    throw new Error("Only restaurant and NGO accounts have a profile to edit.");
  },
});
