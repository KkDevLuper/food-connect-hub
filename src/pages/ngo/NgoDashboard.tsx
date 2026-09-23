import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/foodlink/AppShell";
import { DashboardStats } from "@/components/foodlink/DashboardStats";
import { LoadingState, EmptyState } from "@/components/foodlink/States";
import { RequireRole } from "@/components/foodlink/DashboardGuard";
import { StatusBadge } from "@/components/foodlink/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Sparkles,
  HandHeart,
  Search,
  PackageCheck,
  ClipboardList,
  MapPin,
  Timer,
  ArrowRight,
} from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { formatTimeLeft, mapsDirectionsUrl } from "@/lib/foodlink";
import { toast } from "sonner";

function NgoDashboardInner() {
  const recommendations = useQuery(api.matching.recommendDonations);
  const myClaims = useQuery(api.donations.listMyClaims);
  const claimDonation = useMutation(api.mutations.claimDonation);
  const nowMs = useNow();

  if (recommendations === undefined || myClaims === undefined) {
    return (
      <AppShell title="NGO dashboard" subtitle="Find and rescue surplus food">
        <LoadingState />
      </AppShell>
    );
  }

  const activeClaims = myClaims.filter((c) =>
    ["PENDING_CONFIRMATION", "CONFIRMED", "PICKED_UP"].includes(c.claim?.status ?? ""),
  );
  const delivered = myClaims.filter(
    (c) => c.claim?.status === "DELIVERED",
  );
  const peopleReached = delivered.reduce((s, c) => s + c.estimatedMeals, 0);

  async function handleClaim(donationId: string, foodName: string) {
    try {
      await claimDonation({ donationId: donationId as any });
      toast.success(`Claimed "${foodName}" — waiting for the restaurant to confirm.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not claim.");
    }
  }

  return (
    <AppShell title="NGO dashboard" subtitle="Find and rescue surplus food">
      <div className="space-y-6">
        <DashboardStats
          stats={[
            { label: "Active claims", value: activeClaims.length, icon: ClipboardList },
            { label: "Delivered", value: delivered.length, icon: PackageCheck, accent: "teal" },
            { label: "People reached", value: peopleReached, icon: HandHeart, estimate: true },
            {
              label: "Open offers",
              value: recommendations.length,
              icon: Search,
              accent: "amber",
            },
          ]}
        />

        {/* Recommended by smart matching */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="flex items-center gap-1.5 font-semibold">
              <Sparkles className="size-4 text-primary" /> Best matches for you
            </h2>
            <Link
              to="/ngo/available"
              className="text-sm font-medium text-primary hover:underline"
            >
              Browse all
            </Link>
          </div>
          {recommendations.length === 0 ? (
            <EmptyState
              icon={<Search className="size-5" />}
              title="No available donations right now"
              description="When restaurants post surplus food, the best matches for your capacity and location appear here."
            />
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {recommendations.slice(0, 4).map((d) => (
                <Card key={d.donationId} className="glass gap-2 rounded-2xl border-white/60 py-4">
                  <CardContent className="space-y-2 px-4">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <h3 className="truncate font-semibold">{d.foodName}</h3>
                        <p className="text-xs text-muted-foreground">
                          {d.quantity} {d.unit} · ~{d.estimatedMeals} meals
                        </p>
                      </div>
                      <span className="flex shrink-0 items-center gap-1 rounded-full bg-primary/10 px-2 py-1 text-xs font-bold text-primary">
                        <Sparkles className="size-3" /> {d.matchScore}
                      </span>
                    </div>
                    <p className="flex items-center gap-1 text-xs text-muted-foreground">
                      <Timer className="size-3.5 text-primary" />
                      {formatTimeLeft(d.pickupDeadline, nowMs)}
                      {d.distanceKm !== null && (
                        <>
                          {" · "}
                          <MapPin className="size-3.5 text-primary" />
                          {d.distanceKm} km
                        </>
                      )}
                    </p>
                    <div className="flex gap-2 pt-1">
                      <Button
                        size="sm"
                        className="flex-1"
                        onClick={() => handleClaim(d.donationId, d.foodName)}
                      >
                        <HandHeart className="mr-1 size-3.5" /> Claim
                      </Button>
                      <Button asChild size="sm" variant="outline" className="border-white/70 bg-white/60">
                        <a
                          href={mapsDirectionsUrl(d.pickupAddress)}
                          target="_blank"
                          rel="noreferrer"
                        >
                          <MapPin className="size-3.5" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        {/* Active claims */}
        <section>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="font-semibold">Your active claims</h2>
            <Link
              to="/ngo/claims"
              className="flex items-center text-sm font-medium text-primary hover:underline"
            >
              Manage <ArrowRight className="ml-0.5 size-3.5" />
            </Link>
          </div>
          {activeClaims.length === 0 ? (
            <EmptyState
              icon={<HandHeart className="size-5" />}
              title="No active claims"
              description="Claim a donation above to start a rescue."
            />
          ) : (
            <div className="space-y-2">
              {activeClaims.map((c) => (
                <div key={c._id} className="glass flex items-center justify-between gap-3 rounded-xl px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold">{c.foodName}</p>
                    <p className="text-xs text-muted-foreground">
                      {c.restaurantName} ·{" "}
                      {formatTimeLeft(c.pickupDeadline, nowMs)}
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

export default function NgoDashboard() {
  return (
    <RequireRole roles={["ngo"]}>
      <NgoDashboardInner />
    </RequireRole>
  );
}
