import {
  httpAction,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import type { GenericMutationCtx } from "convex/server";

/**
 * n8n-ready webhook dispatcher.
 *
 * Domain mutations never call the network. They append rows to
 * `webhook_events` (an outbox), and `processOutbox` drains the queue by POSTing
 * to `N8N_WEBHOOK_URL`. If no URL is configured nothing is sent and events
 * simply stay queued — so n8n is optional, never required.
 *
 * Events emitted today:
 *   donation.created    - a new donation was listed
 *   donation.claimed    - an NGO claimed a donation
 *   pickup.confirmed    - the restaurant confirmed the NGO pickup
 *   pickup.completed    - the NGO picked the food up
 *   donation.delivered  - the NGO delivered the food
 *   donation.cancelled  - the restaurant cancelled a donation
 *   donation.expired    - pickup deadline passed unclaimed (cron)
 */

const MAX_ATTEMPTS = 3;

/**
 * Shared helper used by domain mutations. Writes one row to the outbox.
 * The payload is wrapped so n8n receives `{ event, sentAt, ...data }`.
 */
export async function emit(
  db: GenericMutationCtx<any>["db"],
  type: string,
  payload: Record<string, unknown>,
) {
  await db.insert("webhook_events", {
    type,
    payload: { event: type, sentAt: Date.now(), ...payload },
    createdAt: Date.now(),
    attempts: 0,
  });
}

/** Cron step: schedule delivery for a batch of undelivered events. */
export const processOutbox = internalMutation({
  args: { limit: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const pending = await ctx.db
      .query("webhook_events")
      .withIndex("by_pending", (q) => q.eq("deliveredAt", undefined))
      .order("asc")
      .take(args.limit ?? 20);

    let scheduled = 0;
    for (const event of pending) {
      if (event.attempts >= MAX_ATTEMPTS) continue;
      await ctx.scheduler.runAfter(0, internal.webhooks.deliver, {
        eventId: event._id,
      });
      scheduled++;
    }
    return scheduled;
  },
});

export const getEvent = internalQuery({
  args: { eventId: v.id("webhook_events") },
  handler: async (ctx, args) => ctx.db.get(args.eventId),
});

/** Fires one HTTP POST. Never throws — failures are recorded on the row. */
export const deliver = internalAction({
  args: { eventId: v.id("webhook_events") },
  handler: async (ctx, args) => {
    const event = await ctx.runQuery(internal.webhooks.getEvent, {
      eventId: args.eventId,
    });
    if (!event || event.deliveredAt) return;

    const url = process.env.N8N_WEBHOOK_URL;
    if (!url) return; // n8n not configured -> event stays queued, app works fine

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(process.env.N8N_WEBHOOK_SECRET
            ? { "X-Foodlink-Secret": process.env.N8N_WEBHOOK_SECRET }
            : {}),
        },
        body: JSON.stringify(event.payload),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      await ctx.runMutation(internal.webhooks.markDelivered, {
        eventId: args.eventId,
      });
    } catch (err) {
      await ctx.runMutation(internal.webhooks.markFailed, {
        eventId: args.eventId,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  },
});

export const markDelivered = internalMutation({
  args: { eventId: v.id("webhook_events") },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.eventId, { deliveredAt: Date.now() });
  },
});

export const markFailed = internalMutation({
  args: { eventId: v.id("webhook_events"), error: v.string() },
  handler: async (ctx, args) => {
    const event = await ctx.db.get(args.eventId);
    if (!event) return;
    await ctx.db.patch(args.eventId, {
      attempts: event.attempts + 1,
      lastError: args.error,
    });
  },
});

/** Optional health endpoint: GET /.well-known/foodlink */
export const health = httpAction(async () => {
  return new Response(JSON.stringify({ ok: true, service: "foodlink" }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
});
