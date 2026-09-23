import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

/**
 * Ticking clock used for countdowns. Calibrated once against the server's
 * clock (so all demo devices agree on "now"), then ticked locally so
 * time-remaining labels never freeze between query refetches.
 */
export function useNow(intervalMs = 15000): number {
  const serverNow = useQuery(api.mutations.now);
  const [offset, setOffset] = useState<number | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  // One-time calibration against the server clock.
  useEffect(() => {
    if (serverNow !== undefined && offset === null) {
      setOffset(serverNow - Date.now());
    }
  }, [serverNow, offset]);

  // Local tick.
  useEffect(() => {
    const id = setInterval(() => setNowMs(Date.now()), intervalMs);
    return () => clearInterval(id);
  }, [intervalMs]);

  return nowMs + (offset ?? 0);
}
