import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

export type StatItem = {
  label: string;
  value: string | number;
  icon: LucideIcon;
  hint?: string;
  estimate?: boolean;
  accent?: "primary" | "amber" | "sky" | "teal" | "rose";
};

const ACCENTS: Record<NonNullable<StatItem["accent"]>, string> = {
  primary: "bg-primary/10 text-primary",
  amber: "bg-amber-100/80 text-amber-700",
  sky: "bg-sky-100/80 text-sky-700",
  teal: "bg-teal-100/80 text-teal-700",
  rose: "bg-rose-100/80 text-rose-700",
};

export function DashboardStats({ stats }: { stats: StatItem[] }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
      {stats.map((s) => (
        <div key={s.label} className="glass rounded-2xl p-4">
          <div
            className={cn(
              "mb-2 flex size-9 items-center justify-center rounded-xl",
              ACCENTS[s.accent ?? "primary"],
            )}
          >
            <s.icon className="size-4" />
          </div>
          <p className="text-2xl font-bold tracking-tight">{s.value}</p>
          <p className="mt-0.5 text-xs font-medium text-muted-foreground">
            {s.label}
          </p>
          {s.hint && (
            <p className="mt-1 text-[11px] leading-4 text-muted-foreground/80">
              {s.hint}
            </p>
          )}
          {s.estimate && (
            <p className="mt-1 inline-block rounded-full bg-white/50 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
              estimate
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
