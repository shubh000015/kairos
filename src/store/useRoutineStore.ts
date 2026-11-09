import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localFirstStorage } from "./storage";
import { makeId } from "@/lib/id";

/**
 * Daily anchors: a tiny checklist that resets every day. There is no streak,
 * no history of missed days, and nothing turns red. Yesterday is gone on purpose.
 */
export interface Anchor {
  id: string;
  text: string;
  emoji: string;
}

export type DopamineBucket = "quick" | "reset" | "earned";

export interface DopamineItem {
  id: string;
  text: string;
  bucket: DopamineBucket;
  minutes: number;
}

export interface RoutineState {
  anchors: Anchor[];
  /** Day key -> set of anchor ids checked that day. Only today is ever read. */
  checked: Record<string, string[]>;
  menu: DopamineItem[];

  addAnchor: (text: string, emoji?: string) => void;
  removeAnchor: (id: string) => void;
  toggleAnchor: (dayKey: string, id: string) => void;
  addMenuItem: (text: string, bucket: DopamineBucket, minutes: number) => void;
  removeMenuItem: (id: string) => void;
}

const DEFAULT_ANCHORS: Anchor[] = [
  { id: "a-water", text: "Drink a glass of water", emoji: "💧" },
  { id: "a-meds", text: "Take meds / vitamins (if you take them)", emoji: "💊" },
  { id: "a-food", text: "Eat something real", emoji: "🍎" },
  { id: "a-move", text: "Move your body for 5 minutes", emoji: "🚶" },
  { id: "a-start", text: "Start one small thing", emoji: "🌱" },
];

const DEFAULT_MENU: DopamineItem[] = [
  { id: "d-1", text: "Stretch with arms over your head", bucket: "quick", minutes: 2 },
  { id: "d-2", text: "Drink water while staring out a window", bucket: "quick", minutes: 2 },
  { id: "d-3", text: "One song, full volume, dance optional", bucket: "quick", minutes: 4 },
  { id: "d-4", text: "Step outside and feel the temperature", bucket: "reset", minutes: 7 },
  { id: "d-5", text: "Make tea or coffee, slowly", bucket: "reset", minutes: 10 },
  { id: "d-6", text: "Doodle without a goal", bucket: "reset", minutes: 8 },
  { id: "d-7", text: "An episode of something you love", bucket: "earned", minutes: 25 },
  { id: "d-8", text: "Call or voice-note a friend", bucket: "earned", minutes: 20 },
];

export const useRoutineStore = create<RoutineState>()(
  persist(
    (set) => ({
      anchors: DEFAULT_ANCHORS,
      checked: {},
      menu: DEFAULT_MENU,

      addAnchor: (text, emoji = "•") => {
        if (!text.trim()) return;
        set((s) => ({ anchors: [...s.anchors, { id: makeId(), text: text.trim(), emoji }] }));
      },
      removeAnchor: (id) => set((s) => ({ anchors: s.anchors.filter((a) => a.id !== id) })),
      toggleAnchor: (day, id) =>
        set((s) => {
          const today = new Set(s.checked[day] ?? []);
          if (today.has(id)) today.delete(id);
          else today.add(id);
          // Keep only today's record — older days are intentionally forgotten.
          return { checked: { [day]: [...today] } };
        }),

      addMenuItem: (text, bucket, minutes) => {
        if (!text.trim()) return;
        set((s) => ({ menu: [...s.menu, { id: makeId(), text: text.trim(), bucket, minutes: Math.max(1, minutes) }] }));
      },
      removeMenuItem: (id) => set((s) => ({ menu: s.menu.filter((m) => m.id !== id) })),
    }),
    {
      name: "routine-store",
      storage: localFirstStorage(),
      skipHydration: true,
    },
  ),
);
