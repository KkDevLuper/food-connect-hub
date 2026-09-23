import { useEffect, useState } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import { AppShell } from "@/components/foodlink/AppShell";
import { RequireRole } from "@/components/foodlink/DashboardGuard";
import { LoadingState } from "@/components/foodlink/States";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useProfile } from "@/hooks/use-profile";
import { Loader2, Users } from "lucide-react";
import { toast } from "sonner";

function NgoProfileInner() {
  const { org } = useProfile();
  const updateProfile = useMutation(api.profiles.updateProfile);

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [capacity, setCapacity] = useState("100");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (org) {
      setName(org.name ?? "");
      setContactName(org.contactName ?? "");
      setPhone(org.phone ?? "");
      setAddress(org.address ?? "");
      setCapacity(String(org.capacityMeals ?? 100));
    }
  }, [org]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    try {
      await updateProfile({
        org: {
          name: name.trim(),
          contactName: contactName.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim(),
        },
        capacityMeals: Math.max(1, parseInt(capacity, 10) || 100),
      });
      toast.success("Profile updated.");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Update failed.");
    } finally {
      setSaving(false);
    }
  }

  if (!org) return <LoadingState />;

  return (
    <AppShell title="NGO profile" subtitle="How restaurants see your organisation">
      <Card className="glass-strong max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">NGO name</Label>
              <Input
                id="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="border-white/70 bg-white/70"
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="contact">Contact person</Label>
                <Input
                  id="contact"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  className="border-white/70 bg-white/70"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="phone">Phone</Label>
                <Input
                  id="phone"
                  type="tel"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="border-white/70 bg-white/70"
                />
              </div>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                required
                rows={2}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="border-white/70 bg-white/70"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="capacity" className="flex items-center gap-1">
                <Users className="size-3.5 text-primary" /> Daily meal capacity
              </Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                value={capacity}
                onChange={(e) => setCapacity(e.target.value)}
                className="border-white/70 bg-white/70"
              />
              <p className="text-[11px] text-muted-foreground">
                Smart matching uses this to rank donations you can realistically
                handle.
              </p>
            </div>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save changes
            </Button>
          </form>
        </CardContent>
      </Card>
    </AppShell>
  );
}

export default function NgoProfile() {
  return (
    <RequireRole roles={["ngo"]}>
      <NgoProfileInner />
    </RequireRole>
  );
}
