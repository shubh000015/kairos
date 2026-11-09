"use client";

import { Check, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { playCompletionThud, playSoftChime } from "@/lib/sound";
import { useSettingsStore } from "@/store/useSettingsStore";
import { CompletionBurst } from "@/components/ui/CompletionBurst";
import { getRemainingMs, useFocusStore } from "@/store/useFocusStore";
import { nextStep, selectActiveTask, useTaskStore } from "@/store/useTaskStore";
import { Button, IconButton } from "@/components/ui/Button";
import { useRewardStore } from "@/store/useRewardStore";
import { useStuckDetector, type StuckReason } from "@/hooks/useStuckDetector";
import { StuckNudge } from "@/components/study/StuckNudge";
import { FocusControls } from "./FocusControls";
import { HyperfocusGuard } from "./HyperfocusGuard";
import { RewardDrop } from "./RewardDrop";
import { SoundscapePlayer } from "./SoundscapePlayer";
import { VisualTimer } from "./VisualTimer";

const TICK_MS = 250;

/**
 * Owns the clock. Remaining time is derived from an absolute `endsAt` timestamp,
 * so backgrounded tabs and page reloads do not drift the timer.
 */
export function FocusSession() {
  const status = useFocusStore((s) => s.status);
  const blockId = useFocusStore((s) => s.blockId);
  const endsAt = useFocusStore((s) => s.endsAt);
  const remainingMsStored = useFocusStore((s) => s.remainingMs);
  const durationMs = useFocusStore((s) => s.durationMs);
  const soundEnabled = useFocusStore((s) => s.soundEnabled);
  const tick = useFocusStore((s) => s.tick);

  const activeTask = useTaskStore(selectActiveTask);
  const toggleStep = useTaskStore((s) => s.toggleStep);
  const toggleDone = useTaskStore((s) => s.toggleDone);
  const setActive = useTaskStore((s) => s.setActive);
  const replaceStep = useTaskStore((s) => s.replaceStep);

  // Mid-block paralysis: a flurry of aimless clicks, or 12 quiet minutes on the same step.
  const [stuck, setStuck] = useState<StuckReason | null>(null);
  const stuckStep = activeTask ? nextStep(activeTask) : null;
  useStuckDetector({
    contextKey: `${blockId ?? ""}:${stuckStep?.id ?? activeTask?.id ?? ""}`,
    enabled: status === "running" && !!activeTask,
    idleMs: 12 * 60_000,
    onStuck: setStuck,
  });
  const rewardActive = useRewardStore((s) => s.rolling || s.current !== null || s.breakEndsAt !== null);
  const dismissReward = useRewardStore((s) => s.dismiss);

  // A block started from anywhere else ends any lingering break card.
  useEffect(() => {
    if (status === "running" && rewardActive) dismissReward();
  }, [status, rewardActive, dismissReward]);

  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const [burst, setBurst] = useState(false);

  /** Finishing a step or task should land with weight: thud, burst, then commit. */
  const tactile = (commit: () => void) => {
    if (soundEnabled) playCompletionThud();
    if (!reduceMotion) setBurst(true);
    window.setTimeout(() => {
      commit();
      setBurst(false);
    }, reduceMotion ? 60 : 450);
  };

  // Read the clock only in effects — prerendering must not bake in a timestamp.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (status !== "running") return;
    const update = () => {
      const t = Date.now();
      setNow(t);
      tick(t);
    };
    update();
    const id = window.setInterval(update, TICK_MS);
    document.addEventListener("visibilitychange", update);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", update);
    };
  }, [status, tick]);

  // Gentle chime on the transition into "complete" (not on reload into that state).
  const prevStatus = useRef(status);
  useEffect(() => {
    if (prevStatus.current === "running" && status === "complete" && soundEnabled) playSoftChime();
    prevStatus.current = status;
  }, [status, soundEnabled]);

  const remainingMs =
    now === null ? remainingMsStored : getRemainingMs({ status, endsAt, remainingMs: remainingMsStored }, now);
  const elapsedMs = durationMs - remainingMs;
  const step = activeTask ? nextStep(activeTask) : null;
  const inFocus = status === "running" || status === "paused";

  return (
    <section className="flex w-full flex-col items-center gap-6" aria-label="Focus session">
      <VisualTimer remainingMs={remainingMs} durationMs={durationMs} status={status} />

      {/* Progressive disclosure: isolate step 1; later steps exist as a blurred whisper. */}
      {activeTask ? (
        <div className="rise-in relative w-full max-w-md">
          <AnimatePresence>{burst ? <CompletionBurst key="b" size={220} /> : null}</AnimatePresence>
          <div className="relative z-10 rounded-xl border border-border/70 bg-surface-raised px-5 py-5 shadow-soft">
            <div className="mb-2 flex items-center justify-between">
              <span className="eyebrow">{step ? "right now" : "working on"}</span>
              <IconButton label="Clear active task" onClick={() => setActive(null)} className="size-7">
                <X className="size-3.5" />
              </IconButton>
            </div>
            {step ? (
              <div className="flex items-start gap-3">
                <p className="flex-1 font-display text-2xl leading-snug text-ink">{step.text}</p>
                <Button variant="soft" size="sm" onClick={() => tactile(() => toggleStep(activeTask.id, step.id))} aria-label="Mark step done" disabled={burst}>
                  <Check className="size-4" /> Done
                </Button>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <p className="flex-1 font-display text-2xl leading-snug text-ink">{activeTask.title}</p>
                <Button variant="soft" size="sm" onClick={() => tactile(() => toggleDone(activeTask.id))} disabled={burst}>
                  <Check className="size-4" /> Finish
                </Button>
              </div>
            )}
          </div>
          {step && activeTask.steps.filter((s) => !s.done && s.id !== step.id).length > 0 ? (
            <ol className="pointer-events-none mt-2 space-y-1.5 px-5 select-none" aria-hidden="true">
              {activeTask.steps
                .filter((s) => !s.done && s.id !== step.id)
                .slice(0, 3)
                .map((s, i) => (
                  <li
                    key={s.id}
                    className="truncate text-sm text-ink-muted"
                    style={{ filter: `blur(${4 + i * 2}px)`, opacity: 0.55 - i * 0.12 }}
                  >
                    {s.text}
                  </li>
                ))}
            </ol>
          ) : null}
        </div>
      ) : !inFocus ? (
        <Link
          href="/app/tasks"
          className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink"
        >
          Pick a task to focus on <ChevronRight className="size-4" />
        </Link>
      ) : null}

      <div className="w-full max-w-md">
        <HyperfocusGuard blockId={blockId} elapsedMs={elapsedMs} />
      </div>

      {rewardActive ? <RewardDrop /> : <FocusControls />}
      <SoundscapePlayer remainingMs={remainingMs} />

      {activeTask ? (
        <StuckNudge
          open={stuck !== null}
          reason={stuck}
          variant={{
            kind: "task",
            stepText: stuckStep?.text ?? activeTask.title,
            onShrink: (steps) => {
              if (stuckStep) replaceStep(activeTask.id, stuckStep.id, steps);
              else useTaskStore.getState().setSteps(activeTask.id, steps);
            },
          }}
          onClose={() => setStuck(null)}
        />
      ) : null}
    </section>
  );
}
