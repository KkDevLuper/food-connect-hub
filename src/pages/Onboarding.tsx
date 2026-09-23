import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
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
  Utensils,
  HandHeart,
  Loader2,
  ShieldCheck,
  Sparkles,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { useProfile } from "@/hooks/use-profile";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

type RoleChoice = "restaurant" | "ngo" | "admin";

export default function Onboarding() {
  const { isLoading, isAuthenticated, user } = useAuth();
  const { profile, isOnboarded } = useProfile();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const isDemoEntry = searchParams.get("demo") === "1";

  // Already set up? Send users straight to their dashboard instead of the form.
  useEffect(() => {
    if (isOnboarded && profile?.role) {
      navigate(
        profile.role === "restaurant"
          ? "/restaurant/dashboard"
          : profile.role === "ngo"
            ? "/ngo/dashboard"
            : "/admin/dashboard",
        { replace: true },
      );
    }
  }, [isOnboarded, profile?.role, navigate]);

  const completeRegistration = useMutation(api.roles.completeRegistration);
  const seedDemoData = useMutation(api.seed.seedDemoData);

  const [role, setRole] = useState<RoleChoice | null>(null);
  const [name, setName] = useState("");
  const [contactName, setContactName] = useState("");
  const [phone, setPhone] = useState("");
  const [address, setAddress] = useState("");
  const [capacity, setCapacity] = useState("100");
  const [saving, setSaving] = useState(false);
  const [seeding, setSeeding] = useState(false);
  const [seedMessage, setSeedMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      navigate("/auth?returnTo=/onboarding", { replace: true });
    }
  }, [isLoading, isAuthenticated, navigate]);

  // Preselect demo role from ?role= (deep link from landing) or default null.
  useEffect(() => {
    const r = searchParams.get("role");
    if (r === "restaurant" || r === "ngo" || r === "admin") setRole(r);
  }, [searchParams]);

  useEffect(() => {
    if (user?.name && !name) setName(user.name);
  }, [user?.name, name]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!role) return;
    setSaving(true);
    try {
      if (role === "admin") {
        await completeRegistration({
          role,
          org: {
            name: name.trim() || "FOODLINK Admin",
            address: address.trim() || "—",
          },
        });
        toast.success("Admin account ready!");
        navigate("/admin/dashboard", { replace: true });
        return;
      }
      await completeRegistration({
        role,
        org: {
          name: name.trim(),
          contactName: contactName.trim() || undefined,
          phone: phone.trim() || undefined,
          address: address.trim(),
          // Coordinates are optional; matching still works with distances unknown.
          lat: undefined,
          lng: undefined,
        },
        capacityMeals: role === "ngo" ? Math.max(1, parseInt(capacity || "50", 10) || 50) : undefined,
      });
      toast.success("Profile saved — welcome to FOODLINK!");
      navigate(
        role === "restaurant" ? "/restaurant/dashboard" : "/ngo/dashboard",
        { replace: true },
      );
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Could not save profile.");
    } finally {
      setSaving(false);
    }
  }

  async function handleSeed() {
    setSeeding(true);
    try {
      const res = await seedDemoData({});
      setSeedMessage(res.message);
      toast.success(res.message);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Seeding failed.");
    } finally {
      setSeeding(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="size-6 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="mx-auto flex min-h-screen w-full max-w-2xl flex-col justify-center px-4 py-10">
      <h1 className="text-2xl font-extrabold tracking-tight">
        Set up your FOODLINK account
      </h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Tell us who you are so we can tailor your dashboard.
      </p>

      <Card className="glass-strong mt-6">
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {/* Role cards */}
            <div className="grid gap-3 sm:grid-cols-2">
              <RoleCard
                selected={role === "restaurant"}
                onClick={() => setRole("restaurant")}
                icon={<Utensils className="size-5" />}
                title="Restaurant"
                desc="List surplus food for pickup"
              />
              <RoleCard
                selected={role === "ngo"}
                onClick={() => setRole("ngo")}
                icon={<HandHeart className="size-5" />}
                title="NGO / Shelter"
                desc="Claim and collect surplus food"
              />
              <RoleCard
                selected={role === "admin"}
                onClick={() => setRole("admin")}
                icon={<ShieldCheck className="size-5" />}
                title="Admin"
                desc="Impact dashboard & moderation"
                className="sm:col-span-2"
              />
            </div>

            {role === "admin" && (
              <p className="rounded-xl bg-amber-100/60 px-3 py-2 text-xs leading-5 text-amber-800">
                Admin is granted only while the platform has no admin yet — if
                one exists, run the demo seed instead (it provisions
                admin@foodlink.app in the admin dashboard's user list).
              </p>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="org-name">
                  {role === "ngo" ? "NGO name" : "Restaurant name"}
                </Label>
                <Input
                  id="org-name"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder={role === "ngo" ? "Hope Foundation" : "Green Leaf Restaurant"}
                  className="border-white/70 bg-white/70"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="contact">Contact person</Label>
                <Input
                  id="contact"
                  value={contactName}
                  onChange={(e) => setContactName(e.target.value)}
                  placeholder="Asha Verma"
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
                  placeholder="+91 98100 00000"
                  className="border-white/70 bg-white/70"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <Label htmlFor="address">Pickup address</Label>
                <Textarea
                  id="address"
                  required
                  rows={2}
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  placeholder="12 MG Road, Indiranagar, Bengaluru"
                  className="border-white/70 bg-white/70"
                />
              </div>
              {role === "ngo" && (
                <div className="space-y-1.5">
                  <Label htmlFor="capacity">Daily meal capacity</Label>
                  <Input
                    id="capacity"
                    type="number"
                    min={1}
                    value={capacity}
                    onChange={(e) => setCapacity(e.target.value)}
                    className="border-white/70 bg-white/70"
                  />
                  <p className="text-[11px] text-muted-foreground">
                    Used by smart matching to rank donations for you.
                  </p>
                </div>
              )}
            </div>

            <Button type="submit" className="w-full" disabled={saving || !role}>
              {saving && <Loader2 className="mr-2 size-4 animate-spin" />}
              Save & continue
            </Button>
          </form>

          {/* Demo seeding */}
          <div className="mt-6 rounded-2xl border border-dashed border-primary/30 bg-white/40 p-4">
            <p className="flex items-center gap-1.5 text-sm font-semibold">
              <Sparkles className="size-4 text-primary" /> Running a demo?
            </p>
            <p className="mt-1 text-xs leading-5 text-muted-foreground">
              One click creates “Green Leaf Restaurant”, “Hope Foundation” and a
              full set of sample donations so you can walk through the entire
              flow. Any account can run it.
            </p>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="mt-3 border-primary/40 bg-white/60"
              onClick={handleSeed}
              disabled={seeding}
            >
              {seeding && <Loader2 className="mr-2 size-3.5 animate-spin" />}
              Load demo data
            </Button>
            {seedMessage && (
              <p className="mt-2 text-xs font-medium text-primary">{seedMessage}</p>
            )}
          </div>

          {isDemoEntry && (
            <p className="mt-4 text-center text-xs text-muted-foreground">
              Demo mode: pick a role below and load demo data to explore both
              sides of the flow.
            </p>
          )}
        </CardContent>
      </Card>

      <p className="mt-6 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
        <ShieldCheck className="size-3.5" /> You can only edit your own profile
        and listings.
      </p>
    </div>
  );
}

function RoleCard({
  selected,
  onClick,
  icon,
  title,
  desc,
  className = "",
}: {
  selected: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  title: string;
  desc: string;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex flex-col items-start gap-1 rounded-2xl border p-4 text-left transition-all",
        selected
          ? "border-primary bg-primary/10 shadow-sm ring-1 ring-primary/30"
          : "border-white/70 bg-white/50 hover:bg-white/70",
        className,
      )}
      aria-pressed={selected}
    >
      <span
        className={cn(
          "flex size-10 items-center justify-center rounded-xl",
          selected ? "bg-primary text-primary-foreground" : "bg-primary/10 text-primary",
        )}
      >
        {icon}
      </span>
      <span className="mt-1 font-semibold">{title}</span>
      <span className="text-xs text-muted-foreground">{desc}</span>
    </button>
  );
}
