import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { ROLES, roleValidator } from "./schema";
import { profileFields } from "./helpers";

/**
 * Completes registration after email sign-in by creating the role-based org
 * row (restaurants / ngos). Idempotent: re-submitting with the same role
 * updates the org, switching roles is rejected to keep claims data sane.
 */
export const completeRegistration = mutation({
  args: {
    role: roleValidator,
    org: v.object(profileFields),
    capacityMeals: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("You must be signed in first.");
    const user = await ctx.db.get(userId);
    if (!user) throw new Error("Your account no longer exists.");

    const existingRole = user.role as string | undefined;
    if (existingRole && existingRole !== args.role) {
      throw new Error(
        `This account is already registered as a ${existingRole}. Sign in with a different email to register a different account type.`,
      );
    }

    // Admin eligibility must be validated BEFORE mutating the caller's role,
    // otherwise the caller would count themselves as the existing admin. Only
    // admins with a real signable auth account block registration — the demo
    // seed's synthetic admin user row (no credentials) must not.
    if (args.role === ROLES.ADMIN) {
      const adminUsers = (await ctx.db.query("users").collect()).filter(
        (u) => u.role === ROLES.ADMIN && u._id !== userId,
      );
      let realAdmins = 0;
      for (const admin of adminUsers) {
        const account = await ctx.db
          .query("authAccounts")
          .withIndex("userIdAndProvider", (q) => q.eq("userId", admin._id))
          .first();
        if (account) realAdmins++;
      }
      if (realAdmins > 0) {
        throw new Error(
          "An admin account already exists. Ask the existing admin for access.",
        );
      }
    }

    await ctx.db.patch(userId, { role: args.role });

    if (args.role === ROLES.RESTAURANT) {
      const existing = await ctx.db
        .query("restaurants")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, { ...args.org });
        return { orgId: existing._id, role: args.role };
      }
      const orgId = await ctx.db.insert("restaurants", {
        userId,
        ...args.org,
      });
      return { orgId, role: args.role };
    }

    if (args.role === ROLES.ADMIN) {
      // Admin needs no org row.
      return { orgId: null, role: args.role };
    }

    if (args.role === ROLES.NGO) {
      if (!args.capacityMeals || args.capacityMeals < 1) {
        throw new Error("Please set your daily meal capacity (at least 1).");
      }
      const existing = await ctx.db
        .query("ngos")
        .withIndex("by_user", (q) => q.eq("userId", userId))
        .first();
      if (existing) {
        await ctx.db.patch(existing._id, {
          ...args.org,
          capacityMeals: args.capacityMeals,
        });
        return { orgId: existing._id, role: args.role };
      }
      const orgId = await ctx.db.insert("ngos", {
        userId,
        ...args.org,
        capacityMeals: args.capacityMeals,
      });
      return { orgId, role: args.role };
    }

    // Admin needs no org row.
    return { orgId: null, role: args.role };
  },
});
