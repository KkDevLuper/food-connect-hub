# 🥗 FOODLINK — Turning Surplus Food Into Shared Meals

A hackathon-ready platform that connects **restaurants** with **verified NGOs/shelters**
so safe surplus food gets claimed and collected **before the pickup deadline**.

Built mobile-first (6-inch screens) with a **light Glassmorphism** theme.

---

## 🧱 Tech stack (as shipped)

| Layer | Choice |
|---|---|
| Frontend | React 19 + Vite + TypeScript + Tailwind CSS |
| Backend / DB | **Convex** (managed, real-time; platform-provided) |
| Auth | Email OTP (passwordless email code) + anonymous demo sign-in via Convex Auth |
| Webhooks | n8n-ready outbox (`webhook_events` table + cron dispatcher) |
| Hosting | Any static host (Netlify / Vercel / Cloudflare Pages) + Convex deployment |

> **Why Convex instead of raw Supabase?** This Freebuff environment ships a managed
> Convex backend with working email-OTP auth and zero API keys required — perfect for a
> smartphone-only hackathon. The schema in [`supabase/schema.sql`](supabase/schema.sql)
> maps 1:1 to the Supabase design (profiles / restaurants / ngos / food_donations /
> claims / pickup_records) if your judges require Supabase.

## 👥 Roles & core workflow

```
Restaurant: Login → Dashboard → Create Food Donation
NGO:        sees donation → claims it
Restaurant: confirms pickup
NGO:        completes pickup → marks delivered
Statuses:   AVAILABLE → CLAIMED → PICKUP_CONFIRMED → DELIVERED (or EXPIRED / CANCELLED)
```

### Feature checklist
- **Restaurant** — dashboard, create donation (food, category, quantity, unit,
  prepared time, pickup deadline, address, notes), donation history with status
  chips, cancel donation, confirm/reject NGO claims, smart-match viewer.
- **NGO** — dashboard with **recommended donations**, browse available food with
  search + category filters, one-tap claim (duplicate & expiry guarded),
  claim list with countdowns, mark **pickup complete** and **delivery complete**.
- **Admin** — totals (restaurants, NGOs, active/completed/expired donations),
  **meals rescued**, **food waste diverted** and **CO₂e avoided** (clearly labelled
  estimates), user directory, donation moderation, demo-data reset.
- **Security** — every Convex mutation/query re-checks identity server-side:
  users only modify their own org/donations/claims; admin endpoints require the
  admin role. No secrets are ever exposed to the frontend.

## 🧠 Smart matching (transparent, no AI claims)

```
score = 0.40 × proximity   (haversine distance NGO ↔ restaurant)
      + 0.30 × urgency     (time remaining before pickup deadline)
      + 0.30 × capacity    (NGO daily meal capacity vs. meals needed)
```

Priorities from the brief are respected: less time remaining → higher urgency,
nearby NGOs rank higher, NGOs with enough capacity rank higher. Every score is
shown with its breakdown and human-readable reasons, and the UI states plainly
that this is a **recommendation only — it does not assess food safety**.

## 🔔 n8n integration (optional)

Domain mutations write events to a `webhook_events` outbox; a cron job drains it
and POSTs to `N8N_WEBHOOK_URL` with an optional `X-Foodlink-Secret` header.

Events: `donation.created`, `donation.claimed`, `claim.rejected`,
`pickup.confirmed`, `pickup.completed`, `donation.delivered`,
`donation.cancelled`, `donation.expired`, `seed.completed`.

Payloads look like:

```json
{ "event": "donation.claimed", "sentAt": 1730000000000, "donationId": "...", "ngoName": "Hope Foundation" }
```

**To enable:** set `N8N_WEBHOOK_URL` (and optionally `N8N_WEBHOOK_SECRET`) as a
Convex environment variable (`npx convex env set N8N_WEBHOOK_URL https://your-n8n/webhook/foodlink`).
Without the variable the app works exactly the same — events simply queue.

## 🚀 Run locally

```bash
bun install
bun dev          # Vite dev server (managed by Freebuff in this environment)
bun convex dev --once   # push Convex functions + generate types
```

Environment variables (already provided by the platform):

- `VITE_CONVEX_URL` — Convex deployment URL (frontend)

Optional (Convex env vars, not frontend):

- `N8N_WEBHOOK_URL`, `N8N_WEBHOOK_SECRET` — n8n automation

## 🎬 2-minute demo script

1. Open the landing page → **Explore demo mode** (or sign in with email OTP).
2. On onboarding, tap **Load demo data** → creates *Green Leaf Restaurant*,
   *Hope Foundation* and 11 donations across every status.
3. Register as a **restaurant** → create "100 Veg Meal Boxes" with a 3-hour deadline.
4. Open an incognito window / second device, register as an **NGO** → the new
   donation appears under **Available food** → **Claim** it.
5. Back as the restaurant → **Confirm** the claim (status → PICKUP_CONFIRMED).
6. As the NGO → **Mark pickup complete** → **Mark delivered**.
7. Watch the restaurant, NGO and admin dashboards (and the public landing
   counters) update in real time.

## 🌍 Deployment

1. Push functions: `bunx convex deploy` (or let the platform manage it).
2. Build the frontend: `bun run build`.
3. Host statically; point `VITE_CONVEX_URL` at your production Convex deployment.

## 🔮 Future-ready (deliberately not implemented)

Architecture leaves clean seams for: Google Maps (address fields + optional
lat/lng already stored), push/WhatsApp notifications (webhook outbox), AI-based
matching (swap `scoreNgo` in `src/convex/matching.ts`), food image
classification, real-time location tracking, and deeper analytics.

## ⚠️ Honest limitations

- Food safety: FOODLINK facilitates logistics only — donors and collectors
  remain responsible for checking food, as the UI states.
- Distances use haversine (straight-line) unless coordinates are set; demo orgs
  ship with Bengaluru coordinates.
- Email OTP requires inbox access; use **demo mode** (anonymous sign-in) for
  quick on-stage testing.
