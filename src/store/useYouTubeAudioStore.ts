import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localFirstStorage } from "./storage";
import { useSettingsStore } from "./useSettingsStore";

export interface YouTubeAudioState {
  videoId: string | null;
  title: string;
  playing: boolean;
  volume: number;
  play: (videoId: string, title: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  setVolume: (n: number) => void;
}

export const useYouTubeAudioStore = create<YouTubeAudioState>()(
  persist(
    (set) => ({
      videoId: null,
      title: "",
      playing: false,
      volume: 0.7,
      play: (videoId, title) => {
        useSettingsStore.getState().set("soundscape", "off");
        set({ videoId, title, playing: true });
      },
      pause: () => set({ playing: false }),
      resume: () => set((s) => (s.videoId ? { playing: true } : s)),
      stop: () => set({ videoId: null, title: "", playing: false }),
      setVolume: (n) => set({ volume: Math.min(1, Math.max(0, n)) }),
    }),
    {
      name: "youtube-audio-store",
      storage: localFirstStorage(),
      skipHydration: true,
      partialize: (s) => ({
        videoId: s.videoId,
        title: s.title,
        volume: s.volume,
      }),
    },
  ),
);
