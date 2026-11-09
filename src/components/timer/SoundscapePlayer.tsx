"use client";

import { Activity, Volume1 } from "lucide-react";
import { usePathname } from "next/navigation";
import { SOUNDSCAPE_OPTIONS, tensionFor } from "@/lib/soundscape";
import { getRemainingMs, useFocusStore } from "@/store/useFocusStore";
import { useSettingsStore } from "@/store/useSettingsStore";

/**
 * Soundscape picker. Playback is owned by SoundscapeHost in the app shell so
 * leaving Focus (or unmounting this picker) does not kill the audio.
 */
export function SoundscapePlayer({ remainingMs, compact = false }: { remainingMs?: number; compact?: boolean }) {
  const kind = useSettingsStore((s) => s.soundscape);
  const volume = useSettingsStore((s) => s.soundscapeVolume);
  const audioTension = useSettingsStore((s) => s.audioTension);
  const set = useSettingsStore((s) => s.set);
  const status = useFocusStore((s) => s.status);
  const durationMs = useFocusStore((s) => s.durationMs);
  const endsAt = useFocusStore((s) => s.endsAt);
  const remainingMsStored = useFocusStore((s) => s.remainingMs);
  const pathname = usePathname();
  const onStudy = pathname.startsWith("/app/study");
  const running = status === "running";
  const remaining = remainingMs ?? getRemainingMs({ status, endsAt, remainingMs: remainingMsStored });
  const tension = running ? Math.round(tensionFor(remaining, durationMs) * 40) / 40 : 0;
  const finalStretch = running && audioTension && tension > 0 && kind !== "off";

  return (
    <div className={`flex flex-col gap-2 text-sm ${compact ? "items-stretch" : "items-center"}`}>
      <div className={`flex flex-wrap items-center gap-2 ${compact ? "" : "justify-center"}`}>
        <span className="inline-flex items-center gap-1.5 text-ink-faint">
          <Volume1 className="size-4" aria-hidden="true" />
          Soundscape
        </span>
        <div role="radiogroup" aria-label="Soundscape" className="inline-flex flex-wrap rounded-lg border border-border bg-surface-sunken p-0.5">
          {SOUNDSCAPE_OPTIONS.map((o) => (
            <button
              key={o.value}
              type="button"
              role="radio"
              aria-checked={kind === o.value}
              title={o.hint}
              onClick={() => set("soundscape", o.value)}
              className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
                kind === o.value ? "bg-surface-raised text-ink shadow-soft" : "text-ink-muted hover:text-ink"
              }`}
            >
              {o.label}
            </button>
          ))}
        </div>
        {kind !== "off" ? (
          <input
            type="range"
            min={0}
            max={1}
            step={0.05}
            value={volume}
            onChange={(e) => set("soundscapeVolume", Number(e.target.value))}
            aria-label="Soundscape volume"
            className="h-1.5 w-24 accent-accent"
          />
        ) : null}
      </div>

      {kind !== "off" ? (
        <div className={`flex items-center gap-3 text-xs text-ink-faint ${compact ? "" : ""}`}>
          <button
            type="button"
            onClick={() => set("audioTension", !audioTension)}
            aria-pressed={audioTension}
            title="Over the last three minutes the sound quickens a little — a soft, made-up deadline."
            className="inline-flex items-center gap-1.5 hover:text-ink-muted"
          >
            <Activity className="size-3.5" aria-hidden="true" />
            Final-stretch pacing {audioTension ? "on" : "off"}
          </button>
          {finalStretch ? (
            <span className="inline-flex items-center gap-1.5 text-ink-muted" aria-live="polite">
              <span
                className="pulse-dot inline-block size-1.5 rounded-full bg-accent"
                style={{ ["--pulse-period" as string]: `${60 / (72 + 14 * tension)}s` }}
              />
              final stretch
            </span>
          ) : running ? null : onStudy ? (
            <span>playing in study</span>
          ) : (
            <span>plays while focusing</span>
          )}
        </div>
      ) : null}
    </div>
  );
}
