"use client";

import { clamp01, formatClock, formatSpoken } from "@/lib/time";
import type { FocusStatus } from "@/store/useFocusStore";

interface VisualTimerProps {
  remainingMs: number;
  durationMs: number;
  status: FocusStatus;
  /** Optional one-line label under the digits, e.g. the current task. */
  label?: string;
  className?: string;
}

const SIZE = 200;
const CX = SIZE / 2;
const CY = SIZE / 2;
const R = 86;

/** Round to 3 dp so server and browser trig produce byte-identical markup (avoids hydration noise). */
const round = (n: number) => Math.round(n * 1000) / 1000;

/** Point at `deg` clockwise from 12 o'clock, at `radius` from the centre. */
function polar(deg: number, radius = R): [number, number] {
  const rad = (deg * Math.PI) / 180;
  return [round(CX + radius * Math.sin(rad)), round(CY - radius * Math.cos(rad))];
}

/** SVG path for a wedge covering `fraction` of the disc, anchored at 12 o'clock. */
function wedgePath(fraction: number): string {
  const deg = clamp01(fraction) * 360;
  if (deg <= 0.01) return "";
  const [x0, y0] = polar(0);
  const [x1, y1] = polar(deg);
  const largeArc = deg > 180 ? 1 : 0;
  return `M ${CX} ${CY} L ${x0} ${y0} A ${R} ${R} 0 ${largeArc} 1 ${x1} ${y1} Z`;
}

/**
 * A "Time Timer"-style disc: the coloured wedge is the time you have left and it
 * visibly shrinks, so elapsed time is felt rather than read. Digits are secondary.
 */
export function VisualTimer({
  remainingMs,
  durationMs,
  status,
  label,
  className = "",
}: VisualTimerProps) {
  const fraction = durationMs > 0 ? clamp01(remainingMs / durationMs) : 0;
  const isFull = fraction >= 0.9995;
  const isComplete = status === "complete";
  const isPaused = status === "paused";

  // Coarse phrasing ("About 4 minutes remaining") so the live region only
  // announces at minute boundaries, not every second.
  const spoken = formatSpoken(remainingMs);

  const wedgeColor = isComplete
    ? "fill-mist-200"
    : isPaused
      ? "fill-mist-500"
      : "fill-accent";

  return (
    <div
      className={`relative mx-auto aspect-square w-full max-w-[22rem] select-none ${className}`}
      role="timer"
      aria-label={`Focus timer. ${spoken}.`}
    >
      <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="h-full w-full" aria-hidden="true">
        {/* Disc background */}
        <circle cx={CX} cy={CY} r={R} className="fill-surface-sunken" />

        {/* Remaining time wedge */}
        {isFull ? (
          <circle cx={CX} cy={CY} r={R} className={`${wedgeColor} transition-colors duration-500`} />
        ) : (
          <path d={wedgePath(fraction)} className={`${wedgeColor} transition-colors duration-500`} />
        )}

        {/* Quiet hour-style ticks so progress has reference points */}
        {Array.from({ length: 12 }, (_, i) => {
          const [x1, y1] = polar(i * 30);
          const [x2, y2] = polar(i * 30, R - 7);
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              className="stroke-surface-raised"
              strokeWidth={1.5}
              strokeLinecap="round"
            />
          );
        })}

        {/* Outline + centre pin */}
        <circle cx={CX} cy={CY} r={R} className="fill-none stroke-border" strokeWidth={1.5} />
        <circle cx={CX} cy={CY} r={3} className="fill-ink-faint" />
      </svg>

      {/* Digits sit below centre so they do not fight the wedge visually */}
      <div className="pointer-events-none absolute inset-x-0 bottom-[14%] flex flex-col items-center gap-0.5">
        <span
          className={`rounded-full bg-surface-raised/85 px-4 py-1 font-mono text-3xl font-medium tabular-nums tracking-tight shadow-soft backdrop-blur-sm ${
            isComplete ? "text-mist-700 dark:text-mist-200" : "text-ink"
          }`}
        >
          {isComplete ? "Done" : formatClock(remainingMs)}
        </span>
        {label ? (
          <span className="max-w-[80%] truncate text-sm text-ink-muted">{label}</span>
        ) : null}
        {isPaused ? <span className="text-xs text-ink-faint">paused</span> : null}
      </div>

      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {spoken}
      </div>
    </div>
  );
}
