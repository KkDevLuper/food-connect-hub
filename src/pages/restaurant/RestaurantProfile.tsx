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
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

function RestaurantProfileInner() {
  const { org } = useProfile();
  const updateProfile = useMutation(api.profiles.updateProfile);

  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (org) {
      setName(org.name ?? "");
      setContactName(org.contactName ?? "");
      setPhone(org.phone ?? "");
      setAddress(org.address ?? "");
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
    <AppShell title="Restaurant profile" subtitle="Your public details for NGOs">
      <Card className="glass-strong max-w-2xl">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="name">Restaurant name</Label>
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
              <p className="text-[11px] text-muted-foreground">
                Used as the default pickup address for new donations. Smart
                matching still works without map coordinates.
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

export default function RestaurantProfile() {
  return (
    <RequireRole roles={["restaurant"]}>
      <RestaurantProfileInner />
    </RequireRole>
  );
}
