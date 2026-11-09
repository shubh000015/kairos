"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { useNow } from "@/hooks/useNow";
import { soundscape, tensionFor } from "@/lib/soundscape";
import { getRemainingMs, useFocusStore } from "@/store/useFocusStore";
import { useSettingsStore } from "@/store/useSettingsStore";

/**
 * Owns the actual oscillators. UI pickers (SoundscapePlayer) only write settings.
 * Plays during a running block, and while Study is mounted so music is available
 * in the studio frame without going back to Focus.
 */
export function SoundscapeHost() {
  const kind = useSettingsStore((s) => s.soundscape);
  const volume = useSettingsStore((s) => s.soundscapeVolume);
  const audioTension = useSettingsStore((s) => s.audioTension);
  const status = useFocusStore((s) => s.status);
  const durationMs = useFocusStore((s) => s.durationMs);
  const endsAt = useFocusStore((s) => s.endsAt);
  const remainingMsStored = useFocusStore((s) => s.remainingMs);
  const pathname = usePathname();
  const onStudy = pathname.startsWith("/app/study");
  const now = useNow(1000);

  const remainingMs =
    status === "running" && now !== null
      ? getRemainingMs({ status, endsAt, remainingMs: remainingMsStored }, now)
      : remainingMsStored;
  const running = status === "running";
  const shouldPlay = kind !== "off" && (running || onStudy);

  useEffect(() => {
    if (shouldPlay) void soundscape.play(kind, volume);
    else soundscape.stop();
  }, [shouldPlay, kind, volume]);

  useEffect(() => {
    const tension = running ? tensionFor(remainingMs, durationMs) : 0;
    soundscape.setTension(tension, audioTension);
  }, [running, remainingMs, durationMs, audioTension]);

  useEffect(() => () => soundscape.stop(), []);

  return null;
}
