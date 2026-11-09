"use client";

import { Check, ChevronDown, Circle, CircleCheck, Clock, Link2, Loader2, Play, Plus, Sparkles, Trash2 } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { requestBreakdown } from "@/lib/magicBreakdown";
import { formatDuration } from "@/lib/time";
import { nextStep, useTaskStore, type Energy, type Task } from "@/store/useTaskStore";
import { Button, IconButton } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Misc";
import { toast } from "@/components/ui/Toast";
import { SwipeToComplete } from "./SwipeToComplete";

const ENERGY_LABEL: Record<Energy, string> = { low: "Low energy", medium: "Medium", high: "Needs focus" };

export function TaskItem({ task }: { task: Task }) {
  const router = useRouter();
  const toggleDone = useTaskStore((s) => s.toggleDone);
  const toggleStep = useTaskStore((s) => s.toggleStep);
  const setSteps = useTaskStore((s) => s.setSteps);
  const addStep = useTaskStore((s) => s.addStep);
  const removeStep = useTaskStore((s) => s.removeStep);
  const remove = useTaskStore((s) => s.remove);
  const setActive = useTaskStore((s) => s.setActive);
  const update = useTaskStore((s) => s.update);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);

  const [expanded, setExpanded] = useState(false);
  const [busy, setBusy] = useState(false);
  const [newStep, setNewStep] = useState("");
  const [editingEstimate, setEditingEstimate] = useState(false);

  const step = nextStep(task);
  const doneCount = task.steps.filter((s) => s.done).length;
  const isActive = activeTaskId === task.id;

  const magic = async () => {
    setBusy(true);
    try {
      const result = await requestBreakdown(task.title);
      setSteps(task.id, result.steps);
      setExpanded(false);
      toast(result.source === "ai" ? "Broken down. First step is tiny on purpose." : "Broken into small steps.");
    } finally {
      setBusy(false);
    }
  };

  const focusNow = () => {
    setActive(task.id);
    router.push("/app");
  };

  const submitStep = (e: FormEvent) => {
    e.preventDefault();
    addStep(task.id, newStep);
    setNewStep("");
  };

  return (
    <li className="rise-in">
      <SwipeToComplete onComplete={() => toggleDone(task.id)} disabled={task.done}>
        {({ celebrate, completing }) => (
      <div className={`rounded-2xl border bg-surface-raised shadow-soft transition-colors ${isActive ? "border-accent" : "border-border"} ${completing ? "border-accent" : ""}`}>
      <div className="flex items-start gap-3 p-4">
        <button
          type="button"
          onClick={() => (task.done ? toggleDone(task.id) : celebrate())}
          aria-label={task.done ? "Mark not done" : "Mark done"}
          className="mt-0.5 shrink-0 text-ink-faint hover:text-accent"
        >
          {task.done || completing ? <CircleCheck className="size-6 text-accent" /> : <Circle className="size-6" />}
        </button>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className={`text-base leading-snug ${task.done ? "text-ink-faint line-through" : "text-ink"}`}>{task.title}</h3>
            {task.energy ? <Pill tone={task.energy === "low" ? "mist" : task.energy === "high" ? "sage" : "neutral"}>{ENERGY_LABEL[task.energy]}</Pill> : null}
            {isActive ? <Pill tone="sage">Focusing</Pill> : null}
            {task.link ? (
              <a href={task.link} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-xs text-mist-600 hover:underline dark:text-mist-300">
                <Link2 className="size-3" /> link
              </a>
            ) : null}
          </div>

          {/* Only the immediate next step is visible by default. */}
          {!task.done && step ? (
            <div className="mt-2 flex items-start gap-2 rounded-xl bg-accent-soft/60 px-3 py-2">
              <span className="mt-0.5 text-xs font-medium uppercase tracking-wide text-accent">Next</span>
              <p className="flex-1 text-ink">{step.text}</p>
              <button
                type="button"
                onClick={() => toggleStep(task.id, step.id)}
                aria-label="Mark step done"
                className="rounded-md p-1 text-accent hover:bg-accent-soft"
              >
                <Check className="size-4" />
              </button>
            </div>
          ) : null}

          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-ink-faint">
            {task.steps.length > 0 ? (
              <button type="button" onClick={() => setExpanded((e) => !e)} aria-expanded={expanded} className="inline-flex items-center gap-1 hover:text-ink">
                <ChevronDown className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`} />
                {doneCount}/{task.steps.length} steps {expanded ? "· hide" : "· show all"}
              </button>
            ) : null}
            <button type="button" onClick={() => setEditingEstimate((e) => !e)} className="inline-flex items-center gap-1 hover:text-ink">
              <Clock className="size-3.5" />
              {task.estimateMin ? `guess ${task.estimateMin}m` : "add a time guess"}
              {task.actualMs > 0 ? ` · spent ${formatDuration(task.actualMs)}` : ""}
            </button>
            {!task.done ? <span className="hidden text-ink-faint/80 sm:inline">swipe → to finish</span> : null}
          </div>

          {editingEstimate ? (
            <div className="rise-in mt-2 flex flex-wrap items-center gap-2 text-sm">
              <span className="text-ink-muted">How long do you think?</span>
              {[5, 10, 15, 25, 45, 60].map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { update(task.id, { estimateMin: m }); setEditingEstimate(false); }}
                  className={`rounded-full border px-2.5 py-0.5 ${task.estimateMin === m ? "border-accent bg-accent-soft" : "border-border hover:bg-surface-sunken"}`}
                >
                  {m}m
                </button>
              ))}
            </div>
          ) : null}

          {expanded && task.steps.length > 0 ? (
            <ol className="mt-3 space-y-1.5 border-l-2 border-border pl-3">
              {task.steps.map((s) => {
                const isNext = step?.id === s.id && !s.done;
                const later = !s.done && !isNext;
                return (
                <li key={s.id} className={`group flex items-start gap-2 text-sm ${later ? "select-none" : ""}`}>
                  <button type="button" onClick={() => toggleStep(task.id, s.id)} aria-label={s.done ? "Undo step" : "Complete step"} className="mt-0.5 text-ink-faint hover:text-accent">
                    {s.done ? <CircleCheck className="size-4 text-accent" /> : <Circle className="size-4" />}
                  </button>
                  <span className={`flex-1 ${s.done ? "text-ink-faint line-through" : isNext ? "text-ink" : "text-ink-muted"}`} style={later ? { filter: "blur(3px)", opacity: 0.55 } : undefined}>{s.text}</span>
                  <button type="button" onClick={() => removeStep(task.id, s.id)} aria-label="Remove step" className="text-ink-faint opacity-0 hover:text-ink group-hover:opacity-100 focus:opacity-100">
                    <Trash2 className="size-3.5" />
                  </button>
                </li>
                );
              })}
              <li>
                <form onSubmit={submitStep} className="flex items-center gap-2">
                  <Plus className="size-4 text-ink-faint" aria-hidden="true" />
                  <input
                    value={newStep}
                    onChange={(e) => setNewStep(e.target.value)}
                    placeholder="Add a step"
                    aria-label="Add a step"
                    className="min-w-0 flex-1 bg-transparent py-1 text-sm text-ink placeholder:text-ink-faint focus:outline-none"
                  />
                </form>
              </li>
            </ol>
          ) : null}
        </div>

        {!task.done ? (
          <div className="flex shrink-0 flex-col items-end gap-1">
            <Button variant="primary" size="sm" onClick={focusNow} disabled={isActive}>
              <Play className="size-3.5" /> Focus
            </Button>
            <Button variant="ghost" size="sm" onClick={magic} disabled={busy} title="Break this into tiny steps">
              {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Sparkles className="size-3.5" />}
              {task.steps.length ? "Redo" : "Magic Breakdown"}
            </Button>
          </div>
        ) : (
          <IconButton label="Remove task" onClick={() => remove(task.id)}>
            <Trash2 className="size-4" />
          </IconButton>
        )}
      </div>
      </div>
        )}
      </SwipeToComplete>
    </li>
  );
}
