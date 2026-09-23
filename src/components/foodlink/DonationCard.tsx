import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
} from "@/components/ui/card";
import { StatusBadge } from "./StatusBadge";
import { formatTimeLeft, formatDateTime, mapsDirectionsUrl } from "@/lib/foodlink";
import type { DonationStatus } from "@/lib/foodlink";
import {
  MapPin,
  Timer,
  UtensilsCrossed,
  ArrowRight,
  XCircle,
} from "lucide-react";
import type { ReactNode } from "react";

export type DonationCardData = {
  _id: string;
  foodName: string;
  category: string;
  quantity: number;
  unit: string;
  estimatedMeals: number;
  pickupDeadline: number;
  pickupAddress: string;
  notes?: string;
  status: DonationStatus;
  restaurantName?: string;
  claimStatus?: string;
  myClaimId?: string;
  myClaimStatus?: string;
};

export function DonationCard({
  donation,
  nowMs,
  /** Role-specific action buttons (claim / confirm / cancel / view). */
  actions,
  showRestaurant = true,
  footerNote,
}: {
  donation: DonationCardData;
  nowMs: number;
  actions?: ReactNode;
  showRestaurant?: boolean;
  footerNote?: ReactNode;
}) {
  const expired = donation.pickupDeadline <= nowMs;
  const urgent = !expired && donation.pickupDeadline - nowMs < 60 * 60 * 1000;

  return (
    <Card className="glass gap-3 rounded-2xl border-white/60 py-4 transition-shadow hover:shadow-lg">
      <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0 px-4">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="truncate text-base font-semibold tracking-tight">
              {donation.foodName}
            </h3>
            <StatusBadge status={donation.status} />
          </div>
          {showRestaurant && donation.restaurantName && (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">
              {donation.restaurantName}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-1">
          <span
            className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${
              expired
                ? "bg-stone-200/70 text-stone-600"
                : urgent
                  ? "bg-rose-100/80 text-rose-700"
                  : "bg-emerald-100/70 text-emerald-800"
            }`}
          >
            <Timer className="size-3" />
            {formatTimeLeft(donation.pickupDeadline, nowMs)}
          </span>
          <span className="text-[11px] text-muted-foreground">
            until {formatDateTime(donation.pickupDeadline)}
          </span>
        </div>
      </CardHeader>

      <CardContent className="space-y-2 px-4 text-sm">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <UtensilsCrossed className="size-3.5 text-primary" />
            {donation.category}
          </span>
          <span className="font-medium text-foreground">
            {donation.quantity} {donation.unit} · ~{donation.estimatedMeals} meals
          </span>
        </div>
        <p className="flex items-start gap-1.5 text-muted-foreground">
          <MapPin className="mt-0.5 size-3.5 shrink-0 text-primary" />
          <span className="line-clamp-2">{donation.pickupAddress}</span>
        </p>
        {donation.notes && (
          <p className="line-clamp-2 rounded-lg bg-white/40 px-2.5 py-1.5 text-xs text-muted-foreground">
            {donation.notes}
          </p>
        )}
        {footerNote}
      </CardContent>

      {actions && (
        <CardFooter className="gap-2 px-4 pb-1">
          {actions}
        </CardFooter>
      )}
    </Card>
  );
}

/** Small helper for the common "open details" link-button. */
export function ViewDetailsButton({ onClick }: { onClick: () => void }) {
  return (
    <Button variant="outline" size="sm" onClick={onClick} className="gap-1.5 border-white/70 bg-white/60">
      Details
      <ArrowRight className="size-3.5" />
    </Button>
  );
}

export function CancelButton({
  onClick,
  disabled,
}: {
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={onClick}
      disabled={disabled}
      className="gap-1.5 border-rose-200/80 text-rose-700 hover:bg-rose-50"
    >
      <XCircle className="size-3.5" />
      Cancel
    </Button>
  );
}
