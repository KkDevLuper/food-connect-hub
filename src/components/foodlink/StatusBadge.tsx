import { Badge } from "@/components/ui/badge";
import {
  STATUS_STYLES,
  CLAIM_STATUS_STYLES,
  DONATION_STATUS_LABELS,
} from "@/lib/foodlink";
import type { DonationStatus, ClaimStatus } from "@/lib/foodlink";

const CLAIM_LABELS: Record<ClaimStatus, string> = {
  PENDING_CONFIRMATION: "Awaiting confirmation",
  CONFIRMED: "Pickup confirmed",
  PICKED_UP: "Picked up",
  DELIVERED: "Delivered",
  REJECTED: "Rejected",
  CANCELLED: "Cancelled",
};

export function StatusBadge({
  status,
  className = "",
}: {
  status: DonationStatus | ClaimStatus;
  className?: string;
}) {
  const styles =
    STATUS_STYLES[status as DonationStatus] ??
    CLAIM_STATUS_STYLES[status as ClaimStatus] ??
    "";
  const label =
    DONATION_STATUS_LABELS[status as DonationStatus] ??
    CLAIM_LABELS[status as ClaimStatus] ??
    String(status);
  return (
    <Badge
      variant="outline"
      className={`rounded-full backdrop-blur-sm font-medium ${styles} ${className}`}
    >
      {label}
    </Badge>
  );
}
