import { getAuthUserId } from "@convex-dev/auth/server";
import { mutation } from "./_generated/server";
import { v } from "convex/values";
import { ROLES, type DonationStatus } from "./schema";
import { ESTIMATES } from "./helpers";
import { emit } from "./webhooks";

/**
 * DEMO MODE — one-click seed data for the hackathon demo.
 *
 * Creates an admin account (admin@foodlink.app, passwordless email-OTP), three
 * restaurants, three NGOs, and ~10 donations spread across the whole lifecycle.
 * Only runs when the database has no food_donations yet.
 */

const HOUR = 60 * 60 * 1000;

const DEMO_RESTAURANTS = [
  {
    name: "Green Leaf Restaurant",
    contactName: "Asha Verma",
    phone: "+91 98100 11111",
    address: "12 MG Road, Indiranagar, Bengaluru 560038",
    lat: 12.9719,
    lng: 77.6412,
  },
  {
    name: "Spice Route Kitchen",
    contactName: "Rahul Nair",
    phone: "+91 98100 22222",
    address: "88 Brigade Road, Bengaluru 560025",
    lat: 12.9718,
    lng: 77.6050,
  },
  {
    name: "Cafe Aroma",
    contactName: "Meera Iyer",
    phone: "+91 98100 33333",
    address: "5 Koramangala 5th Block, Bengaluru 560095",
    lat: 12.9345,
    lng: 77.6266,
  },
];

const DEMO_NGOS = [
  {
    name: "Hope Foundation",
    contactName: "Sana Khan",
    phone: "+91 98200 11111",
    address: "22 Domino Layout, Domlur, Bengaluru 560071",
    lat: 12.9608,
    lng: 77.6387,
    capacityMeals: 150,
  },
  {
    name: "Anna Seva Trust",
    contactName: "Vikram Rao",
    phone: "+91 98200 22222",
    address: "40 Infantry Road, Shivaji Nagar, Bengaluru 560051",
    lat: 12.9820,
    lng: 77.6090,
    capacityMeals: 300,
  },
  {
    name: "Night Shelter Collective",
    contact_name: "",
    contactName: "Fatima Sheikh",
    phone: "+91 98200 33333",
    address: "9 Jyoti Nivas College Road, Koramangala 560095",
    lat: 12.9330,
    lng: 77.6180,
    capacityMeals: 80,
  },
];

const DEMO_DONATIONS: Array<{
  restaurant: number;
  foodName: string;
  category: string;
  quantity: number;
  unit: string;
  estimatedMeals: number;
  preparedHoursAgo: number;
  deadlineInHours: number;
  status: DonationStatus;
  claimant?: number;
  notes?: string;
}> = [
  { restaurant: 0, foodName: "Veg Meal Boxes", category: "Cooked Meals", quantity: 100, unit: "boxes", estimatedMeals: 100, preparedHoursAgo: 1, deadlineInHours: 3, status: "AVAILABLE", notes: "Freshly packed, includes rice, dal, sabzi." },
  { restaurant: 0, foodName: "Paneer Butter Masala Trays", category: "Cooked Meals", quantity: 40, unit: "trays", estimatedMeals: 40, preparedHoursAgo: 2, deadlineInHours: 1.5, status: "AVAILABLE", notes: "Keep warm; mild spice." },
  { restaurant: 1, foodName: "Veg Fried Rice", category: "Cooked Meals", quantity: 25, unit: "kg", estimatedMeals: 50, preparedHoursAgo: 0.5, deadlineInHours: 2, status: "AVAILABLE" },
  { restaurant: 1, foodName: "Evening Snacks Platter", category: "Bakery & Snacks", quantity: 60, unit: "pieces", estimatedMeals: 30, preparedHoursAgo: 3, deadlineInHours: 1, status: "AVAILABLE", notes: "Samosas, cutlets, sandwiches." },
  { restaurant: 2, foodName: "Fruit Bowls", category: "Fruits & Vegetables", quantity: 30, unit: "packs", estimatedMeals: 30, preparedHoursAgo: 4, deadlineInHours: 6, status: "AVAILABLE" },
  { restaurant: 0, foodName: "Dal Khichdi (100 meals)", category: "Cooked Meals", quantity: 100, unit: "meals", estimatedMeals: 100, preparedHoursAgo: 5, deadlineInHours: 0, status: "CLAIMED", claimant: 0 },
  { restaurant: 1, foodName: "Idli-Dosa Batter Packs", category: "Prepared Foods", quantity: 45, unit: "packs", estimatedMeals: 45, preparedHoursAgo: 6, deadlineInHours: 8, status: "PICKUP_CONFIRMED", claimant: 1 },
  { restaurant: 2, foodName: "Sandwich Order Cancellation (120 pcs)", category: "Bakery & Snacks", quantity: 120, unit: "pieces", estimatedMeals: 60, preparedHoursAgo: 2, deadlineInHours: 4, status: "DELIVERED", claimant: 0 },
  { restaurant: 2, foodName: "Salad Bar Surplus", category: "Fruits & Vegetables", quantity: 18, unit: "kg", estimatedMeals: 36, preparedHoursAgo: 7, deadlineInHours: -2, status: "DELIVERED", claimant: 1 },
  { restaurant: 1, foodName: "Buffet Surplus — Friday", category: "Cooked Meals", quantity: 35, unit: "kg", estimatedMeals: 70, preparedHoursAgo: 9, deadlineInHours: -4, status: "EXPIRED" },
  { restaurant: 0, foodName: "Dessert Counter Leftovers", category: "Bakery & Snacks", quantity: 20, unit: "boxes", estimatedMeals: 20, preparedHoursAgo: 8, deadlineInHours: -6, status: "EXPIRED" },
];

export const seedDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const existing = await ctx.db.query("food_donations").collect();
    if (existing.length > 0) {
      return { ok: false as const, message: "Demo data already exists." };
    }

    const now = Date.now();

    // -- orgs (no real user accounts; owned by the admin user for RLS parity) --
    const adminId = await ctx.db.insert("users", {
      name: "FOODLINK Admin",
      email: "admin@foodlink.app",
      isAnonymous: false,
      role: ROLES.ADMIN,
    });

    const restaurantIds = [];
    for (const r of DEMO_RESTAURANTS) {
      restaurantIds.push(
        await ctx.db.insert("restaurants", {
          userId: adminId,
          ...r,
        }),
      );
    }

    const ngoIds = [];
    for (const n of DEMO_NGOS) {
      const { contact_name: _ignored, ...clean } = n as any;
      ngoIds.push(
        await ctx.db.insert("ngos", {
          userId: adminId,
          ...clean,
        }),
      );
    }

    // -- donations + claims + pickup records -----------------------------------
    let deliveredCount = 0;
    for (const d of DEMO_DONATIONS) {
      const restaurantId = restaurantIds[d.restaurant];
      const preparedAt = now - d.preparedHoursAgo * HOUR;
      const pickupDeadline = now + d.deadlineInHours * HOUR;
      const pickupLat = DEMO_RESTAURANTS[d.restaurant].lat;
      const pickupLng = DEMO_RESTAURANTS[d.restaurant].lng;

      const donationId = await ctx.db.insert("food_donations", {
        restaurantId,
        foodName: d.foodName,
        title: d.foodName,
        category: d.category,
        quantity: d.quantity,
        unit: d.unit,
        estimatedMeals: d.estimatedMeals,
        preparedAt,
        pickupDeadline,
        pickupAddress: DEMO_RESTAURANTS[d.restaurant].address,
        pickupLat,
        pickupLng,
        notes: d.notes,
        status: d.status,
      });

      if (d.claimant !== undefined) {
        const ngoId = ngoIds[d.claimant];
        const claimId = await ctx.db.insert("claims", {
          donationId,
          ngoId,
          status:
            d.status === "PICKUP_CONFIRMED"
              ? "CONFIRMED"
              : d.status === "DELIVERED"
                ? "DELIVERED"
                : "PENDING_CONFIRMATION",
          claimedAt: preparedAt + 10 * 60 * 1000,
          confirmedAt:
            d.status === "PICKUP_CONFIRMED" || d.status === "DELIVERED"
              ? preparedAt + 30 * 60 * 1000
              : undefined,
          pickedUpAt:
            d.status === "DELIVERED" ? preparedAt + 60 * 60 * 1000 : undefined,
          deliveredAt: d.status === "DELIVERED" ? preparedAt + 90 * 60 * 1000 : undefined,
        });
        await ctx.db.patch(donationId, { claimedByNgoId: ngoId });

        if (d.status === "DELIVERED") {
          await ctx.db.insert("pickup_records", {
            claimId,
            donationId,
            ngoId,
            restaurantId,
            pickedUpAt: preparedAt + 60 * 60 * 1000,
            deliveredAt: preparedAt + 90 * 60 * 1000,
            mealsRescued: d.estimatedMeals,
          });
        }
        if (d.status === "PICKUP_CONFIRMED") {
          await ctx.db.insert("pickup_records", {
            claimId,
            donationId,
            ngoId,
            restaurantId,
            pickedUpAt: undefined,
            deliveredAt: undefined,
            mealsRescued: undefined,
          });
        }
      }
    }

    await emit(ctx.db, "seed.completed", {
      restaurants: restaurantIds.length,
      ngos: ngoIds.length,
      donations: DEMO_DONATIONS.length,
    });

    return {
      ok: true as const,
      message: `Seeded ${restaurantIds.length} restaurants, ${ngoIds.length} NGOs, ${DEMO_DONATIONS.length} donations.`,
    };
  },
});

/** Reset all FOODLINK domain data (keeps auth users). */
export const resetDemoData = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Sign in first.");
    const user = await ctx.db.get(userId);
    if (user?.role !== ROLES.ADMIN) {
      throw new Error("Only the admin can reset demo data.");
    }
    for (const t of ["food_donations", "claims", "pickup_records", "webhook_events"] as const) {
      for (const row of await ctx.db.query(t).collect()) {
        await ctx.db.delete(row._id);
      }
    }
    return { ok: true as const };
  },
});
