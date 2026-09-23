import { getAuthUserId } from "@convex-dev/auth/server";
import { query } from "./_generated/server";
import { v } from "convex/values";
import { ROLES } from "./schema";
import { requireRole, getMyRestaurant, getMyNgo, haversineKm } from "./helpers";
import type { Id } from "./_generated/dataModel";

/** Joined view shape shared by all donation queries. */
export type DonationView = {
  _id: string;
  _creationTime: number;
  foodName: string;
  title?: string;
  category: string;
  quantity: number;
  unit: string;
  estimatedMeals: number;
  preparedAt: number;
  pickupDeadline: number;
  pickupAddress: string;
  notes?: string;
  status: string;
  restaurantId: string;
  restaurantName: string;
  restaurantAddress?: string;
  claimedByNgoId?: string;
  claimId?: string;
  claimStatus?: string;
  myClaimId?: string;
  myClaimStatus?: string;
};

/** Hydrate raw donation docs with restaurant names and the caller's claim info. */
export async function hydrate(
  ctx: any,
  docs: any[],
  viewer: { userId: string; role: string; ngoId?: string },
): Promise<DonationView[]> {
  const myNgo = viewer.role === ROLES.NGO ? await getMyNgo(ctx, viewer.userId as Id<"users">) : null;
  const myClaims =
    myNgo
      ? await ctx.db
          .query("claims")
          .withIndex("by_ngo", (q: any) => q.eq("ngoId", myNgo._id))
          .collect()
      : [];

  const views: DonationView[] = [];
  for (const d of docs) {
    const restaurant = await ctx.db.get(d.restaurantId as any);
    const claim = (
      await ctx.db
        .query("claims")
        .withIndex("by_donation", (q: any) => q.eq("donationId", d._id))
        .collect()
    ).find((c: any) => c.status !== "REJECTED" && c.status !== "CANCELLED");

    views.push({
      ...d,
      title: d.title ?? d.foodName,
      restaurantName: restaurant?.name ?? "Unknown restaurant",
      restaurantAddress: restaurant?.address,
      claimId: claim?._id,
      claimStatus: claim?.status,
      myClaimId: myClaims.find((c: any) => c.donationId === d._id)?._id,
      myClaimStatus: myClaims.find((c: any) => c.donationId === d._id)?.status,
    });
  }
  return views;
}

export async function currentViewer(ctx: any) {
  const { userId, user } = await requireRole(ctx, [
    ROLES.RESTAURANT,
    ROLES.NGO,
    ROLES.ADMIN,
  ]);
  const ngo = user.role === ROLES.NGO ? await getMyNgo(ctx, userId) : null;
  return { userId, role: user.role as string, ngoId: ngo?._id };
}

export async function currentViewerId(ctx: any) {
  return await getAuthUserId(ctx);
}

/** Public-for-signed-in-users list of every AVAILABLE donation (NGO browse). */
export const listAvailable = query({
  args: { search: v.optional(v.string()), category: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const viewer = await currentViewer(ctx);
    const now = Date.now();
    const rows = await ctx.db
      .query("food_donations")
      .withIndex("by_status", (q) => q.eq("status", "AVAILABLE"))
      .collect();

    const stillFresh = rows.filter((d) => d.pickupDeadline > now);
    let views = await hydrate(ctx, stillFresh, viewer);

    if (args.category && args.category !== "All") {
      views = views.filter((d) => d.category === args.category);
    }
    if (args.search?.trim()) {
      const q = args.search.trim().toLowerCase();
      views = views.filter(
        (d) =>
          d.foodName.toLowerCase().includes(q) ||
          d.restaurantName.toLowerCase().includes(q) ||
          (d.notes ?? "").toLowerCase().includes(q),
      );
    }
    return views.sort((a, b) => a.pickupDeadline - b.pickupDeadline);
  },
});

/** Restaurant dashboard/history: all my donations, newest first. */
export const listMine = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireRole(ctx, [ROLES.RESTAURANT, ROLES.ADMIN]);
    const restaurant = await getMyRestaurant(ctx, userId);
    if (!restaurant) return [];
    const docs = await ctx.db
      .query("food_donations")
      .withIndex("by_restaurant", (q) =>
        q.eq("restaurantId", restaurant._id),
      )
      .collect();
    const viewer = { userId, role: ROLES.RESTAURANT };
    const views = await hydrate(ctx, docs, viewer);
    return views.sort((a, b) => b._creationTime - a._creationTime);
  },
});

/** NGO "my claims" list: donations joined with the NGO's claim record. */
export const listMyClaims = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireRole(ctx, [ROLES.NGO, ROLES.ADMIN]);
    const ngo = await getMyNgo(ctx, userId);
    if (!ngo) return [];
    const claims = await ctx.db
      .query("claims")
      .withIndex("by_ngo", (q) => q.eq("ngoId", ngo._id))
      .collect();
    const docs = (
      await Promise.all(claims.map((c) => ctx.db.get(c.donationId)))
    ).filter(Boolean);
    const views = await hydrate(ctx, docs, { userId, role: ROLES.NGO });
    const byDonation = new Map(claims.map((c) => [c.donationId, c]));
    return views
      .map((v) => ({
        ...v,
        claim: byDonation.get(v._id as any),
      }))
      .sort((a, b) => {
        const ao = a.claim?.claimedAt ?? 0;
        const bo = b.claim?.claimedAt ?? 0;
        return bo - ao;
      });
  },
});
