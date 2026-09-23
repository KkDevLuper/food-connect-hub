import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/foodlink/AppShell";
import { RequireRole } from "@/components/foodlink/DashboardGuard";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FOOD_CATEGORIES,
  UNITS,
  defaultDeadlineLocalValue,
  formatDateTime,
} from "@/lib/foodlink";
import { Loader2, PackageCheck, Timer } from "lucide-react";
import { toast } from "sonner";

function CreateDonationInner() {
  const navigate = useNavigate();
  const createDonation = useMutation(api.mutations.createDonation);

  const [foodName, setFoodName] = useState("");
  const [category, setCategory] = useState<string>(FOOD_CATEGORIES[0]);
  const [quantity, setQuantity] = useState("");
  const [unit, setUnit] = useState<string>(UNITS[1]);
  const [preparedAt, setPreparedAt] = useState(() =>
    new Date(Date.now() - 60 * 60 * 1000).toISOString().slice(0, 16),
  );
  const [deadline, setDeadline] = useState(defaultDeadlineLocalValue);
  const [pickupAddress, setPickupAddress] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  const estimatedMeals = useMemo(() => {
    const q = parseFloat(quantity);
    if (!q || q <= 0) return null;
    if (unit === "meals") return Math.round(q);
    if (unit === "kg") return Math.max(1, Math.round(q / 0.5));
    return Math.round(q);
  }, [quantity, unit]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const qty = parseFloat(quantity);
    const preparedMs = new Date(preparedAt).getTime();
    const deadlineMs = new Date(deadline).getTime();

    if (!foodName.trim()) return toast.error("Food name is required.");
    if (!qty || qty <= 0) return toast.error("Quantity must be greater than zero.");
    if (Number.isNaN(preparedMs) || Number.isNaN(deadlineMs)) {
      return toast.error("Please set preparation time and pickup deadline.");
    }
    if (deadlineMs <= Date.now()) {
      return toast.error("Pickup deadline must be in the future.");
    }
    if (deadlineMs <= preparedMs) {
      return toast.error("Pickup deadline must be after preparation time.");
    }
    if (!pickupAddress.trim()) return toast.error("Pickup address is required.");

    setSaving(true);
    try {
      await createDonation({
        foodName: foodName.trim(),
        category,
        quantity: qty,
        unit,
        estimatedMeals: estimatedMeals ?? undefined,
        preparedAt: preparedMs,
        pickupDeadline: deadlineMs,
        pickupAddress: pickupAddress.trim(),
        notes: notes.trim() || undefined,
      });
      toast.success("Donation posted! Nearby NGOs can now see it.");
      navigate("/restaurant/donations");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not create donation.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <AppShell title="Create donation" subtitle="Post surplus food for NGOs to claim">
      <Card className="glass-strong max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="foodName">Food name</Label>
              <Input
                id="foodName"
                required
                value={foodName}
                onChange={(e) => setFoodName(e.target.value)}
                placeholder="Veg Meal Boxes"
                className="border-white/70 bg-white/70"
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Food category</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger className="w-full border-white/70 bg-white/70">
                    <SelectValue placeholder="Category" />
                  </SelectTrigger>
                  <SelectContent className="glass-strong border-white/60">
                    {FOOD_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>
                        {c}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1.5">
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    required
                    type="number"
                    min="1"
                    step="any"
                    inputMode="decimal"
                    value={quantity}
                    onChange={(e) => setQuantity(e.target.value)}
                    placeholder="100"
                    className="border-white/70 bg-white/70"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>Unit</Label>
                  <Select value={unit} onValueChange={setUnit}>
                    <SelectTrigger className="w-full border-white/70 bg-white/70">
                      <SelectValue placeholder="Unit" />
                    </SelectTrigger>
                    <SelectContent className="glass-strong border-white/60">
                      {UNITS.map((u) => (
                        <SelectItem key={u} value={u}>
                          {u}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            {estimatedMeals !== null && (
              <p className="flex items-center gap-1.5 rounded-xl bg-primary/10 px-3 py-2 text-sm text-primary">
                <PackageCheck className="size-4" />
                Estimated meals: ~{estimatedMeals}
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="preparedAt">Prepared at</Label>
                <Input
                  id="preparedAt"
                  type="datetime-local"
                  required
                  value={preparedAt}
                  onChange={(e) => setPreparedAt(e.target.value)}
                  className="border-white/70 bg-white/70"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="deadline" className="flex items-center gap-1">
                  <Timer className="size-3.5 text-primary" /> Pickup deadline
                </Label>
                <Input
                  id="deadline"
                  type="datetime-local"
                  required
                  value={deadline}
                  onChange={(e) => setDeadline(e.target.value)}
                  className="border-white/70 bg-white/70"
                />
              </div>
            </div>
            {deadline && !Number.isNaN(new Date(deadline).getTime()) && (
              <p className="text-xs text-muted-foreground">
                NGOs must collect before {formatDateTime(new Date(deadline).getTime())}.
              </p>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="address">Pickup address</Label>
              <Textarea
                id="address"
                required
                rows={2}
                value={pickupAddress}
                onChange={(e) => setPickupAddress(e.target.value)}
                placeholder="12 MG Road, Indiranagar, Bengaluru"
                className="border-white/70 bg-white/70"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="notes">Notes (optional)</Label>
              <Textarea
                id="notes"
                rows={2}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Freshly packed, vegetarian, keep warm."
                className="border-white/70 bg-white/70"
              />
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button type="submit" disabled={saving} className="flex-1">
                {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
                Post donation
              </Button>
              <Button
                type="button"
                variant="outline"
                className="border-white/70 bg-white/60"
                onClick={() => navigate("/restaurant/dashboard")}
              >
                Cancel
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}

export default function CreateDonation() {
  return (
    <RequireRole roles={["restaurant"]}>
      <CreateDonationInner />
    </RequireRole>
  );
}
