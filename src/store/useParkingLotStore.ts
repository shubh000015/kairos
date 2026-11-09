import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localFirstStorage } from "./storage";

export type ParkedStatus = "parked" | "done" | "promoted";

export interface ParkedThought {
  id: string;
  text: string;
  createdAt: number;
  status: ParkedStatus;
}

export interface ParkingLotState {
  thoughts: ParkedThought[];
  /** Capture an intrusive thought and get straight back to the task. */
  park: (text: string) => void;
  /** Handled it, nothing more to do. */
  markDone: (id: string) => void;
  /** "Let it go" — it wasn't important after all. No confirmation dialog, no guilt. */
  release: (id: string) => void;
  /** Marks a thought as turned into a task. The task store (step 3) consumes this. */
  promote: (id: string) => void;
  /** Removes everything that is done or promoted. */
  clearHandled: () => void;
}

function makeId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) return crypto.randomUUID();
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useParkingLotStore = create<ParkingLotState>()(
  persist(
    (set) => ({
      thoughts: [],

      park: (text) => {
        const trimmed = text.trim();
        if (!trimmed) return;
        set((s) => ({
          thoughts: [
            { id: makeId(), text: trimmed, createdAt: Date.now(), status: "parked" },
            ...s.thoughts,
          ],
        }));
      },

      markDone: (id) =>
        set((s) => ({
          thoughts: s.thoughts.map((t) => (t.id === id ? { ...t, status: "done" } : t)),
        })),

      release: (id) => set((s) => ({ thoughts: s.thoughts.filter((t) => t.id !== id) })),

      promote: (id) =>
        set((s) => ({
          thoughts: s.thoughts.map((t) => (t.id === id ? { ...t, status: "promoted" } : t)),
        })),

      clearHandled: () =>
        set((s) => ({ thoughts: s.thoughts.filter((t) => t.status === "parked") })),
    }),
    {
      name: "parking-lot-store",
      storage: localFirstStorage(),
      skipHydration: true,
    },
  ),
);

/** Selector: only thoughts still waiting for attention. */
export const selectParked = (s: ParkingLotState) =>
  s.thoughts.filter((t) => t.status === "parked");
