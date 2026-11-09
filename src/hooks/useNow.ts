"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * Current time (ms, rounded to the second), re-read every `intervalMs`.
 * Returns null during SSR and hydration so prerendering never bakes in a timestamp;
 * callers render a neutral state until it resolves.
 */
export function useNow(intervalMs = 30_000): number | null {
  const subscribe = useCallback(
    (onChange: () => void) => {
      if (intervalMs <= 0) return () => {};
      const id = window.setInterval(onChange, intervalMs);
      return () => window.clearInterval(id);
    },
    [intervalMs],
  );
  return useSyncExternalStore(
    subscribe,
    () => Math.floor(Date.now() / 1000) * 1000,
    () => null,
  );
}
