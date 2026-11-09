"use client";

import { Gift, Hourglass, ParkingSquare, Sparkles, Timer, Users, Zap } from "lucide-react";
import { useShallow } from "zustand/react/shallow";
import { useNow } from "@/hooks/useNow";
import { formatDuration, MINUTE_MS, recentDayKeys, weekdayLabel } from "@/lib/time";
import { useFocusStore } from "@/store/useFocusStore";
import { useParkingLotStore } from "@/store/useParkingLotStore";
import { usePodStore } from "@/store/usePodStore";
import { useRewardStore } from "@/store/useRewardStore";
import { useStudyStore } from "@/store/useStudyStore";
import { useTaskStore } from "@/store/useTaskStore";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

/**
 * Insights that only ever add up. No streaks, no "missed days", no red.
 * Empty days are drawn as quiet gaps, not failures.
 */
export function Insights() {
  const history = useFocusStore((s) => s.history);
  const blocksStarted = useFocusStore((s) => s.blocksStarted);
  const thoughtsParked = useParkingLotStore((s) => s.thoughts.length);
  const tasks = useTaskStore(useShallow((s) => s.tasks));
  const speedbumps = useStudyStore((s) => s.speedbumpsCleared);
  const rewardsClaimed = useRewardStore((s) => s.claimed);
  const sprintsTogether = usePodStore((s) => s.sprintsTogether);
  const now = useNow(60_000);

  const days = now === null ? [] : recentDayKeys(14, new Date(now));
  const values = days.map((d) => history[d] ?? 0);
  const max = Math.max(MINUTE_MS * 30, ...values);
  const totalMs = Object.values(history).reduce((a, b) => a + b, 0);
  const activeDays = Object.values(history).filter((v) => v > 0).length;
  const doneTasks = tasks.filter((t) => t.done).length;

  // Time-estimation calibration — the CBT exercise that actually shrinks time blindness.
  const calibrated = tasks.filter((t) => t.estimateMin && t.actualMs > 2 * MINUTE_MS && (t.done || t.actualMs > (t.estimateMin ?? 0) * MINUTE_MS));
  const ratio = calibrated.length >= 2 ? calibrated.reduce((a, t) => a + t.actualMs / ((t.estimateMin ?? 1) * MINUTE_MS), 0) / calibrated.length : null;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
      <Card>
        <CardHeader icon={<Timer className="size-5" />} title="Focus, last two weeks" description="Every bar is time you actually spent. Gaps are just gaps." />
        <CardBody>
          <div className="flex h-40 items-end gap-1.5" role="img" aria-label="Daily focus minutes for the last 14 days">
            {days.map((d, i) => {
              const v = values[i];
              const h = v === 0 ? 3 : Math.max(8, Math.round((v / max) * 140));
              return (
                <div key={d} className="flex flex-1 flex-col items-center gap-1.5" title={`${weekdayLabel(d)}: ${formatDuration(v)}`}>
                  <div className={`w-full rounded-t-md transition-[height] duration-500 ${v === 0 ? "bg-border" : "bg-accent"}`} style={{ height: h }} />
                  <span className="text-[10px] text-ink-faint">{weekdayLabel(d).slice(0, 1)}</span>
                </div>
              );
            })}
          </div>
        </CardBody>
      </Card>

      <div className="flex flex-col gap-4">
        <Stat icon={<Timer className="size-4" />} label="Total focus" value={formatDuration(totalMs)} sub={activeDays ? `across ${activeDays} day${activeDays === 1 ? "" : "s"}` : "starts with one block"} />
        <Stat icon={<Sparkles className="size-4" />} label="Blocks started" value={String(blocksStarted)} sub={doneTasks ? `${doneTasks} task${doneTasks === 1 ? "" : "s"} finished` : "starting counts"} />
        <Stat icon={<ParkingSquare className="size-4" />} label="Thoughts parked" value={String(thoughtsParked)} sub="distractions that didn't win" />
        <div className="grid grid-cols-2 gap-4">
          <Stat icon={<Zap className="size-4" />} label="Speedbumps" value={String(speedbumps)} sub="sections read with your hands" />
          <Stat icon={<Gift className="size-4" />} label="Drops claimed" value={String(rewardsClaimed)} sub="breaks you earned" />
        </div>
        <Stat icon={<Users className="size-4" />} label="Sprints together" value={String(sprintsTogether)} sub="focus pods you sat in" />
        <Card>
          <CardHeader icon={<Hourglass className="size-5" />} title="Time guesses" />
          <CardBody className="pt-2 text-sm text-ink-muted">
            {ratio === null ? (
              <p>Add a time guess to a few tasks and focus on them. After two or three, this will show how your sense of time compares to the clock — useful, never judgemental.</p>
            ) : ratio > 1.15 ? (
              <p>Things take about <span className="font-medium text-ink">{ratio.toFixed(1)}×</span> longer than you guess. That&apos;s normal with ADHD. Try multiplying guesses by {Math.ceil(ratio * 2) / 2} and see how it feels.</p>
            ) : ratio < 0.85 ? (
              <p>You finish faster than you expect — about <span className="font-medium text-ink">{ratio.toFixed(1)}×</span> your guess. Dreading things may be costing more than doing them.</p>
            ) : (
              <p>Your guesses are close to the clock. That&apos;s a real skill — keep guessing.</p>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}

function Stat({ icon, label, value, sub }: { icon: React.ReactNode; label: string; value: string; sub: string }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-raised px-4 py-3 shadow-soft">
      <div className="flex items-center gap-2 text-xs uppercase tracking-wide text-ink-faint">{icon}{label}</div>
      <div className="mt-1 font-display text-3xl text-ink">{value}</div>
      <div className="text-sm text-ink-muted">{sub}</div>
    </div>
  );
}
