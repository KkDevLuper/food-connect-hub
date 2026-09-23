import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/foodlink/AppShell";
import { DonationCard } from "@/components/foodlink/DonationCard";
import { LoadingState, EmptyState } from "@/components/foodlink/States";
import { RequireRole } from "@/components/foodlink/DashboardGuard";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { HandHeart, Search, MapPin } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { FOOD_CATEGORIES, mapsDirectionsUrl } from "@/lib/foodlink";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

function AvailableInner() {
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const available = useQuery(api.donations.listAvailable, {
    search: search || undefined,
    category,
  });
  const claimDonation = useMutation(api.mutations.claimDonation);
  const nowMs = useNow();

  if (available === undefined) {
    return (
      <AppShell title="Available food" subtitle="Live surplus near you">
        <LoadingState />
      </AppShell>
    );
  }

  async function handleClaim(donationId: string, foodName: string) {
    try {
      await claimDonation({ donationId: donationId as any });
      toast.success(`Claimed "${foodName}" — waiting for restaurant confirmation.`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not claim.");
    }
  }

  return (
    <AppShell title="Available food" subtitle="First come, first served — claim fast">
      <div className="space-y-4">
        {/* Search + filters */}
        <div className="space-y-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search food or restaurant…"
              className="border-white/70 bg-white/70 pl-9"
            />
          </div>
          <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            {["All", ...FOOD_CATEGORIES].map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={cn(
                  "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur transition-colors",
                  category === c
                    ? "border-primary bg-primary text-primary-foreground shadow-sm"
                    : "border-white/70 bg-white/55 text-muted-foreground hover:bg-white/75",
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {available.length === 0 ? (
          <EmptyState
            icon={<Search className="size-5" />}
            title="Nothing available right now"
            description="Check back soon — restaurants post surplus food throughout the day, and urgent items are claimed quickly."
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {available.map((d) => (
              <DonationCard
                key={d._id}
                donation={{ ...d, status: "AVAILABLE" as const }}
                nowMs={nowMs}
                actions={
                  <div className="flex w-full gap-2">
                    <Button
                      size="sm"
                      className="flex-1"
                      onClick={() => handleClaim(d._id, d.foodName)}
                    >
                      <HandHeart className="mr-1 size-3.5" /> Claim donation
                    </Button>
                    <Button asChild size="sm" variant="outline" className="border-white/70 bg-white/60">
                      <a
                        href={mapsDirectionsUrl(d.pickupAddress)}
                        target="_blank"
                        rel="noreferrer"
                        aria-label="Open directions in Google Maps"
                      >
                        <MapPin className="size-3.5" />
                      </a>
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}

export default function AvailableDonations() {
  return (
    <RequireRole roles={["ngo"]}>
      <AvailableInner />
    </RequireRole>
  );
}
