import { authTables } from "@convex-dev/auth/server";
import { defineSchema, defineTable } from "convex/server";
import { Infer, v } from "convex/values";

// ---------------------------------------------------------------------------
// FOODLINK schema.
// Mirrors the Supabase design in /supabase/schema.sql:
//   users ~ profiles, restaurants, ngos, food_donations, claims, pickup_records
// ---------------------------------------------------------------------------

export const ROLES = {
  ADMIN: "admin",
  RESTAURANT: "restaurant",
  NGO: "ngo",
} as const;

export const roleValidator = v.union(
  v.literal(ROLES.ADMIN),
  v.literal(ROLES.RESTAURANT),
  v.literal(ROLES.NGO),
);
export type Role = Infer<typeof roleValidator>;

export const DONATION_STATUSES = [
  "AVAILABLE",
  "CLAIMED",
  "PICKUP_CONFIRMED",
  "DELIVERED",
  "EXPIRED",
  "CANCELLED",
] as const;
export const donationStatusValidator = v.union(
  ...DONATION_STATUSES.map((s) => v.literal(s)),
);
export type DonationStatus = Infer<typeof donationStatusValidator>;

export const CLAIM_STATUSES = [
  "PENDING_CONFIRMATION",
  "CONFIRMED",
  "PICKED_UP",
  "DELIVERED",
  "REJECTED",
  "CANCELLED",
] as const;
export const claimStatusValidator = v.union(
  ...CLAIM_STATUSES.map((s) => v.literal(s)),
);
export type ClaimStatus = Infer<typeof claimStatusValidator>;

const schema = defineSchema(
  {
    // default auth tables using convex auth.
    ...authTables, // do not remove or modify

    // the users table is the default users table that is brought in by the authTables
    users: defineTable({
      name: v.optional(v.string()), // name of the user. do not remove
      image: v.optional(v.string()), // image of the user. do not remove
      email: v.optional(v.string()), // email of the user. do not remove
      emailVerificationTime: v.optional(v.number()), // email verification time. do not remove
      isAnonymous: v.optional(v.boolean()), // is the user anonymous. do not remove

      role: v.optional(roleValidator), // restaurant | ngo | admin
    }).index("email", ["email"]), // index for the email. do not remove or modify

    // ~ Supabase `profiles` (+ merged restaurant/ngo org rows for convenience)
    restaurants: defineTable({
      userId: v.id("users"),
      name: v.string(),
      contactName: v.optional(v.string()),
      phone: v.optional(v.string()),
      address: v.string(),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
    }).index("by_user", ["userId"]),

    ngos: defineTable({
      userId: v.id("users"),
      name: v.string(),
      contactName: v.optional(v.string()),
      phone: v.optional(v.string()),
      address: v.string(),
      lat: v.optional(v.number()),
      lng: v.optional(v.number()),
      // Daily meal-serving capacity, used by the matching algorithm.
      capacityMeals: v.number(),
    }).index("by_user", ["userId"]),

    food_donations: defineTable({
      restaurantId: v.id("restaurants"),
      title: v.string(),
      foodName: v.string(),
      category: v.string(),
      quantity: v.number(),
      unit: v.string(),
      estimatedMeals: v.number(),
      preparedAt: v.number(),
      pickupDeadline: v.number(),
      pickupAddress: v.string(),
      pickupLat: v.optional(v.number()),
      pickupLng: v.optional(v.number()),
      notes: v.optional(v.string()),
      status: donationStatusValidator,
      claimedByNgoId: v.optional(v.id("ngos")),
      pickupRecordId: v.optional(v.id("pickup_records")),
    })
      .index("by_restaurant", ["restaurantId", "status"])
      .index("by_status", ["status"])
      .index("by_deadline", ["status", "pickupDeadline"]),

    // One active claim per donation, enforced in mutations.
    claims: defineTable({
      donationId: v.id("food_donations"),
      ngoId: v.id("ngos"),
      status: claimStatusValidator,
      claimedAt: v.number(),
      confirmedAt: v.optional(v.number()),
      pickedUpAt: v.optional(v.number()),
      deliveredAt: v.optional(v.number()),
    })
      .index("by_donation", ["donationId"])
      .index("by_ngo", ["ngoId", "status"]),

    pickup_records: defineTable({
      claimId: v.id("claims"),
      donationId: v.id("food_donations"),
      ngoId: v.id("ngos"),
      restaurantId: v.id("restaurants"),
      pickedUpAt: v.optional(v.number()),
      deliveredAt: v.optional(v.number()),
      mealsRescued: v.optional(v.number()),
    }).index("by_donation", ["donationId"]),

    // Outbox for n8n (or any automation) webhooks.
    webhook_events: defineTable({
      type: v.string(),
      payload: v.any(),
      createdAt: v.number(),
      deliveredAt: v.optional(v.number()),
      attempts: v.number(),
      lastError: v.optional(v.string()),
    }).index("by_pending", ["deliveredAt", "createdAt"]),
  },
  {
    schemaValidation: false,
  },
);

export default schema;
