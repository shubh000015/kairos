import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localFirstStorage } from "./storage";
import type { MentalLoad } from "@/lib/spotifyApi";

/** Manual override, or let the active task's energy tag decide. */
export type GearMode = "auto" | MentalLoad;

export interface AudioEngineState {
  enabled: boolean;
  mode: GearMode;
  highEnergyUri: string;
  lowStimUri: string;
  crossfade: boolean;
  /** Shifts gear automatically when a focus block starts. */
  shiftOnStart: boolean;

  set: <K extends keyof AudioEngineState>(key: K, value: AudioEngineState[K]) => void;
}

/*
 * Defaults are Spotify's own editorial playlists. New developer apps may not be
 * able to *browse* editorial playlists via the API, but playing them by URI
 * generally works. Swap in your own playlist URIs any time.
 */
export const DEFAULT_HIGH_ENERGY_URI = "spotify:playlist:37i9dQZF1DX76Wlfdnj7AP"; // Beast Mode
export const DEFAULT_LOW_STIM_URI = "spotify:playlist:37i9dQZF1DWZeKCadgRdKQ"; // Deep Focus

export const useAudioEngineStore = create<AudioEngineState>()(
  persist(
    (set) => ({
      enabled: true,
      mode: "auto",
      highEnergyUri: DEFAULT_HIGH_ENERGY_URI,
      lowStimUri: DEFAULT_LOW_STIM_URI,
      crossfade: true,
      shiftOnStart: true,
      set: (key, value) => set({ [key]: value } as Partial<AudioEngineState>),
    }),
    {
      name: "audio-engine-store",
      storage: localFirstStorage(),
      skipHydration: true,
      partialize: (s) => ({
        enabled: s.enabled,
        mode: s.mode,
        highEnergyUri: s.highEnergyUri,
        lowStimUri: s.lowStimUri,
        crossfade: s.crossfade,
        shiftOnStart: s.shiftOnStart,
      }),
    },
  ),
);

/** Normalises a pasted Spotify link or URI into a `spotify:…` URI, or null. */
export function toSpotifyUri(input: string): string | null {
  const s = input.trim();
  if (/^spotify:(playlist|album|artist|track):[A-Za-z0-9]{22}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (!/(^|\.)spotify\.com$/.test(u.hostname)) return null;
    const m = u.pathname.match(/\/(playlist|album|artist|track)\/([A-Za-z0-9]{22})/);
    if (m) return `spotify:${m[1]}:${m[2]}`;
  } catch {
    // not a URL
  }
  return null;
}
