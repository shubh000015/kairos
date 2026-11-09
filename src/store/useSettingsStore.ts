import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localFirstStorage } from "./storage";

export type ThemePref = "system" | "light" | "dark";
export type FontScale = "normal" | "large";
export type SoundscapeKind = "off" | "lofi" | "brown" | "pink" | "white" | "rain" | "fan" | "cafe" | "ocean" | "fire";

export interface SettingsState {
  theme: ThemePref;
  fontScale: FontScale;
  relaxedSpacing: boolean;
  reduceMotion: boolean;
  /** Minutes of continuous focus before a gentle "stretch / water" nudge. 0 = off. */
  hyperfocusGuardMin: number;
  soundscape: SoundscapeKind;
  soundscapeVolume: number; // 0..1
  /** Final-stretch pacing: the soundscape quickens over the last 3 minutes of a block. */
  audioTension: boolean;
  /** Whether the landing page should skip straight to the app next time. */
  hasVisitedApp: boolean;
  /** Allow calls to the server LLM routes. Off: everything runs on-device. */
  cloudAI: boolean;
  /** Use the in-browser embedding model (downloaded once, ~23 MB) for summaries and note search. */
  onDeviceML: boolean;
  /** Countdown blocks, or an open-ended count-up flow with no finish line. */
  timerStyle: "countdown" | "open";

  set: <K extends keyof SettingsState>(key: K, value: SettingsState[K]) => void;
}

export const SETTINGS_STORAGE_KEY = "settings-store";

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      theme: "light",
      fontScale: "normal",
      relaxedSpacing: false,
      reduceMotion: false,
      hyperfocusGuardMin: 50,
      soundscape: "off",
      soundscapeVolume: 0.35,
      audioTension: true,
      hasVisitedApp: false,
      cloudAI: false,
      onDeviceML: false,
      timerStyle: "countdown",
      set: (key, value) => set({ [key]: value } as Partial<SettingsState>),
    }),
    {
      name: SETTINGS_STORAGE_KEY,
      storage: localFirstStorage(),
      skipHydration: true,
      partialize: (s) => ({
        theme: s.theme,
        fontScale: s.fontScale,
        relaxedSpacing: s.relaxedSpacing,
        reduceMotion: s.reduceMotion,
        hyperfocusGuardMin: s.hyperfocusGuardMin,
        soundscape: s.soundscape,
        soundscapeVolume: s.soundscapeVolume,
        audioTension: s.audioTension,
        hasVisitedApp: s.hasVisitedApp,
        cloudAI: s.cloudAI,
        onDeviceML: s.onDeviceML,
        timerStyle: s.timerStyle,
      }),
    },
  ),
);
