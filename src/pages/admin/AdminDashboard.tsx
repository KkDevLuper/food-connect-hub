import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/foodlink/AppShell";
import { DashboardStats } from "@/components/foodlink/DashboardStats";
import { LoadingState, EmptyState } from "@/components/foodlink/States";
import { RequireRole } from "@/components/foodlink/DashboardGuard";
import { StatusBadge } from "@/components/foodlink/StatusBadge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Building2,
  HandHeart,
  Flame,
  Utensils,
  Check,
  Timer,
  Leaf,
  Users,
  ShieldCheck,
  Info,
} from "lucide-react";
import { formatDateTime, formatTimeLeft } from "@/lib/foodlink";
import { useNow } from "@/hooks/use-now";
import { toast } from "sonner";

function AdminDashboardInner() {
  const stats = useQuery(api.admin.impactStats);
  const donations = useQuery(api.admin.listDonations);
  const users = useQuery(api.admin.listUsers);
  const cancelDonation = useMutation(api.admin.cancelDonation);
  const resetDemo = useMutation(api.seed.resetDemoData);
  const nowMs = useNow();
  const [busy, setBusy] = useState<string | null>(null);

  if (stats === undefined || donations === undefined || users === undefined) {
    return (
      <AppShell title="Admin dashboard" subtitle="Platform impact and moderation">
        <LoadingState />
      </AppShell>
    );
  }

  async function handleCancel(id: string) {
    if (!confirm("Cancel this donation for everyone?")) return;
    setBusy(id);
    try {
      await cancelDonation({ donationId: id as any });
      toast.success("Donation cancelled.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(null);
    }
  }

  async function handleReset() {
    if (!confirm("Delete all demo donations, claims and records?")) return;
    setBusy("reset");
    try {
      await resetDemo({});
      toast.success("Demo data cleared. Reload demo data from /onboarding.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <AppShell title="Admin dashboard" subtitle="Platform-wide impact and moderation">
      <div className="space-y-6">
        <DashboardStats
          stats={[
            { label: "Restaurants", value: stats.totalRestaurants, icon: Building2 },
            { label: "NGOs", value: stats.totalNgos, icon: HandHeart },
            { label: "Active donations", value: stats.activeDonations, icon: Timer, accent: "amber" },
            { label: "Completed", value: stats.completedDonations, icon: Check, accent: "teal" },
            { label: "Expired", value: stats.expiredDonations, icon: Flame, accent: "rose" },
          ]}
        />

        {/* Impact estimates */}
        <Card className="glass rounded-2xl border-white/60">
          <CardContent className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-primary">
              <Leaf className="size-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-baseline gap-x-6 gap-y-1">
                <div>
                  <p className="text-2xl font-extrabold text-primary">
                    {stats.mealsRescued.toLocaleString()}
                  </p>
                  <p className="text-xs text-muted-foreground">meals rescued</p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-primary">
                    ~{stats.foodWasteReducedKg.toLocaleString()} kg
                  </p>
                  <p className="text-xs text-muted-foreground">
                    food waste diverted (estimate)
                  </p>
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-primary">
                    ~{stats.co2SavedKg.toLocaleString()} kg
                  </p>
                  <p className="text-xs text-muted-foreground">
                    CO₂e avoided (estimate)
                  </p>
                </div>
              </div>
              <p className="mt-2 flex items-start gap-1.5 text-[11px] leading-4 text-muted-foreground">
                <Info className="mt-0.5 size-3 shrink-0" />
                {stats.estimatesNote}
              </p>
            </div>
          </CardContent>
        </Card>

        <Tabs defaultValue="donations">
          <TabsList className="glass w-full justify-start overflow-x-auto">
            <TabsTrigger value="donations">Donations</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
            <TabsTrigger value="tools">Tools</TabsTrigger>
          </TabsList>

          {/* Donations table */}
          <TabsContent value="donations" className="mt-3">
            {donations.length === 0 ? (
              <EmptyState title="No donations yet" />
            ) : (
              <div className="glass overflow-hidden rounded-2xl">
                <div className="divide-y divide-black/5">
                  {donations.map((d) => (
                    <div
                      key={d._id}
                      className="flex flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-semibold">{d.foodName}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {d.restaurantName}
                          {d.ngoName ? ` → ${d.ngoName}` : ""} · {d.quantity} {d.unit} ·
                          deadline {formatTimeLeft(d.pickupDeadline, nowMs)}
                        </p>
                      </div>
                      <StatusBadge status={d.status as any} />
                      {!["DELIVERED", "EXPIRED", "CANCELLED"].includes(d.status) && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-rose-700 hover:bg-rose-50"
                          disabled={busy === d._id}
                          onClick={() => handleCancel(d._id)}
                        >
                          Cancel
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </TabsContent>

          {/* Users table */}
          <TabsContent value="users" className="mt-3">
            <div className="glass overflow-hidden rounded-2xl">
              <div className="divide-y divide-black/5">
                {users.map((u) => (
                  <div key={u._id} className="flex items-center gap-3 px-4 py-3">
                    <div className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-primary">
                      <Users className="size-4" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">
                        {u.orgName ?? u.email}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {u.email} · joined {formatDateTime(u._creationTime)}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-white/60 px-2 py-0.5 text-[11px] font-semibold capitalize text-muted-foreground">
                      {u.role ?? "pending"}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>

          {/* Tools */}
          <TabsContent value="tools" className="mt-3">
            <Card className="glass-strong rounded-2xl border-white/60">
              <CardContent className="space-y-3 p-5">
                <div className="flex items-start gap-3">
                  <ShieldCheck className="mt-0.5 size-5 shrink-0 text-primary" />
                  <div>
                    <p className="text-sm font-semibold">Demo data tools</p>
                    <p className="mt-1 text-xs leading-5 text-muted-foreground">
                      Reload demo data from the onboarding page (available to any
                      signed-in account). Reset clears all donations, claims and
                      pickup records — org profiles stay.
                    </p>
                  </div>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  className="border-rose-200/80 text-rose-700"
                  disabled={busy === "reset"}
                  onClick={handleReset}
                >
                  Reset demo data
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
}

export default function AdminDashboard() {
  return (
    <RequireRole roles={["admin"]}>
      <AdminDashboardInner />
    </RequireRole>
  );
}
