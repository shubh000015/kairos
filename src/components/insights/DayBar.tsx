"use client";

import { useNow } from "@/hooks/useNow";

const START_H = 6;
const END_H = 24;

/**
 * Where you are in the day, as a bar. Time blindness makes "it's 3pm" abstract;
 * a marker two-thirds along a bar is concrete.
 */
export function DayBar() {
  const now = useNow(60_000);
  if (now === null) return <div className="h-14" aria-hidden="true" />;

  const d = new Date(now);
  const hours = d.getHours() + d.getMinutes() / 60;
  const pct = Math.min(100, Math.max(0, ((hours - START_H) / (END_H - START_H)) * 100));
  const timeLabel = d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
  const left = Math.max(0, END_H - hours);
  const leftLabel = left >= 1 ? `${Math.floor(left)}h ${Math.round((left % 1) * 60)}m left in the day` : "the day is winding down";

  return (
    <div className="rounded-xl border border-border bg-surface-raised px-4 py-3 shadow-soft">
      <div className="mb-2 flex items-baseline justify-between text-sm">
        <span className="text-ink">Now: <span className="font-medium tabular-nums">{timeLabel}</span></span>
        <span className="text-xs text-ink-faint">{leftLabel}</span>
      </div>
      <div className="relative h-3 rounded-full bg-surface-sunken" role="img" aria-label={`It is ${timeLabel}. ${leftLabel}.`}>
        <div className="absolute inset-y-0 left-0 rounded-full bg-accent/45" style={{ width: `${pct}%` }} />
        <div className="absolute top-1/2 size-4 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-surface-raised bg-mist-500 shadow-soft" style={{ left: `${pct}%` }} />
        {[9, 12, 15, 18, 21].map((h) => (
          <span key={h} className="absolute top-full mt-1 -translate-x-1/2 text-[10px] text-ink-faint" style={{ left: `${((h - START_H) / (END_H - START_H)) * 100}%` }}>
            {h > 12 ? `${h - 12}p` : h === 12 ? "12p" : `${h}a`}
          </span>
        ))}
      </div>
      <div className="h-3" />
    </div>
  );
}
