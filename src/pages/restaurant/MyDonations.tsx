import { useState } from "react";
import { Link } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/foodlink/AppShell";
import { DonationCard } from "@/components/foodlink/DonationCard";
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
import { PlusCircle, Users } from "lucide-react";
import { useNow } from "@/hooks/use-now";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import type { DonationStatus } from "@/lib/foodlink";

const FILTERS: Array<{ key: "ALL" | DonationStatus; label: string }> = [
  { key: "ALL", label: "All" },
  { key: "AVAILABLE", label: "Available" },
  { key: "CLAIMED", label: "Claimed" },
  { key: "PICKUP_CONFIRMED", label: "Pickup confirmed" },
  { key: "DELIVERED", label: "Delivered" },
  { key: "EXPIRED", label: "Expired" },
  { key: "CANCELLED", label: "Cancelled" },
];

function MyDonationsInner() {
  const donations = useQuery(api.donations.listMine);
  const cancelDonation = useMutation(api.mutations.cancelDonation);
  const nowMs = useNow();
  const [filter, setFilter] = useState<"ALL" | DonationStatus>("ALL");

  const [matchDonationId, setMatchDonationId] = useState<string | null>(null);
  const matches = useQuery(
    api.matching.recommendNgos,
    matchDonationId ? { donationId: matchDonationId as any } : "skip",
  );

  if (donations === undefined) {
    return (
      <AppShell title="My donations">
        <LoadingState />
      </AppShell>
    );
  }

  const filtered =
    filter === "ALL" ? donations : donations.filter((d) => d.status === filter);

  async function handleCancel(id: string) {
    if (!confirm("Cancel this donation? NGOs with a pending claim will be notified.")) return;
    try {
      await cancelDonation({ donationId: id as any });
      toast.success("Donation cancelled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Cancel failed.");
    }
  }

  return (
    <AppShell
      title="My donations"
      subtitle="Full history and status of your listings"
      actions={
        <Button asChild size="sm" className="hidden sm:inline-flex">
          <Link to="/restaurant/donate">
            <PlusCircle className="mr-1 size-4" /> New donation
          </Link>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Filter chips */}
        <div className="no-scrollbar -mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              onClick={() => setFilter(f.key)}
              className={cn(
                "shrink-0 rounded-full border px-3 py-1.5 text-xs font-medium backdrop-blur transition-colors",
                filter === f.key
                  ? "border-primary bg-primary text-primary-foreground shadow-sm"
                  : "border-white/70 bg-white/55 text-muted-foreground hover:bg-white/75",
              )}
            >
              {f.label}
            </button>
          ))}
        </div>

        {filtered.length === 0 ? (
          <EmptyState
            icon={<PlusCircle className="size-5" />}
            title={donations.length === 0 ? "No donations yet" : "Nothing here"}
            description={
              donations.length === 0
                ? "Post your first surplus donation — it takes under a minute."
                : "Try a different filter to see other donations."
            }
            action={
              <Button asChild size="sm">
                <Link to="/restaurant/donate">Create donation</Link>
              </Button>
            }
          />
        ) : (
          <div className="grid gap-3 sm:grid-cols-2">
            {filtered.map((d) => (
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
                    {!["DELIVERED", "EXPIRED", "CANCELLED"].includes(d.status) && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="text-rose-700 hover:bg-rose-50"
                        onClick={() => handleCancel(d._id)}
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
      </div>

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

export default function MyDonations() {
  return (
    <RequireRole roles={["restaurant"]}>
      <MyDonationsInner />
    </RequireRole>
  );
}
