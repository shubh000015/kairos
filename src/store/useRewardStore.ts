import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localFirstStorage } from "./storage";
import { minutesToMs } from "@/lib/time";
import { parseYouTubeId } from "@/lib/youtube";
import { CURATED_VIDEOS, rollReward, type Reward, type RewardVideo } from "@/lib/rewards";
import { useRoutineStore } from "./useRoutineStore";

export interface RewardState {
  /** Offer a "Claim reward" loot drop when a block completes. */
  enabled: boolean;
  /** Include short embedded videos in the pool. */
  allowVideos: boolean;
  /** Curated video ids the user has removed. */
  hiddenVideoIds: string[];
  /** Videos the user added. */
  customVideos: RewardVideo[];
  /** The reward currently on screen (persisted so a reload mid-break keeps it). */
  current: Reward | null;
  /** Absolute end time of the running break, if any. */
  breakEndsAt: number | null;
  /** Rewards claimed, ever. Only goes up. */
  claimed: number;
  /** Transient: the loot animation is playing. Not persisted. */
  rolling: boolean;

  setEnabled: (on: boolean) => void;
  setAllowVideos: (on: boolean) => void;
  /** Kick off the roll; `reveal()` settles it. */
  roll: () => void;
  reveal: () => Reward;
  startBreak: (minutes: number) => void;
  extendBreak: (minutes: number) => void;
  /** Clears the reward and any break. */
  dismiss: () => void;
  addVideo: (url: string, title?: string) => boolean;
  removeVideo: (id: string) => void;
  videoPool: () => RewardVideo[];
}

export const useRewardStore = create<RewardState>()(
  persist(
    (set, get) => ({
      enabled: true,
      allowVideos: true,
      hiddenVideoIds: [],
      customVideos: [],
      current: null,
      breakEndsAt: null,
      claimed: 0,
      rolling: false,

      setEnabled: (on) => set({ enabled: on }),
      setAllowVideos: (on) => set({ allowVideos: on }),

      roll: () => set({ rolling: true, current: null, breakEndsAt: null }),

      reveal: () => {
        const s = get();
        const reward = rollReward({ menu: useRoutineStore.getState().menu, videos: s.videoPool(), allowVideos: s.allowVideos });
        set({ rolling: false, current: reward, claimed: s.claimed + 1 });
        return reward;
      },

      startBreak: (minutes) => set({ breakEndsAt: Date.now() + minutesToMs(minutes) }),
      extendBreak: (minutes) =>
        set((s) => ({ breakEndsAt: Math.max(Date.now(), s.breakEndsAt ?? Date.now()) + minutesToMs(minutes) })),

      dismiss: () => set({ rolling: false, current: null, breakEndsAt: null }),

      addVideo: (url, title) => {
        const id = parseYouTubeId(url);
        if (!id) return false;
        set((s) => {
          if (s.customVideos.some((v) => v.id === id)) return s;
          return {
            customVideos: [...s.customVideos, { id, title: title?.trim() || "One you picked", minutes: 5, custom: true }],
            hiddenVideoIds: s.hiddenVideoIds.filter((h) => h !== id),
          };
        });
        return true;
      },
      removeVideo: (id) =>
        set((s) => ({
          customVideos: s.customVideos.filter((v) => v.id !== id),
          hiddenVideoIds: CURATED_VIDEOS.some((v) => v.id === id) && !s.hiddenVideoIds.includes(id) ? [...s.hiddenVideoIds, id] : s.hiddenVideoIds,
        })),

      videoPool: () => {
        const s = get();
        return [...CURATED_VIDEOS.filter((v) => !s.hiddenVideoIds.includes(v.id)), ...s.customVideos];
      },
    }),
    {
      name: "reward-store",
      storage: localFirstStorage(),
      skipHydration: true,
      partialize: (s) => ({
        enabled: s.enabled,
        allowVideos: s.allowVideos,
        hiddenVideoIds: s.hiddenVideoIds,
        customVideos: s.customVideos,
        current: s.current,
        breakEndsAt: s.breakEndsAt,
        claimed: s.claimed,
      }),
    },
  ),
);
