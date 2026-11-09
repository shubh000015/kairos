"use client";

import { Check, ParkingSquare } from "lucide-react";
import { useEffect, useState } from "react";
import { minutesToMs } from "@/lib/time";
import { VisualTimer } from "@/components/timer/VisualTimer";

const DURATION = minutesToMs(5);

/** A living preview of the real timer + parking lot. Loops a 5-minute block at 20× speed. */
export function HeroPreview() {
  const [remaining, setRemaining] = useState(DURATION * 0.72);
  const [parked, setParked] = useState(false);

  useEffect(() => {
    const id = window.setInterval(() => {
      setRemaining((r) => (r <= 1000 ? DURATION : r - 20 * 250));
    }, 250);
    const p = window.setInterval(() => setParked((v) => !v), 3600);
    return () => {
      window.clearInterval(id);
      window.clearInterval(p);
    };
  }, []);

  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden="true">
      <div className="rounded-xl border border-border bg-surface-raised p-6 shadow-soft">
        <div className="mb-4 flex items-center justify-between">
          <span className="eyebrow">Now</span>
          <span className="font-mono text-[11px] tabular-nums text-ink-faint">05:00</span>
        </div>
        <p className="mb-5 font-display text-2xl leading-snug text-ink">Open the textbook to the contents page</p>
        <VisualTimer remainingMs={remaining} durationMs={DURATION} status="running" className="max-w-[15rem]" />
      </div>
      <div className="absolute -bottom-5 left-4 right-4 flex items-center gap-2 rounded-lg border border-border bg-surface px-3 py-2 shadow-soft">
        <ParkingSquare className="size-4 shrink-0 text-mist-500" />
        <span className={`flex-1 truncate text-sm ${parked ? "text-ink-faint" : "text-ink"}`}>{parked ? "A thought? Park it." : "remember to pay phone bill"}</span>
        <span className={`inline-flex items-center gap-1 font-mono text-[11px] text-accent transition-opacity ${parked ? "opacity-100" : "opacity-0"}`}>
          <Check className="size-3.5" /> Parked
        </span>
      </div>
    </div>
  );
}
