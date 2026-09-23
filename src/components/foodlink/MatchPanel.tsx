import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import {
  Sparkles,
  MapPin,
  Users,
  Timer,
  MapPinned,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

export type MatchRow = {
  ngoId: string;
  ngoName: string;
  address: string;
  distanceKm: number | null;
  capacityMeals: number;
  score: number;
  breakdown: {
    proximityScore: number;
    urgencyScore: number;
    capacityScore: number;
  };
  reasons: string[];
};

const WEIGHT_LABELS: { key: keyof MatchRow["breakdown"]; label: string; icon: LucideIcon; weight: string }[] = [
  { key: "proximityScore", label: "Proximity", icon: MapPin, weight: "40%" },
  { key: "urgencyScore", label: "Urgency", icon: Timer, weight: "30%" },
  { key: "capacityScore", label: "Capacity", icon: Users, weight: "30%" },
];

/** Transparent matching explainer shown on donation rows / details. */
export function MatchPanel({ matches }: { matches: MatchRow[] }) {
  if (!matches.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No NGOs registered yet — matching needs at least one NGO.
      </p>
    );
  }
  const [best, ...rest] = matches;

  return (
    <div className="space-y-3">
      <div className="glass-strong rounded-2xl p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-primary">
              <Sparkles className="size-3.5" /> Recommended NGO
            </p>
            <p className="mt-1 text-lg font-bold">{best.ngoName}</p>
            <p className="text-xs text-muted-foreground">{best.address}</p>
          </div>
          <div className="shrink-0 text-center">
            <p className="text-2xl font-extrabold text-primary">{best.score}</p>
            <p className="text-[10px] uppercase tracking-wide text-muted-foreground">
              match score
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-3 gap-2">
          {WEIGHT_LABELS.map((w) => (
            <div key={w.key} className="rounded-xl bg-white/50 p-2">
              <div className="mb-1 flex items-center justify-between text-[10px] font-medium text-muted-foreground">
                <span className="flex items-center gap-1">
                  <w.icon className="size-3" /> {w.label}
                </span>
                <span>{w.weight}</span>
              </div>
              <Progress
                value={best.breakdown[w.key] * 100}
                className="h-1.5 bg-black/5"
              />
            </div>
          ))}
        </div>

        <ul className="mt-3 space-y-1">
          {best.reasons.map((r) => (
            <li key={r} className="flex items-start gap-1.5 text-xs text-muted-foreground">
              <MapPinned className="mt-0.5 size-3 shrink-0 text-primary/70" />
              {r}
            </li>
          ))}
        </ul>
      </div>

      {rest.length > 0 && (
        <div className="glass rounded-2xl p-3">
          <p className="mb-2 text-xs font-semibold text-muted-foreground">
            Other NGOs by score
          </p>
          <div className="space-y-2">
            {rest.slice(0, 4).map((m) => (
              <div
                key={m.ngoId}
                className="flex items-center justify-between gap-2 rounded-xl bg-white/40 px-3 py-2"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-medium">{m.ngoName}</p>
                  <p className="truncate text-[11px] text-muted-foreground">
                    {m.distanceKm !== null ? `${m.distanceKm} km` : "distance unknown"}
                    {" · "}
                    {m.capacityMeals} meals/day
                  </p>
                </div>
                <Badge
                  variant="outline"
                  className="rounded-full border-white/70 bg-white/60 text-xs"
                >
                  {m.score}
                </Badge>
              </div>
            ))}
          </div>
        </div>
      )}

      <p className="px-1 text-[11px] leading-4 text-muted-foreground/80">
        Matching is a transparent heuristic (distance, time remaining, capacity).
        It is a recommendation only — it does not assess food safety; always
        inspect food before collection.
      </p>
    </div>
  );
}
