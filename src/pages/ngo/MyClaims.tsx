import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/foodlink/AppShell";
import { DonationCard } from "@/components/foodlink/DonationCard";
import { LoadingState, EmptyState } from "@/components/foodlink/States";
import { RequireRole } from "@/components/foodlink/DashboardGuard";
import { StatusBadge } from "@/components/foodlink/StatusBadge";import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { PackageCheck, Bike, HandHeart, MapPin } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { formatDateTime, mapsDirectionsUrl } from "@/lib/foodlink";
import { toast } from "sonner";
import type { ClaimStatus } from "@/lib/foodlink";

function MyClaimsInner() {
  const claims = useQuery(api.donations.listMyClaims);
  const completePickup = useMutation(api.mutations.completePickup);
  const completeDelivery = useMutation(api.mutations.completeDelivery);
  const nowMs = useNow();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  if (claims === undefined) {
    return (
      <AppShell title="My claims" subtitle="Track pickups and deliveries">
        <LoadingState />
      </AppShell>
    );
  }

  async function act(fn: () => Promise<unknown>, success: string) {
    try {
      await fn();
      toast.success(success);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    } finally {
      setBusyId(null);
    }
  }

  const active = claims.filter((c) =>
    ["PENDING_CONFIRMATION", "CONFIRMED", "PICKED_UP"].includes(
      c.claim?.status ?? "",
    ),
  );
  const past = claims.filter((c) =>
    ["DELIVERED", "REJECTED", "CANCELLED"].includes(c.claim?.status ?? ""),
  );

  return (
    <AppShell title="My claims" subtitle="Track pickups and deliveries">
      <div className="space-y-6">
        <section>
          <h2 className="mb-3 font-semibold">Active claims</h2>
          {active.length === 0 ? (
            <EmptyState
              icon={<HandHeart className="size-5" />}
              title="No active claims"
              description="Browse available food and claim a donation to get started."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {active.map((c) => (
                <DonationCard
                  key={c._id}
                  donation={{ ...c, status: c.status as any }}
                  nowMs={nowMs}
                  showRestaurant
                  footerNote={
                    <div className="flex items-center justify-between gap-2 rounded-xl bg-white/50 px-3 py-2">
                      <span className="text-xs text-muted-foreground">
                        Claim status
                      </span>
                      <StatusBadge status={c.claim!.status} />
                    </div>
                  }
                  actions={
                    <div className="flex w-full flex-wrap gap-2">
                      {c.claim?.status === "PENDING_CONFIRMATION" && (
                        <p className="w-full rounded-lg bg-amber-100/60 px-3 py-2 text-xs text-amber-800">
                          Waiting for {c.restaurantName} to confirm your claim…
                        </p>
                      )}
                      {c.claim?.status === "CONFIRMED" && (
                        <>
                          <Button
                            size="sm"
                            className="flex-1"
                            disabled={busyId === c._id}
                            onClick={() =>
                              act(
                                () =>
                                  completePickup({ claimId: c.claim!._id as any }),
                                "Pickup marked complete — deliver the food!",
                              )
                            }
                          >
                            <Bike className="mr-1 size-3.5" /> Mark pickup complete
                          </Button>
                          <Button asChild size="sm" variant="outline" className="border-white/70 bg-white/60">
                            <a
                              href={mapsDirectionsUrl(c.pickupAddress)}
                              target="_blank"
                              rel="noreferrer"
                            >
                              <MapPin className="size-3.5" />
                            </a>
                          </Button>
                        </>
                      )}
                      {c.claim?.status === "PICKED_UP" && (
                        <Button
                          size="sm"
                          className="flex-1"
                          disabled={busyId === c._id}
                          onClick={() =>
                            act(
                              () =>
                                completeDelivery({ claimId: c.claim!._id as any }),
                              "Delivery complete — meals rescued! 🎉",
                            )
                          }
                        >
                          <PackageCheck className="mr-1 size-3.5" /> Mark delivered
                        </Button>
                      )}
                    </div>
                  }
                />
              ))}
            </div>
          )}
        </section>

        <section>
          <h2 className="mb-3 font-semibold">History</h2>
          {past.length === 0 ? (
            <p className="glass rounded-2xl px-4 py-6 text-center text-sm text-muted-foreground">
              No completed or rejected claims yet.
            </p>
          ) : (
            <div className="space-y-2">
              {past.map((c) => (
                <div
                  key={c._id}
                  className="glass flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.foodName}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.restaurantName} ·{" "}
                      {c.claim?.deliveredAt
                        ? `delivered ${formatDateTime(c.claim.deliveredAt)}`
                        : c.claim?.claimedAt
                          ? `claimed ${formatDateTime(c.claim.claimedAt)}`
                          : ""}
                    </p>
                  </div>
                  <StatusBadge status={c.claim!.status} />
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </AppShell>
  );
}

export default function MyClaims() {
  return (
    <RequireRole roles={["ngo"]}>
      <MyClaimsInner />
    </RequireRole>
  );
}
