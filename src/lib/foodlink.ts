// FOODLINK shared frontend helpers.

export const FOOD_CATEGORIES = [
  "Cooked Meals",
  "Bakery & Snacks",
  "Fruits & Vegetables",
  "Prepared Foods",
  "Beverages",
  "Dairy & Desserts",
] as const;

export const UNITS = [
  "meals",
  "boxes",
  "trays",
  "kg",
  "pieces",
  "packs",
] as const;

export type DonationStatus =
  | "AVAILABLE"
  | "CLAIMED"
  | "PICKUP_CONFIRMED"
  | "DELIVERED"
  | "EXPIRED"
  | "CANCELLED";

export type ClaimStatus =
  | "PENDING_CONFIRMATION"
  | "CONFIRMED"
  | "PICKED_UP"
  | "DELIVERED"
  | "REJECTED"
  | "CANCELLED";

/** Tailwind classes per donation status (badge visuals). */
export const STATUS_STYLES: Record<DonationStatus, string> = {
  AVAILABLE: "bg-emerald-100/70 text-emerald-800 border-emerald-200/80",
  CLAIMED: "bg-amber-100/70 text-amber-800 border-amber-200/80",
  PICKUP_CONFIRMED: "bg-sky-100/70 text-sky-800 border-sky-200/80",
  DELIVERED: "bg-teal-100/70 text-teal-800 border-teal-200/80",
  EXPIRED: "bg-stone-200/70 text-stone-600 border-stone-300/70",
  CANCELLED: "bg-rose-100/70 text-rose-700 border-rose-200/80",
};

export const CLAIM_STATUS_STYLES: Record<ClaimStatus, string> = {
  PENDING_CONFIRMATION: "bg-amber-100/70 text-amber-800 border-amber-200/80",
  CONFIRMED: "bg-sky-100/70 text-sky-800 border-sky-200/80",
  PICKED_UP: "bg-indigo-100/70 text-indigo-800 border-indigo-200/80",
  DELIVERED: "bg-teal-100/70 text-teal-800 border-teal-200/80",
  REJECTED: "bg-rose-100/70 text-rose-700 border-rose-200/80",
  CANCELLED: "bg-stone-200/70 text-stone-600 border-stone-300/70",
};

export const DONATION_STATUS_LABELS: Record<DonationStatus, string> = {
  AVAILABLE: "Available",
  CLAIMED: "Claimed",
  "PICKUP_CONFIRMED": "Pickup confirmed",
  DELIVERED: "Delivered",
  EXPIRED: "Expired",
  CANCELLED: "Cancelled",
};

export function formatTimeLeft(deadline: number, nowMs: number): string {
  const diff = deadline - nowMs;
  if (diff <= 0) return "Expired";
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins} min left`;
  const hours = Math.floor(mins / 60);
  const minsLeft = mins % 60;
  if (hours < 24) return minsLeft > 0 ? `${hours}h ${minsLeft}m left` : `${hours}h left`;
  const days = Math.floor(hours / 24);
  return `${days}d ${hours % 24}h left`;
}

export function formatDateTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatTime(ts: number): string {
  return new Date(ts).toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Default <input type="datetime-local"> value ~2h from now. */
export function defaultDeadlineLocalValue(): string {
  const d = new Date(Date.now() + 2 * 60 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** Google Maps directions fallback (no API key needed — plain link). */
export function mapsDirectionsUrl(address: string) {
  return `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(address)}`;
}
