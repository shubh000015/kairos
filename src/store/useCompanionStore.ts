import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localFirstStorage } from "./storage";
import { DAY_MS, HOUR_MS, MINUTE_MS } from "@/lib/time";

export type CompanionHue = "sage" | "mist" | "clay";

export interface CompanionState {
  name: string;
  hue: CompanionHue;
  /** Every minute of focus feeds the companion. It only ever grows. */
  totalFedMs: number;
  lastFedAt: number | null;
  adoptedAt: number | null;

  feed: (ms: number) => void;
  rename: (name: string) => void;
  setHue: (hue: CompanionHue) => void;
  adopt: () => void;
}

export const useCompanionStore = create<CompanionState>()(
  persist(
    (set) => ({
      name: "Fern",
      hue: "sage",
      totalFedMs: 0,
      lastFedAt: null,
      adoptedAt: null,

      feed: (ms) => {
        if (ms <= 0) return;
        set((s) => ({ totalFedMs: s.totalFedMs + ms, lastFedAt: Date.now(), adoptedAt: s.adoptedAt ?? Date.now() }));
      },
      rename: (name) => set({ name: name.trim().slice(0, 24) || "Fern" }),
      setHue: (hue) => set({ hue }),
      adopt: () => set((s) => ({ adoptedAt: s.adoptedAt ?? Date.now() })),
    }),
    {
      name: "companion-store",
      storage: localFirstStorage(),
      skipHydration: true,
    },
  ),
);

/* ---------- derived, pure ---------- */

export interface Stage {
  index: number;
  name: string;
  /** Total focus needed to reach this stage. */
  atMs: number;
  blurb: string;
}

export const STAGES: Stage[] = [
  { index: 0, name: "Seed", atMs: 0, blurb: "Everything starts somewhere small." },
  { index: 1, name: "Sprout", atMs: 30 * MINUTE_MS, blurb: "First leaves. You showed up." },
  { index: 2, name: "Leafy", atMs: 2 * HOUR_MS, blurb: "Getting bushy. Steady does it." },
  { index: 3, name: "Budding", atMs: 6 * HOUR_MS, blurb: "Something is about to open." },
  { index: 4, name: "Blooming", atMs: 15 * HOUR_MS, blurb: "Look at that. Quiet work, loud results." },
  { index: 5, name: "Grove", atMs: 40 * HOUR_MS, blurb: "A whole little ecosystem of focus." },
];

export function stageFor(totalMs: number): Stage {
  let current = STAGES[0];
  for (const s of STAGES) if (totalMs >= s.atMs) current = s;
  return current;
}

export function nextStageFor(totalMs: number): Stage | null {
  return STAGES.find((s) => s.atMs > totalMs) ?? null;
}

export type Mood = "cozy" | "awake" | "resting";

/**
 * Mood is never negative. A companion you haven't fed in a while is simply
 * resting — it does not wilt, starve, or guilt you.
 */
export function moodFor(lastFedAt: number | null, now: number): Mood {
  if (lastFedAt === null) return "awake";
  const since = now - lastFedAt;
  if (since < 12 * HOUR_MS) return "cozy";
  if (since < 2 * DAY_MS) return "awake";
  return "resting";
}

export const MOOD_LINES: Record<Mood, string[]> = {
  cozy: ["Warm from today's focus.", "Content. Nicely done.", "Soaking up the good work."],
  awake: ["Here whenever you are.", "No rush. Ready when you are.", "Quietly keeping you company."],
  resting: ["Having a little rest. Welcome back.", "Napping, not judging.", "Still here. Still yours."],
};
