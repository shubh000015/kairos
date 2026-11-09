"use client";

import { useCallback, useEffect, useRef } from "react";
import { isSpotifyConnected, shiftAudioGear, type MentalLoad } from "@/lib/spotifyApi";
import { useAudioEngineStore } from "@/store/useAudioEngineStore";
import { useFocusStore } from "@/store/useFocusStore";
import { selectActiveTask, useTaskStore } from "@/store/useTaskStore";
import { toast } from "@/components/ui/Toast";

/**
 * One copy of the "shift gear when a block starts" effect, mounted in the app
 * shell so dashboard + study studio cards cannot double-fire it.
 */
export function AudioEngineEffects() {
  const enabled = useAudioEngineStore((s) => s.enabled);
  const mode = useAudioEngineStore((s) => s.mode);
  const highEnergyUri = useAudioEngineStore((s) => s.highEnergyUri);
  const lowStimUri = useAudioEngineStore((s) => s.lowStimUri);
  const crossfade = useAudioEngineStore((s) => s.crossfade);
  const shiftOnStart = useAudioEngineStore((s) => s.shiftOnStart);
  const focusStatus = useFocusStore((s) => s.status);
  const blockId = useFocusStore((s) => s.blockId);
  const activeTask = useTaskStore(selectActiveTask);

  const autoLoad: MentalLoad | null = activeTask?.energy === "low" ? "low-load" : activeTask?.energy === "high" ? "high-load" : null;
  const effective: MentalLoad | null = mode === "auto" ? autoLoad : mode;

  const shift = useCallback(
    async (load: MentalLoad) => {
      if (!isSpotifyConnected()) return;
      try {
        await shiftAudioGear(load, { highEnergyUri, lowStimUri, crossfade });
        toast(load === "low-load" ? "Shifted up: energy for the boring bit." : "Shifted down: low stimulation for the dense bit.");
      } catch {
        // UI cards surface Spotify errors; this host stays quiet.
      }
    },
    [highEnergyUri, lowStimUri, crossfade],
  );

  const lastShift = useRef<string | null>(null);
  useEffect(() => {
    if (!enabled || !shiftOnStart || focusStatus !== "running" || !effective || !blockId) return;
    const key = `${blockId}:${effective}`;
    if (lastShift.current === key) return;
    lastShift.current = key;
    void shift(effective);
  }, [enabled, shiftOnStart, focusStatus, effective, blockId, shift]);

  return null;
}
