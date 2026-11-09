"use client";

import { Plus } from "lucide-react";
import { useRef, useState, type FormEvent } from "react";
import { useTaskStore, type Energy } from "@/store/useTaskStore";
import { toast } from "@/components/ui/Toast";

const ENERGY: Array<{ value: Energy; label: string }> = [
  { value: "low", label: "Low energy" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "Needs focus" },
];

/** One field. Type, Enter, done. Energy tag is optional and one tap. */
export function TaskCapture({ autoFocus = false }: { autoFocus?: boolean }) {
  const add = useTaskStore((s) => s.add);
  const [text, setText] = useState("");
  const [energy, setEnergy] = useState<Energy | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const task = add(text, { energy });
    if (!task) return;
    setText("");
    setEnergy(null);
    toast("Added. One less thing to hold in your head.");
    inputRef.current?.focus();
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="flex items-center gap-2 rounded-xl border border-border bg-surface-raised p-2 pl-4 shadow-soft focus-within:border-ring">
        <label htmlFor="task-capture" className="sr-only">
          Add a task
        </label>
        <input
          id="task-capture"
          ref={inputRef}
          autoFocus={autoFocus}
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="What's on your mind? Anything counts."
          autoComplete="off"
          enterKeyHint="done"
          className="min-w-0 flex-1 bg-transparent py-2 text-lg text-ink placeholder:text-ink-faint focus:outline-none"
        />
        <button
          type="submit"
          disabled={!text.trim()}
          className="btn-tactile inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-accent text-accent-ink shadow-soft hover:opacity-90 disabled:opacity-40"
          aria-label="Add task"
        >
          <Plus className="size-5" />
        </button>
      </div>

      {text.trim() ? (
        <div className="rise-in flex flex-wrap items-center gap-2 px-1 text-sm">
          <span className="text-ink-faint">Energy it needs (optional):</span>
          {ENERGY.map((e) => (
            <button
              key={e.value}
              type="button"
              onClick={() => setEnergy(energy === e.value ? null : e.value)}
              aria-pressed={energy === e.value}
              className={`rounded-full border px-3 py-1 transition-colors ${
                energy === e.value
                  ? "border-accent bg-accent-soft text-ink"
                  : "border-border text-ink-muted hover:text-ink"
              }`}
            >
              {e.label}
            </button>
          ))}
        </div>
      ) : null}
    </form>
  );
}
