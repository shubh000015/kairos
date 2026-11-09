"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Eye, Hash, Play, Sparkles, Waves } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { formatDuration } from "@/lib/time";
import { useFocusStore } from "@/store/useFocusStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Button } from "@/components/ui/Button";

const MILESTONE_MS = 10 * 60_000;

type View = "numbers" | "zen";

function clock(ms: number): string {
  const total = Math.floor(ms / 1000);
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = total % 60;
  const mm = h ? String(m).padStart(2, "0") : String(m);
  return `${h ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

async function burst(origin: { x: number; y: number }) {
  const confetti = (await import("canvas-confetti")).default;
  void confetti({
    particleCount: 46,
    spread: 70,
    startVelocity: 22,
    gravity: 0.7,
    scalar: 0.8,
    ticks: 140,
    origin,
    colors: ["#84A59D", "#6B7A8F", "#EBE9E1", "#E27D60", "#F7F5F0"],
    disableForReducedMotion: true,
  });
}

/**
 * A count-up stopwatch with no failure state. Time only accumulates; every ten
 * minutes a quiet burst says "still flowing"; "Capture session" banks whatever
 * happened. Zen mode hides the numbers entirely for people who find digits loud.
 */
export function ZenFlowTracker() {
  const startedAt = useFocusStore((s) => s.flowStartedAt);
  const startFlow = useFocusStore((s) => s.startFlow);
  const captureFlow = useFocusStore((s) => s.captureFlow);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);

  const [view, setView] = useState<View>("numbers");
  const [now, setNow] = useState<number | null>(null);
  const [milestones, setMilestones] = useState(0);
  const [captured, setCaptured] = useState<number | null>(null);
  const stage = useRef<HTMLDivElement>(null);
  const lastMilestone = useRef(0);

  useEffect(() => {
    if (startedAt === null) return;
    // Don't re-celebrate milestones that passed before a reload.
    lastMilestone.current = Math.floor((Date.now() - startedAt) / MILESTONE_MS);
    const tick = () => {
      const t = Date.now();
      setNow(t);
      const m = Math.floor((t - startedAt) / MILESTONE_MS);
      setMilestones(m);
      if (m > lastMilestone.current) {
        lastMilestone.current = m;
        const r = stage.current?.getBoundingClientRect();
        if (r && !reduceMotion) void burst({ x: (r.left + r.width / 2) / window.innerWidth, y: (r.top + r.height / 2) / window.innerHeight });
      }
    };
    const first = window.setTimeout(tick, 0);
    const id = window.setInterval(tick, 1000);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [startedAt, reduceMotion]);

  const elapsed = startedAt !== null && now !== null ? Math.max(0, now - startedAt) : 0;
  const running = startedAt !== null;

  const capture = () => {
    const ms = captureFlow();
    setCaptured(ms);
    setNow(null);
    setMilestones(0);
  };

  return (
    <section aria-label="Open flow" className="relative overflow-hidden rounded-3xl border border-border bg-surface-raised px-6 py-8 shadow-soft">
      <div className="flex items-center justify-between gap-3">
        <p className="eyebrow">{running ? "open flow · no finish line" : "open flow"}</p>
        <div role="radiogroup" aria-label="Display" className="inline-flex rounded-lg border border-border bg-surface-sunken p-0.5">
          {(
            [
              { v: "numbers", label: "Numbers", icon: <Hash className="size-3.5" /> },
              { v: "zen", label: "Zen", icon: <Waves className="size-3.5" /> },
            ] as const
          ).map((o) => (
            <button
              key={o.v}
              type="button"
              role="radio"
              aria-checked={view === o.v}
              onClick={() => setView(o.v)}
              className={`inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${view === o.v ? "bg-surface-raised text-ink shadow-soft" : "text-ink-muted hover:text-ink"}`}
            >
              {o.icon}
              {o.label}
            </button>
          ))}
        </div>
      </div>

      <div ref={stage} className="relative mx-auto my-8 flex size-64 items-center justify-center">
        {/* Milestone pulse ring */}
        <AnimatePresence>
          {milestones > 0 && !reduceMotion ? (
            <motion.span
              key={milestones}
              aria-hidden
              initial={{ scale: 0.7, opacity: 0.6 }}
              animate={{ scale: 1.5, opacity: 0 }}
              transition={{ duration: 1.8, ease: "easeOut" }}
              className="absolute inset-0 rounded-full border-2 border-accent"
            />
          ) : null}
        </AnimatePresence>

        {view === "zen" ? (
          <motion.div
            aria-hidden
            animate={running && !reduceMotion ? { scale: [1, 1.09, 1] } : { scale: 1 }}
            transition={running ? { duration: 9, repeat: Infinity, ease: "easeInOut" } : undefined}
            className="size-56 rounded-full"
            style={{
              background: "radial-gradient(circle at 40% 35%, #EBE9E1, #84A59D 58%, #6B7A8F)",
              opacity: running ? 1 : 0.55,
            }}
          />
        ) : (
          <div className="flex size-56 flex-col items-center justify-center rounded-full border border-border bg-surface">
            <span className="font-display text-5xl tabular-nums text-ink" aria-live="off">{clock(elapsed)}</span>
            <span className="mt-1 text-xs text-ink-faint">{running ? "and counting" : "starts at zero"}</span>
          </div>
        )}
        {view === "zen" ? <span className="sr-only">{running ? `Flowing for ${formatDuration(elapsed)}` : "Not started"}</span> : null}
      </div>

      {/* Passive milestone dots: each one is ten minutes of flow. */}
      <div className="mb-6 flex min-h-4 justify-center gap-1.5" aria-label={`${milestones} ten-minute milestones`}>
        {Array.from({ length: Math.min(milestones, 12) }, (_, i) => (
          <motion.span
            key={i}
            initial={reduceMotion ? false : { scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ type: "spring", stiffness: 400, damping: 14 }}
            className="size-2 rounded-full bg-accent"
          />
        ))}
        {milestones > 12 ? <span className="text-xs text-ink-faint">+{milestones - 12}</span> : null}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {!running ? (
          <Button variant="primary" size="lg" onClick={() => { setCaptured(null); startFlow(); }}>
            <Play className="size-4" /> Start flowing
          </Button>
        ) : (
          <Button variant="primary" size="lg" onClick={capture}>
            <Sparkles className="size-4" /> Capture session
          </Button>
        )}
        {running && view === "zen" ? (
          <button type="button" onClick={() => setView("numbers")} className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-ink">
            <Eye className="size-3.5" /> peek at the time
          </button>
        ) : null}
      </div>

      <AnimatePresence>
        {captured !== null && !running ? (
          <motion.p
            initial={reduceMotion ? false : { opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="mt-5 text-center text-sm text-ink-muted"
          >
            {captured < 60_000
              ? "Captured. You started — that's the hard part."
              : `Captured ${formatDuration(captured)} of flow. Every minute of it counts.`}
          </motion.p>
        ) : null}
      </AnimatePresence>
    </section>
  );
}
