"use client";

import { Anchor as AnchorIcon, Circle, CircleCheck, Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNow } from "@/hooks/useNow";
import { dayKey } from "@/lib/time";
import { useRoutineStore } from "@/store/useRoutineStore";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";

/**
 * Daily anchors reset at midnight and keep no history. Whatever happened
 * yesterday is not on this screen — only what might help today.
 */
export function DailyAnchors() {
  const anchors = useRoutineStore((s) => s.anchors);
  const checkedMap = useRoutineStore((s) => s.checked);
  const toggleAnchor = useRoutineStore((s) => s.toggleAnchor);
  const addAnchor = useRoutineStore((s) => s.addAnchor);
  const removeAnchor = useRoutineStore((s) => s.removeAnchor);
  const now = useNow(60_000);
  const [draft, setDraft] = useState("");

  const today = now === null ? null : dayKey(new Date(now));
  const checked = new Set(today ? (checkedMap[today] ?? []) : []);
  const doneCount = anchors.filter((a) => checked.has(a.id)).length;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    addAnchor(draft);
    setDraft("");
  };

  return (
    <Card>
      <CardHeader
        icon={<AnchorIcon className="size-5" />}
        title="Today's anchors"
        description={doneCount === 0 ? "Small things that make the day go better. No streaks, nothing carries over." : `${doneCount} of ${anchors.length} today. Each one is a win on its own.`}
      />
      <CardBody className="pt-3">
        <ul className="divide-y divide-border">
          {anchors.map((a) => {
            const on = checked.has(a.id);
            return (
              <li key={a.id} className="group flex items-center gap-3 py-2.5">
                <button type="button" onClick={() => today && toggleAnchor(today, a.id)} disabled={!today} aria-pressed={on} className="flex min-w-0 flex-1 items-center gap-3 text-left">
                  {on ? <CircleCheck className="size-5 shrink-0 text-accent" /> : <Circle className="size-5 shrink-0 text-ink-faint" />}
                  <span className="text-lg leading-none" aria-hidden="true">{a.emoji}</span>
                  <span className={`truncate ${on ? "text-ink-faint line-through" : "text-ink"}`}>{a.text}</span>
                </button>
                <button type="button" onClick={() => removeAnchor(a.id)} aria-label={`Remove ${a.text}`} className="text-ink-faint opacity-0 hover:text-ink group-hover:opacity-100 focus:opacity-100">
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>
        <form onSubmit={submit} className="mt-3 flex items-center gap-2 rounded-xl border border-dashed border-border px-3 py-2">
          <Plus className="size-4 text-ink-faint" aria-hidden="true" />
          <input value={draft} onChange={(e) => setDraft(e.target.value)} placeholder="Add an anchor" aria-label="Add an anchor" className="min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-ink-faint focus:outline-none" />
        </form>
      </CardBody>
    </Card>
  );
}
