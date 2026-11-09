"use client";

import { Gift, Pause, Play, Plus, Square, Volume2, VolumeX, Zap } from "lucide-react";
import {
  FLOW_PRESETS,
  INITIATION_PRESET,
  useFocusStore,
  type FocusPreset,
} from "@/store/useFocusStore";
import { useRewardStore } from "@/store/useRewardStore";

const btnBase = "inline-flex items-center justify-center gap-2 rounded-xl font-medium select-none disabled:opacity-50";
const btnPrimary = `${btnBase} btn-tactile btn-sheen bg-accent text-accent-ink px-6 py-3.5 text-lg shadow-soft hover:brightness-105`;
const btnSecondary = `${btnBase} btn-tactile bg-surface-raised text-ink border border-border px-5 py-3 shadow-soft hover:bg-surface`;
const btnGhost = `${btnBase} text-ink-muted hover:text-ink hover:bg-surface-sunken px-4 py-2.5`;

export function FocusControls() {
  const status = useFocusStore((s) => s.status);
  const flowPreset = useFocusStore((s) => s.flowPreset);
  const durationMs = useFocusStore((s) => s.durationMs);
  const soundEnabled = useFocusStore((s) => s.soundEnabled);
  const start = useFocusStore((s) => s.start);
  const pause = useFocusStore((s) => s.pause);
  const resume = useFocusStore((s) => s.resume);
  const stop = useFocusStore((s) => s.stop);
  const extend = useFocusStore((s) => s.extend);
  const setFlowPreset = useFocusStore((s) => s.setFlowPreset);
  const toggleSound = useFocusStore((s) => s.toggleSound);
  const rewardsEnabled = useRewardStore((s) => s.enabled);
  const rollReward = useRewardStore((s) => s.roll);

  if (status === "idle") {
    return (
      <div className="flex w-full flex-col items-center gap-6">
        {/* The single most important button on the screen. */}
        <button type="button" className={`${btnPrimary} w-full max-w-sm`} onClick={() => start(INITIATION_PRESET)}>
          <Zap className="size-5" aria-hidden="true" />
          Just Start ({INITIATION_PRESET} mins)
        </button>

        <div className="flex w-full max-w-sm flex-col items-center gap-3">
          <span className="text-sm text-ink-muted">Or choose a flow block</span>
          <PresetPicker value={flowPreset} onChange={setFlowPreset} />
          <button type="button" className={`${btnSecondary} w-full`} onClick={() => start(flowPreset)}>
            <Play className="size-4" aria-hidden="true" />
            Start {flowPreset} minutes
          </button>
        </div>

        <SoundToggle enabled={soundEnabled} onToggle={toggleSound} />
      </div>
    );
  }

  if (status === "running") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" className={btnSecondary} onClick={pause}>
          <Pause className="size-4" aria-hidden="true" />
          Pause
        </button>
        <button type="button" className={btnGhost} onClick={() => extend(5)}>
          <Plus className="size-4" aria-hidden="true" />5 min
        </button>
        <button type="button" className={btnGhost} onClick={stop}>
          <Square className="size-4" aria-hidden="true" />
          Done for now
        </button>
      </div>
    );
  }

  if (status === "paused") {
    return (
      <div className="flex flex-wrap items-center justify-center gap-3">
        <button type="button" className={btnPrimary} onClick={resume}>
          <Play className="size-5" aria-hidden="true" />
          Resume
        </button>
        <button type="button" className={btnGhost} onClick={stop}>
          <Square className="size-4" aria-hidden="true" />
          Done for now
        </button>
      </div>
    );
  }

  // status === "complete"
  const minutes = Math.round(durationMs / 60_000);
  return (
    <div className="flex w-full flex-col items-center gap-5">
      <p className="text-center text-lg text-ink">
        That&apos;s {minutes} minute{minutes === 1 ? "" : "s"} of focus. Good work.
      </p>
      <div className="flex flex-wrap items-center justify-center gap-3">
        {rewardsEnabled ? (
          <button type="button" className={btnPrimary} onClick={rollReward}>
            <Gift className="size-5" aria-hidden="true" />
            Claim reward
          </button>
        ) : null}
        <button type="button" className={rewardsEnabled ? btnSecondary : btnPrimary} onClick={() => extend(5)}>
          <Zap className={rewardsEnabled ? "size-4" : "size-5"} aria-hidden="true" />
          Keep going (+5)
        </button>
        <button type="button" className={rewardsEnabled ? btnGhost : btnSecondary} onClick={() => start(flowPreset)}>
          <Play className="size-4" aria-hidden="true" />
          Another {flowPreset} min
        </button>
        <button type="button" className={btnGhost} onClick={stop}>
          Take a breath
        </button>
      </div>
    </div>
  );
}

function PresetPicker({
  value,
  onChange,
}: {
  value: FocusPreset;
  onChange: (p: FocusPreset) => void;
}) {
  return (
    <div
      role="radiogroup"
      aria-label="Focus block length"
      className="inline-flex rounded-xl border border-border bg-surface-sunken p-1"
    >
      {FLOW_PRESETS.map((p) => {
        const active = p === value;
        return (
          <button
            key={p}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(p)}
            className={`min-w-[4.5rem] rounded-lg px-4 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-surface-raised text-ink shadow-soft"
                : "text-ink-muted hover:text-ink"
            }`}
          >
            {p} min
          </button>
        );
      })}
    </div>
  );
}

function SoundToggle({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      aria-pressed={enabled}
      className="inline-flex items-center gap-2 text-sm text-ink-faint hover:text-ink-muted"
    >
      {enabled ? (
        <Volume2 className="size-4" aria-hidden="true" />
      ) : (
        <VolumeX className="size-4" aria-hidden="true" />
      )}
      {enabled ? "Soft chime on" : "Chime off"}
    </button>
  );
}
