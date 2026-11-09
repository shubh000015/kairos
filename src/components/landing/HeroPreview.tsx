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
      <div className="rounded-[2rem] border border-border bg-surface-raised p-6 shadow-soft">
        <div className="eyebrow mb-3">right now</div>
        <p className="mb-4 font-display text-xl lowercase leading-snug text-ink">open the textbook to the contents page</p>
        <VisualTimer remainingMs={remaining} durationMs={DURATION} status="running" className="max-w-[16rem]" />
      </div>
      <div className="absolute -bottom-6 left-1/2 flex w-[92%] -translate-x-1/2 items-center gap-2 rounded-2xl border border-border bg-surface-raised/95 p-2 pl-3 shadow-soft backdrop-blur">
        <ParkingSquare className="size-5 shrink-0 text-mist-500" />
        <span className={`flex-1 truncate text-sm ${parked ? "text-ink-faint" : "text-ink"}`}>{parked ? "Random thought? Park it here." : "remember to pay phone bill"}</span>
        <span className={`inline-flex items-center gap-1 text-xs text-accent transition-opacity ${parked ? "opacity-100" : "opacity-0"}`}>
          <Check className="size-3.5" /> Parked
        </span>
      </div>
    </div>
  );
}
