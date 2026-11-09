import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localFirstStorage } from "./storage";
import { makeId } from "@/lib/id";
import { dayKey, minutesToMs } from "@/lib/time";
import { useCompanionStore } from "./useCompanionStore";
import { useTaskStore } from "./useTaskStore";

export type FocusPreset = 5 | 10 | 15 | 25;
export const FLOW_PRESETS: FocusPreset[] = [10, 15, 25];
export const INITIATION_PRESET: FocusPreset = 5;

export type FocusStatus = "idle" | "running" | "paused" | "complete";

export interface FocusState {
  status: FocusStatus;
  /** Identifies one continuous block (survives "keep going" extensions). */
  blockId: string | null;
  /** The preset the user last chose for flow blocks (10/15/25). */
  flowPreset: FocusPreset;
  /** Total length of the current block, including any extensions. */
  durationMs: number;
  /** Absolute end time while running. Lets the timer survive tab switches and reloads. */
  endsAt: number | null;
  /** Authoritative remaining time while paused / idle / complete. */
  remainingMs: number;
  soundEnabled: boolean;
  /** Focus ms per local day. Positive-only; missing days are simply absent, never "broken". */
  history: Record<string, number>;
  /** Number of blocks started, ever. Used for the companion's growth, never for streaks. */
  blocksStarted: number;

  start: (minutes: FocusPreset) => void;
  /** Start a block of arbitrary length — used to sync with a Focus Pod's shared end time. */
  startFor: (ms: number) => void;
  pause: () => void;
  resume: () => void;
  /** Ends the block early. Phrased as "done for now" in the UI; never a failure. */
  stop: () => void;
  /** "Keep going": adds time to a completed or running block without resetting. */
  extend: (minutes: number) => void;
  /** Called by the ticking component; flips to complete when time runs out. */
  tick: (now: number) => void;
  setFlowPreset: (minutes: FocusPreset) => void;
  toggleSound: () => void;

  /** Open-ended count-up flow (ZenFlowTracker). Absolute start so it survives reloads. */
  flowStartedAt: number | null;
  startFlow: () => void;
  /** Ends the flow and credits whatever was achieved. Returns the captured ms. */
  captureFlow: () => number;
}

/** Derive remaining time from state. Pure, so it can be used in render and in tick(). */
export function getRemainingMs(
  state: Pick<FocusState, "status" | "endsAt" | "remainingMs">,
  now: number = Date.now(),
): number {
  if (state.status === "running" && state.endsAt !== null) {
    return Math.max(0, state.endsAt - now);
  }
  return Math.max(0, state.remainingMs);
}

export const useFocusStore = create<FocusState>()(
  persist(
    (set, get) => ({
      status: "idle",
      blockId: null,
      flowPreset: 15,
      durationMs: minutesToMs(15),
      endsAt: null,
      remainingMs: minutesToMs(15),
      soundEnabled: true,
      history: {},
      blocksStarted: 0,

      start: (minutes) => {
        const ms = minutesToMs(minutes);
        set((s) => ({
          status: "running",
          blockId: makeId(),
          durationMs: ms,
          remainingMs: ms,
          endsAt: Date.now() + ms,
          blocksStarted: s.blocksStarted + 1,
        }));
      },

      startFor: (ms) => {
        const safe = Math.max(60_000, Math.round(ms));
        set((s) => ({
          status: "running",
          blockId: makeId(),
          durationMs: safe,
          remainingMs: safe,
          endsAt: Date.now() + safe,
          blocksStarted: s.blocksStarted + 1,
        }));
      },

      pause: () => {
        const s = get();
        if (s.status !== "running") return;
        set({ status: "paused", remainingMs: getRemainingMs(s), endsAt: null });
      },

      resume: () => {
        const s = get();
        if (s.status !== "paused") return;
        set({ status: "running", endsAt: Date.now() + s.remainingMs });
      },

      stop: () => {
        const s = get();
        const elapsed = s.status === "complete" ? 0 : s.durationMs - getRemainingMs(s);
        credit(elapsed);
        set({
          status: "idle",
          blockId: null,
          endsAt: null,
          durationMs: minutesToMs(s.flowPreset),
          remainingMs: minutesToMs(s.flowPreset),
          history: addToHistory(s.history, elapsed),
        });
      },

      extend: (minutes) => {
        const s = get();
        const extra = minutesToMs(minutes);
        if (s.status === "complete") {
          // Roll straight into the extension; the finished block was credited in tick().
          set({ status: "running", durationMs: extra, remainingMs: extra, endsAt: Date.now() + extra });
          return;
        }
        if (s.status === "running" && s.endsAt !== null) {
          set({ durationMs: s.durationMs + extra, endsAt: s.endsAt + extra });
          return;
        }
        if (s.status === "paused") {
          set({ durationMs: s.durationMs + extra, remainingMs: s.remainingMs + extra });
        }
      },

      tick: (now) => {
        const s = get();
        if (s.status !== "running" || s.endsAt === null) return;
        if (now >= s.endsAt) {
          credit(s.durationMs);
          set({ status: "complete", remainingMs: 0, endsAt: null, history: addToHistory(s.history, s.durationMs) });
        }
      },

      setFlowPreset: (minutes) => {
        const s = get();
        const ms = minutesToMs(minutes);
        // Only reshape the idle timer; never interrupt a running block.
        if (s.status === "idle") set({ flowPreset: minutes, durationMs: ms, remainingMs: ms });
        else set({ flowPreset: minutes });
      },

      toggleSound: () => set((s) => ({ soundEnabled: !s.soundEnabled })),

      flowStartedAt: null,
      startFlow: () => {
        const s = get();
        if (s.flowStartedAt !== null || s.status === "running" || s.status === "paused") return;
        set({ flowStartedAt: Date.now(), blocksStarted: s.blocksStarted + 1 });
      },
      captureFlow: () => {
        const s = get();
        if (s.flowStartedAt === null) return 0;
        const ms = Math.max(0, Date.now() - s.flowStartedAt);
        credit(ms);
        set({ flowStartedAt: null, history: addToHistory(s.history, ms) });
        return ms;
      },
    }),
    {
      name: "focus-store",
      version: 2,
      storage: localFirstStorage(),
      skipHydration: true,
      migrate: (persisted, version) => {
        const p = (persisted ?? {}) as Partial<FocusState> & { focusedMsToday?: number; todayKey?: string };
        if (version < 2) {
          // v1 kept a single "today" tally; fold it into the history map.
          const history: Record<string, number> = {};
          if (p.todayKey && p.focusedMsToday) history[p.todayKey] = p.focusedMsToday;
          return { ...p, history, blocksStarted: p.blocksStarted ?? 0, blockId: null } as FocusState;
        }
        return p as FocusState;
      },
    },
  ),
);

function addToHistory(history: Record<string, number>, ms: number): Record<string, number> {
  if (ms <= 0) return history;
  const key = dayKey();
  return { ...history, [key]: (history[key] ?? 0) + ms };
}

/** Side effects of finished focus time: the active task and the companion both benefit. */
function credit(ms: number) {
  if (ms <= 0) return;
  const tasks = useTaskStore.getState();
  if (tasks.activeTaskId) tasks.logFocusTime(tasks.activeTaskId, ms);
  useCompanionStore.getState().feed(ms);
}