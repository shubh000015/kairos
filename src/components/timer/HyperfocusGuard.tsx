"use client";

import { Leaf, X } from "lucide-react";
import { useState } from "react";
import { minutesToMs } from "@/lib/time";
import { useSettingsStore } from "@/store/useSettingsStore";

interface Props {
  blockId: string | null;
  elapsedMs: number;
}

/**
 * Hyperfocus can skip meals and water for hours. Once a block has run past the
 * threshold, a quiet one-line nudge appears. It never interrupts, pauses, or alarms.
 */
export function HyperfocusGuard({ blockId, elapsedMs }: Props) {
  const thresholdMin = useSettingsStore((s) => s.hyperfocusGuardMin);
  const [dismissedFor, setDismissedFor] = useState<string | null>(null);

  if (!blockId || thresholdMin <= 0) return null;
  if (elapsedMs < minutesToMs(thresholdMin)) return null;
  if (dismissedFor === blockId) return null;

  return (
    <div className="rise-in flex items-center gap-3 rounded-xl border border-border bg-accent-soft px-4 py-3 text-sm text-ink" role="status">
      <Leaf className="size-4 shrink-0 text-accent" aria-hidden="true" />
      <span className="flex-1">
        You&apos;ve been at it for over {thresholdMin} minutes. Water, a stretch, maybe a snack — then back in if you like.
      </span>
      <button
        type="button"
        onClick={() => setDismissedFor(blockId)}
        aria-label="Dismiss"
        className="rounded-md p-1 text-ink-muted hover:bg-surface-raised hover:text-ink"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
