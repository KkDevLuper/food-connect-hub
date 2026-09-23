import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

// Flip AVAILABLE donations past their pickup deadline to EXPIRED.
crons.interval(
  "expire due donations",
  { minutes: 1 },
  internal.mutations.expireDueDonations,
  {},
);

// Drain the n8n webhook outbox.
crons.interval(
  "process webhook outbox",
  { minutes: 1 },
  internal.webhooks.processOutbox,
  { limit: 20 },
);

export default crons;
