import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localFirstStorage } from "./storage";
import { makeId } from "@/lib/id";
import type { PodSnapshot } from "@/lib/pods/server";

const ADJECTIVES = ["Quiet", "Steady", "Patient", "Soft", "Slow", "Calm", "Warm", "Gentle", "Early", "Late"];
const NOUNS = ["Heron", "Fern", "Moss", "Otter", "Pebble", "Cedar", "Lantern", "Sparrow", "Kettle", "Harbour"];

function randomName() {
  return `${ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)]} ${NOUNS[Math.floor(Math.random() * NOUNS.length)]}`;
}

export interface PodState {
  /** Anonymous, device-local identity. Never tied to anything else. */
  memberId: string;
  name: string;
  hue: number;
  /** Pod you're currently in (persisted so a reload rejoins the same sprint). */
  podId: string | null;
  snapshot: PodSnapshot | null;
  /** Pods completed with at least one other person present. Only goes up. */
  sprintsTogether: number;

  setName: (name: string) => void;
  setSnapshot: (s: PodSnapshot | null) => void;
  setPodId: (id: string | null) => void;
  recordSprint: () => void;
}

export const usePodStore = create<PodState>()(
  persist(
    (set) => ({
      memberId: makeId(),
      name: randomName(),
      hue: Math.floor(Math.random() * 360),
      podId: null,
      snapshot: null,
      sprintsTogether: 0,

      setName: (name) => set({ name: name.trim().slice(0, 24) || randomName() }),
      setSnapshot: (snapshot) => set({ snapshot }),
      setPodId: (podId) => set({ podId }),
      recordSprint: () => set((s) => ({ sprintsTogether: s.sprintsTogether + 1 })),
    }),
    {
      name: "pod-store",
      storage: localFirstStorage(),
      skipHydration: true,
      partialize: (s) => ({ memberId: s.memberId, name: s.name, hue: s.hue, podId: s.podId, sprintsTogether: s.sprintsTogether }),
    },
  ),
);
