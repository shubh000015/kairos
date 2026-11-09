"use client";

import { useEffect, useRef, type RefObject } from "react";

export type StuckReason = "idle" | "thrash";

interface Options {
  /** Scope of listening; defaults to the whole document. */
  target?: RefObject<HTMLElement | null>;
  /** Changes when the person moves on (new chunk, new page). Resets the idle clock. */
  contextKey: string;
  enabled?: boolean;
  /** No interaction for this long while the tab is visible → "idle". Default 10 min. */
  idleMs?: number;
  /** This many clicks on non-interactive surfaces within `thrashWindowMs` → "thrash". */
  thrashClicks?: number;
  thrashWindowMs?: number;
  onStuck: (reason: StuckReason) => void;
}

const INTERACTIVE = "button, a, input, textarea, select, summary, [role='button'], [role='radio'], [role='tab'], [draggable='true']";

/**
 * Notices two signatures of task paralysis without ever asking the person to
 * self-report: a long stretch of nothing on the same material, or a burst of
 * aimless clicking. Fires at most once per context until the context changes.
 */
export function useStuckDetector({
  target,
  contextKey,
  enabled = true,
  idleMs = 10 * 60_000,
  thrashClicks = 9,
  thrashWindowMs = 4000,
  onStuck,
}: Options) {
  const onStuckRef = useRef(onStuck);
  useEffect(() => {
    onStuckRef.current = onStuck;
  }, [onStuck]);

  useEffect(() => {
    if (!enabled || typeof window === "undefined") return;
    const el: HTMLElement | Document = target?.current ?? document;
    let last = Date.now();
    let fired = false;
    let clicks: number[] = [];

    const touch = () => {
      last = Date.now();
    };
    const onPointer = (e: Event) => {
      touch();
      const t = e.target as HTMLElement | null;
      if (t?.closest(INTERACTIVE)) return;
      const now = Date.now();
      clicks = clicks.filter((c) => now - c < thrashWindowMs);
      clicks.push(now);
      if (!fired && clicks.length >= thrashClicks) {
        fired = true;
        onStuckRef.current("thrash");
      }
    };

    el.addEventListener("pointerdown", onPointer, { passive: true });
    el.addEventListener("keydown", touch, { passive: true });
    el.addEventListener("wheel", touch, { passive: true });
    el.addEventListener("touchmove", touch, { passive: true });
    document.addEventListener("scroll", touch, { passive: true });
    document.addEventListener("visibilitychange", touch);

    const timer = window.setInterval(() => {
      if (fired || document.visibilityState !== "visible") return;
      if (Date.now() - last >= idleMs) {
        fired = true;
        onStuckRef.current("idle");
      }
    }, 15_000);

    return () => {
      window.clearInterval(timer);
      el.removeEventListener("pointerdown", onPointer);
      el.removeEventListener("keydown", touch);
      el.removeEventListener("wheel", touch);
      el.removeEventListener("touchmove", touch);
      document.removeEventListener("scroll", touch);
      document.removeEventListener("visibilitychange", touch);
    };
  }, [enabled, contextKey, idleMs, thrashClicks, thrashWindowMs, target]);
}
