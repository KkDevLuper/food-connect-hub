import { query } from "./_generated/server";
import { ESTIMATES } from "./helpers";

/** Non-sensitive aggregate impact numbers for the public landing page. */
export const stats = query({
  args: {},
  handler: async (ctx) => {
    const donations = await ctx.db.query("food_donations").collect();
    let completed = 0;
    let active = 0;
    let mealsRescued = 0;
    for (const d of donations) {
      if (d.status === "DELIVERED") {
        completed++;
        mealsRescued += d.estimatedMeals;
      }
      if (["AVAILABLE", "CLAIMED", "PICKUP_CONFIRMED"].includes(d.status)) {
        active++;
      }
    }
    return {
      mealsRescued,
      completedDonations: completed,
      activeDonations: active,
      foodWasteReducedKg: Math.round(mealsRescued * ESTIMATES.KG_PER_MEAL),
    };
  },
});
