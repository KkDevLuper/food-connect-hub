import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/foodlink/AppShell";
import { DonationCard } from "@/components/foodlink/DonationCard";
import { DashboardStats } from "@/components/foodlink/DashboardStats";
import { LoadingState, EmptyState } from "@/components/foodlink/States";
import { RequireRole } from "@/components/foodlink/DashboardGuard";
import { MatchPanel } from "@/components/foodlink/MatchPanel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Utensils,
  PlusCircle,
  ClipboardList,
  Users,
  HandHeart,
  Check,
  X,
} from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { formatDateTime } from "@/lib/foodlink";
import { toast } from "sonner";

function RestaurantDashboardInner() {
  const donations = useQuery(api.donations.listMine);
  const claimsForMe = useQuery(api.claims.pendingForMyDonations);
  const nowMs = useNow();

  const confirmPickup = useMutation(api.mutations.confirmPickup);
  const rejectClaim = useMutation(api.mutations.rejectClaim);
  const cancelDonation = useMutation(api.mutations.cancelDonation);

  const [matchDonationId, setMatchDonationId] = useState<string | null>(null);
  const matches = useQuery(
    api.matching.recommendNgos,
    matchDonationId ? { donationId: matchDonationId as any } : "skip",
  );

  if (donations === undefined || claimsForMe === undefined) {
    return (
      <AppShell title="Restaurant dashboard" subtitle="Manage surplus pickups">
        <LoadingState />
      </AppShell>
    );
  }

  const active = donations.filter((d) =>
    ["AVAILABLE", "CLAIMED", "PICKUP_CONFIRMED"].includes(d.status),
  );
  const completed = donations.filter((d) => d.status === "DELIVERED");
  const mealsRescued = completed.reduce((s, d) => s + d.estimatedMeals, 0);
  const pendingClaims = claimsForMe.filter(
    (c) => c.status === "PENDING_CONFIRMATION",
  );

  async function act(fn: () => Promise<unknown>, success: string) {
    try {
      await fn();
      toast.success(success);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Action failed.");
    }
  }

  return (
    <AppShell
      title="Restaurant dashboard"
      subtitle="List surplus food and manage pickups"
      actions={
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link to="/restaurant/donate">
            <PlusCircle className="mr-1 size-4" /> New donation
          </Link>
        </Button>
      }
    >
      <div className="space-y-6">
        <DashboardStats
          stats={[
            { label: "Active donations", value: active.length, icon: ClipboardList },
            { label: "Delivered", value: completed.length, icon: Check, accent: "teal" },
            {
              label: "Meals rescued",
              value: mealsRescued,
              icon: Utensils,
              estimate: true,
            },
            {
              label: "Claims to review",
              value: pendingClaims.length,
              icon: HandHeart,
              accent: "amber",
            },
          ]}
        />

        {pendingClaims.length > 0 && (
          <section className="glass-strong rounded-2xl p-4">
            <h2 className="flex items-center gap-2 font-semibold">
              <HandHeart className="size-4 text-primary" /> Claims waiting for
              your confirmation
            </h2>
            <div className="mt-3 space-y-3">
              {pendingClaims.map((c) => (
                <div key={c._id} className="glass rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <p className="text-sm font-semibold">{c.donationName}</p>
                      <p className="text-xs text-muted-foreground">
                        {c.ngoName} · claimed {formatDateTime(c.claimedAt)}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        onClick={() =>
                          act(
                            () => confirmPickup({ claimId: c._id as any }),
                            "Pickup confirmed — the NGO is on the way.",
                          )
                        }
                      >
                        <Check className="mr-1 size-3.5" /> Confirm
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="border-rose-200/80 text-rose-700"
                        onClick={() =>
                          act(
                            () => rejectClaim({ claimId: c._id as any }),
                            "Claim rejected — donation is available again.",
                          )
                        }
                      >
                        <X className="mr-1 size-3.5" /> Reject
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Active donations</h2>
            <Link
              to="/restaurant/donations"
              className="text-sm font-medium text-primary hover:underline"
            >
              View all
            </Link>
          </div>
          {active.length === 0 ? (
            <EmptyState
              icon={<PlusCircle className="size-5" />}
              title="No active donations"
              description="Post your first surplus donation and nearby NGOs will see it instantly."
              action={
                <Button asChild size="sm">
                  <Link to="/restaurant/donate">Create donation</Link>
                </Button>
              }
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {active.map((d) => (
                <DonationCard
                  key={d._id}
                  donation={{ ...d, status: d.status as any }}
                  nowMs={nowMs}
                  actions={
                    <>
                      {d.status === "AVAILABLE" && (
                        <Button
                          size="sm"
                          variant="outline"
                          className="border-white/70 bg-white/60"
                          onClick={() => setMatchDonationId(d._id)}
                        >
                          <Users className="mr-1 size-3.5" /> Smart match
                        </Button>
                      )}
                      {d.status !== "DELIVERED" && d.status !== "EXPIRED" && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-700 hover:bg-rose-50"
                          onClick={() =>
                            act(
                              () => cancelDonation({ donationId: d._id as any }),
                              "Donation cancelled.",
                            )
                          }
                        >
                          Cancel
                        </Button>
                      )}
                    </>
                  }
                />
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Smart matching dialog */}
      <Dialog
        open={!!matchDonationId}
        onOpenChange={(open) => !open && setMatchDonationId(null)}
      >
        <DialogContent className="glass-strong max-h-[85vh] overflow-y-auto border-white/60 sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Smart matching</DialogTitle>
            <DialogDescription>
              Transparent scoring: 40% proximity · 30% urgency · 30% capacity.
            </DialogDescription>
          </DialogHeader>
          {matches === undefined ? (
            <LoadingState label="Scoring NGOs…" />
          ) : (
            <MatchPanel matches={matches} />
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}

export default function RestaurantDashboard() {
  return (
    <RequireRole roles={["restaurant"]}>
      <RestaurantDashboardInner />
    </RequireRole>
  );
}
