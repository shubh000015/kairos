import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localFirstStorage } from "./storage";
import { makeId } from "@/lib/id";

export type Energy = "low" | "medium" | "high";
export type TaskSource = "capture" | "parking-lot" | "brain-dump" | "study";

export interface Step {
  id: string;
  text: string;
  done: boolean;
}

export interface Task {
  id: string;
  title: string;
  steps: Step[];
  done: boolean;
  createdAt: number;
  completedAt: number | null;
  /** How much energy this needs — lets a tired brain filter to "low" tasks. */
  energy: Energy | null;
  /** The user's guess, used (gently) for time-estimation calibration. */
  estimateMin: number | null;
  /** Focus time actually logged against this task. */
  actualMs: number;
  source: TaskSource;
  /** Set by Fresh Start; archived tasks are hidden but never deleted. */
  archivedAt: number | null;
  /** Optional link to a study resource, e.g. a YouTube URL. */
  link: string | null;
}

export interface TaskState {
  tasks: Task[];
  activeTaskId: string | null;
  lastFreshStart: number | null;

  add: (title: string, opts?: Partial<Pick<Task, "energy" | "estimateMin" | "source" | "link" | "steps">>) => Task | null;
  addMany: (titles: string[], source?: TaskSource) => void;
  update: (id: string, patch: Partial<Omit<Task, "id">>) => void;
  remove: (id: string) => void;
  toggleDone: (id: string) => void;
  setSteps: (id: string, steps: string[]) => void;
  addStep: (id: string, text: string) => void;
  toggleStep: (id: string, stepId: string) => void;
  removeStep: (id: string, stepId: string) => void;
  /** Swap one step for several smaller ones, in place. Used by the "stuck" nudge. */
  replaceStep: (id: string, stepId: string, texts: string[]) => void;
  setActive: (id: string | null) => void;
  logFocusTime: (id: string, ms: number) => void;
  /** Weekly reset: archives every open task without judgement. Returns the count. */
  freshStart: () => number;
  restore: (id: string) => void;
}

const newStep = (text: string): Step => ({ id: makeId(), text: text.trim(), done: false });

export const useTaskStore = create<TaskState>()(
  persist(
    (set, get) => ({
      tasks: [],
      activeTaskId: null,
      lastFreshStart: null,

      add: (title, opts = {}) => {
        const clean = title.trim();
        if (!clean) return null;
        const task: Task = {
          id: makeId(),
          title: clean,
          steps: opts.steps ?? [],
          done: false,
          createdAt: Date.now(),
          completedAt: null,
          energy: opts.energy ?? null,
          estimateMin: opts.estimateMin ?? null,
          actualMs: 0,
          source: opts.source ?? "capture",
          archivedAt: null,
          link: opts.link ?? null,
        };
        set((s) => ({ tasks: [task, ...s.tasks] }));
        return task;
      },

      addMany: (titles, source = "brain-dump") => {
        const now = Date.now();
        const fresh = titles
          .map((t) => t.trim())
          .filter(Boolean)
          .map<Task>((title, i) => ({
            id: makeId(),
            title,
            steps: [],
            done: false,
            createdAt: now - i, // keep entry order stable
            completedAt: null,
            energy: null,
            estimateMin: null,
            actualMs: 0,
            source,
            archivedAt: null,
            link: null,
          }));
        if (fresh.length) set((s) => ({ tasks: [...fresh, ...s.tasks] }));
      },

      update: (id, patch) =>
        set((s) => ({ tasks: s.tasks.map((t) => (t.id === id ? { ...t, ...patch } : t)) })),

      remove: (id) =>
        set((s) => ({
          tasks: s.tasks.filter((t) => t.id !== id),
          activeTaskId: s.activeTaskId === id ? null : s.activeTaskId,
        })),

      toggleDone: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id
              ? {
                  ...t,
                  done: !t.done,
                  completedAt: t.done ? null : Date.now(),
                  steps: t.done ? t.steps : t.steps.map((st) => ({ ...st, done: true })),
                }
              : t,
          ),
          activeTaskId: s.activeTaskId === id ? null : s.activeTaskId,
        })),

      setSteps: (id, steps) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, steps: steps.filter((x) => x.trim()).map(newStep) } : t)),
        })),

      addStep: (id, text) => {
        if (!text.trim()) return;
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, steps: [...t.steps, newStep(text)] } : t)),
        }));
      },

      toggleStep: (id, stepId) =>
        set((s) => ({
          tasks: s.tasks.map((t) => {
            if (t.id !== id) return t;
            const steps = t.steps.map((st) => (st.id === stepId ? { ...st, done: !st.done } : st));
            const allDone = steps.length > 0 && steps.every((st) => st.done);
            // Ticking the last step completes the task; un-ticking reopens it.
            return { ...t, steps, done: allDone, completedAt: allDone ? (t.completedAt ?? Date.now()) : null };
          }),
        })),

      removeStep: (id, stepId) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, steps: t.steps.filter((st) => st.id !== stepId) } : t)),
        })),

      replaceStep: (id, stepId, texts) => {
        const clean = texts.map((t) => t.trim()).filter(Boolean);
        if (!clean.length) return;
        set((s) => ({
          tasks: s.tasks.map((t) =>
            t.id === id ? { ...t, steps: t.steps.flatMap((st) => (st.id === stepId ? clean.map(newStep) : [st])) } : t,
          ),
        }));
      },

      setActive: (id) => set({ activeTaskId: id }),

      logFocusTime: (id, ms) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, actualMs: t.actualMs + Math.max(0, ms) } : t)),
        })),

      freshStart: () => {
        const now = Date.now();
        const open = get().tasks.filter((t) => !t.archivedAt);
        set((s) => ({
          tasks: s.tasks.map((t) => (t.archivedAt ? t : { ...t, archivedAt: now })),
          activeTaskId: null,
          lastFreshStart: now,
        }));
        return open.filter((t) => !t.done).length;
      },

      restore: (id) =>
        set((s) => ({
          tasks: s.tasks.map((t) => (t.id === id ? { ...t, archivedAt: null, done: false, completedAt: null } : t)),
        })),
    }),
    {
      name: "task-store",
      storage: localFirstStorage(),
      skipHydration: true,
    },
  ),
);

/* ---------- selectors ---------- */

export const selectOpenTasks = (s: TaskState) => s.tasks.filter((t) => !t.archivedAt && !t.done);
export const selectDoneTasks = (s: TaskState) => s.tasks.filter((t) => !t.archivedAt && t.done);
export const selectArchivedTasks = (s: TaskState) => s.tasks.filter((t) => !!t.archivedAt);
export const selectActiveTask = (s: TaskState) =>
  s.tasks.find((t) => t.id === s.activeTaskId && !t.archivedAt && !t.done) ?? null;

/** The single thing to do right now for a task — hides everything else. */
export function nextStep(task: Task): Step | null {
  return task.steps.find((st) => !st.done) ?? null;
}
