import { Button } from "@/components/ui/button";
import { Loader2, Inbox, AlertTriangle } from "lucide-react";
import type { ReactNode } from "react";

export function LoadingState({ label = "Loading…" }: { label?: string }) {
  return (
    <div className="glass flex flex-col items-center justify-center gap-3 rounded-2xl px-6 py-14 text-center">
      <Loader2 className="size-6 animate-spin text-primary" />
      <p className="text-sm text-muted-foreground">{label}</p>
    </div>
  );
}

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="glass flex flex-col items-center justify-center gap-2 rounded-2xl px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-white/60 text-primary">
        {icon ?? <Inbox className="size-5" />}
      </div>
      <p className="mt-1 font-semibold">{title}</p>
      {description && (
        <p className="max-w-sm text-sm text-muted-foreground">{description}</p>
      )}
      {action && <div className="mt-3">{action}</div>}
    </div>
  );
}

export function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="glass flex flex-col items-center justify-center gap-2 rounded-2xl border-rose-200/70 px-6 py-12 text-center">
      <div className="flex size-12 items-center justify-center rounded-full bg-rose-100/70 text-rose-600">
        <AlertTriangle className="size-5" />
      </div>
      <p className="mt-1 font-semibold">Something went wrong</p>
      <p className="max-w-sm text-sm text-muted-foreground">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-3" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
