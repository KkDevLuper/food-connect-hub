import { Link } from "react-router";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Leaf,
  ArrowRight,
  Utensils,
  HandHeart,
  ShieldCheck,
  Timer,
  MapPin,
  Sparkles,
  BarChart3,
  Globe2,
} from "lucide-react";

function PublicStats() {
  const stats = useQuery(api.public.stats);
  if (!stats) return null;
  return (
    <div className="glass mx-auto grid w-full max-w-3xl grid-cols-3 gap-2 rounded-2xl p-4 text-center sm:gap-4">
      <div>
        <p className="text-2xl font-extrabold text-primary">{stats.mealsRescued}</p>
        <p className="text-[11px] text-muted-foreground">meals rescued</p>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-primary">{stats.completedDonations}</p>
        <p className="text-[11px] text-muted-foreground">donations completed</p>
      </div>
      <div>
        <p className="text-2xl font-extrabold text-primary">{stats.activeDonations}</p>
        <p className="text-[11px] text-muted-foreground">donations active now</p>
      </div>
    </div>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen">
      {/* Nav */}
      <header className="mx-auto flex w-full max-w-6xl items-center justify-between px-4 py-5">
        <div className="flex items-center gap-2">
          <span className="flex size-9 items-center justify-center rounded-2xl bg-primary text-primary-foreground shadow-sm">
            <Leaf className="size-4" />
          </span>
          <span className="text-xl font-extrabold tracking-tight">
            FOOD<span className="text-primary">LINK</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" className="hidden sm:inline-flex">
            <Link to="/login">Sign in</Link>
          </Button>
          <Button asChild className="shadow-sm">
            <Link to="/register">
              Get started <ArrowRight className="ml-1 size-4" />
            </Link>
          </Button>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto w-full max-w-6xl px-4 pt-10 sm:pt-16">
        <div className="glass-strong mx-auto max-w-3xl rounded-[2rem] p-8 text-center sm:p-12">
          <Badge
            variant="outline"
            className="rounded-full border-primary/30 bg-white/60 text-primary"
          >
            <Sparkles className="mr-1 size-3" /> Food waste reduction & redistribution
          </Badge>
          <h1 className="text-balance mt-4 text-4xl font-extrabold leading-tight tracking-tight sm:text-5xl">
            Turning surplus food into{" "}
            <span className="text-primary">shared meals</span>
          </h1>
          <p className="mx-auto mt-4 max-w-xl text-pretty text-base leading-7 text-muted-foreground sm:text-lg">
            FOODLINK connects restaurants with verified NGOs and shelters so
            safe, surplus food gets claimed and collected before the pickup
            deadline — instead of going to waste.
          </p>
          <div className="mt-7 flex flex-col items-center justify-center gap-3 sm:flex-row">
            <Button asChild size="lg" className="w-full shadow-sm sm:w-auto">
              <Link to="/register?role=restaurant">
                <Utensils className="mr-2 size-4" /> I'm a restaurant
              </Link>
            </Button>
            <Button
              asChild
              size="lg"
              variant="outline"
              className="w-full border-white/70 bg-white/60 sm:w-auto"
            >
              <Link to="/register?role=ngo">
                <HandHeart className="mr-2 size-4" /> I'm an NGO
              </Link>
            </Button>
          </div>
          <p className="mt-4 text-xs text-muted-foreground">
            Free during beta · works great on your phone
          </p>
        </div>

        <PublicStats />
      </section>

      {/* How it works */}
      <section className="mx-auto w-full max-w-6xl px-4 py-16">
        <h2 className="text-center text-2xl font-bold tracking-tight sm:text-3xl">
          From surplus to served in four steps
        </h2>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { icon: Utensils, t: "List it", d: "Restaurant posts surplus food with a pickup deadline." },
            { icon: HandHeart, t: "Claim it", d: "NGOs see it instantly and claim with one tap." },
            { icon: ShieldCheck, t: "Confirm", d: "Restaurant confirms the claim — pickup is on." },
            { icon: Timer, t: "Collect", d: "NGO picks up and marks delivery. Impact updates live." },
          ].map((s, i) => (
            <div key={s.t} className="glass rounded-2xl p-5">
              <div className="flex items-center justify-between">
                <span className="flex size-10 items-center justify-center rounded-xl bg-primary/10 text-primary">
                  <s.icon className="size-5" />
                </span>
                <span className="text-3xl font-extrabold text-primary/15">
                  {String(i + 1).padStart(2, "0")}
                </span>
              </div>
              <p className="mt-3 font-semibold">{s.t}</p>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Role features */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="glass rounded-3xl p-6 lg:col-span-2">
            <Badge variant="outline" className="rounded-full bg-white/60">
              For restaurants
            </Badge>
            <h3 className="mt-3 text-xl font-bold">Less waste, zero hassle</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {[
                "Post donations in under a minute — food, quantity, deadline, address.",
                "Countdown timers keep every pickup on schedule.",
                "Confirm or reject claims; keep a full donation history.",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <ShieldCheck className="mt-0.5 size-4 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
          <div className="glass rounded-3xl p-6">
            <Badge variant="outline" className="rounded-full bg-white/60">
              For NGOs
            </Badge>
            <h3 className="mt-3 text-xl font-bold">Find food fast</h3>
            <ul className="mt-4 space-y-2.5 text-sm text-muted-foreground">
              {[
                "Live list of available surplus food nearby.",
                "Smart matching surfaces the best fits first.",
                "One-tap claim, pickup and delivery tracking.",
              ].map((f) => (
                <li key={f} className="flex gap-2">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
                  {f}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Impact / admin */}
      <section className="mx-auto w-full max-w-6xl px-4 pb-16">
        <div className="glass-strong rounded-3xl p-8 text-center sm:p-10">
          <BarChart3 className="mx-auto size-8 text-primary" />
          <h3 className="mt-3 text-2xl font-bold tracking-tight">
            Impact you can measure
          </h3>
          <p className="mx-auto mt-2 max-w-xl text-sm leading-6 text-muted-foreground">
            Meals rescued, donations completed, food waste diverted and CO₂
            saved — with clearly labelled estimates. Admins get a live
            platform-wide impact dashboard.
          </p>
        </div>
      </section>

      {/* Footer CTA */}
      <footer className="mx-auto w-full max-w-6xl px-4 pb-14">
        <div className="glass flex flex-col items-center gap-4 rounded-3xl p-8 text-center">
          <h3 className="text-xl font-bold">Ready to rescue tonight's surplus?</h3>
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button asChild>
              <Link to="/register">Create free account</Link>
            </Button>
            <Button asChild variant="outline" className="border-white/70 bg-white/60">
              <Link to="/login">Sign in</Link>
            </Button>
          </div>
          <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Globe2 className="size-3.5" /> Built for hackathons · mobile-first ·
            n8n-ready webhooks
          </p>
        </div>
      </footer>
    </div>
  );
}
