"use client";

import { Archive, Battery, BatteryLow, BatteryMedium, BrainCircuit, ChevronDown, Inbox, RotateCcw, Sparkles } from "lucide-react";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { selectParked, useParkingLotStore } from "@/store/useParkingLotStore";
import { selectArchivedTasks, selectDoneTasks, selectOpenTasks, useTaskStore, type Energy } from "@/store/useTaskStore";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Misc";
import { toast } from "@/components/ui/Toast";
import { FreshStart } from "./FreshStart";
import { TaskCapture } from "./TaskCapture";
import { TaskItem } from "./TaskItem";

type Filter = "all" | Energy;

const FILTERS: Array<{ value: Filter; label: string; icon: React.ReactNode }> = [
  { value: "all", label: "Everything", icon: <Sparkles className="size-4" /> },
  { value: "low", label: "Low energy", icon: <BatteryLow className="size-4" /> },
  { value: "medium", label: "Medium", icon: <BatteryMedium className="size-4" /> },
  { value: "high", label: "Needs focus", icon: <Battery className="size-4" /> },
];

export function TaskList() {
  const open = useTaskStore(useShallow(selectOpenTasks));
  const done = useTaskStore(useShallow(selectDoneTasks));
  const archived = useTaskStore(useShallow(selectArchivedTasks));
  const addMany = useTaskStore((s) => s.addMany);
  const add = useTaskStore((s) => s.add);
  const restore = useTaskStore((s) => s.restore);

  const parked = useParkingLotStore(useShallow(selectParked));
  const promote = useParkingLotStore((s) => s.promote);

  const [filter, setFilter] = useState<Filter>("all");
  const [showDone, setShowDone] = useState(false);
  const [showArchive, setShowArchive] = useState(false);
  const [dumpOpen, setDumpOpen] = useState(false);
  const [dump, setDump] = useState("");

  // Untagged tasks stay visible under every filter — a missing tag shouldn't hide work.
  const visible = filter === "all" ? open : open.filter((t) => t.energy === filter || t.energy === null);

  const submitDump = () => {
    const lines = dump.split(/\r?\n/).map((l) => l.replace(/^[-*•\d.)\s]+/, "").trim()).filter(Boolean);
    if (!lines.length) return;
    addMany(lines);
    setDump("");
    setDumpOpen(false);
    toast(`${lines.length} thing${lines.length === 1 ? "" : "s"} out of your head and onto the list.`);
  };

  const promoteThought = (id: string, text: string) => {
    add(text, { source: "parking-lot" });
    promote(id);
    toast("Made it a task.");
  };

  return (
    <div className="flex flex-col gap-6">
      <TaskCapture />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <span className="text-ink-faint">How&apos;s your energy?</span>
          <div role="radiogroup" aria-label="Filter by energy" className="inline-flex flex-wrap rounded-xl border border-border bg-surface-sunken p-1">
            {FILTERS.map((f) => (
              <button
                key={f.value}
                type="button"
                role="radio"
                aria-checked={filter === f.value}
                onClick={() => setFilter(f.value)}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm transition-colors ${
                  filter === f.value ? "bg-surface-raised text-ink shadow-soft" : "text-ink-muted hover:text-ink"
                }`}
              >
                {f.icon}
                {f.label}
              </button>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="sm" onClick={() => setDumpOpen((o) => !o)} aria-expanded={dumpOpen}>
            <BrainCircuit className="size-4" /> Brain dump
          </Button>
          <FreshStart />
        </div>
      </div>

      {dumpOpen ? (
        <div className="rise-in rounded-2xl border border-border bg-surface-raised p-4 shadow-soft">
          <p className="mb-2 text-sm text-ink-muted">
            Empty your head. One thing per line, no order, no judgement. We&apos;ll sort it later.
          </p>
          <Textarea value={dump} onChange={(e) => setDump(e.target.value)} placeholder={"email prof about extension\nchapter 4 notes\nbuy printer ink"} rows={5} aria-label="Brain dump" />
          <div className="mt-3 flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setDumpOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" onClick={submitDump} disabled={!dump.trim()}>
              Turn into tasks
            </Button>
          </div>
        </div>
      ) : null}

      {parked.length > 0 ? (
        <div className="rounded-2xl border border-dashed border-border p-4">
          <p className="mb-2 text-sm text-ink-muted">Thoughts you parked during focus — want any of them as tasks?</p>
          <ul className="flex flex-wrap gap-2">
            {parked.map((p) => (
              <li key={p.id}>
                <button type="button" onClick={() => promoteThought(p.id, p.text)} className="rounded-full border border-border bg-surface-raised px-3 py-1 text-sm text-ink hover:border-accent">
                  + {p.text}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          icon={<Inbox className="size-8" />}
          title={open.length === 0 ? "Nothing on the list. That's allowed." : "Nothing matches that energy level."}
          body={open.length === 0 ? "Add one small thing above. It doesn't have to be the important one." : "Try another filter, or add something that fits how you feel right now."}
        />
      ) : (
        <ul className="flex flex-col gap-3">
          {visible.map((t) => (
            <TaskItem key={t.id} task={t} />
          ))}
        </ul>
      )}

      {done.length > 0 ? (
        <section>
          <button type="button" onClick={() => setShowDone((s) => !s)} aria-expanded={showDone} className="flex items-center gap-2 text-sm text-ink-muted hover:text-ink">
            <ChevronDown className={`size-4 transition-transform ${showDone ? "rotate-180" : ""}`} />
            Done ({done.length})
          </button>
          {showDone ? (
            <ul className="mt-3 flex flex-col gap-2 opacity-80">
              {done.map((t) => (
                <TaskItem key={t.id} task={t} />
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}

      {archived.length > 0 ? (
        <section>
          <button type="button" onClick={() => setShowArchive((s) => !s)} aria-expanded={showArchive} className="flex items-center gap-2 text-sm text-ink-faint hover:text-ink">
            <Archive className="size-4" />
            Archived from earlier weeks ({archived.length})
          </button>
          {showArchive ? (
            <ul className="mt-3 flex flex-col gap-1.5 text-sm">
              {archived.map((t) => (
                <li key={t.id} className="flex items-center justify-between gap-3 rounded-xl px-3 py-2 text-ink-muted hover:bg-surface-sunken">
                  <span className={t.done ? "line-through" : ""}>{t.title}</span>
                  {!t.done ? (
                    <button type="button" onClick={() => restore(t.id)} className="inline-flex items-center gap-1 text-xs hover:text-ink">
                      <RotateCcw className="size-3.5" /> bring back
                    </button>
                  ) : null}
                </li>
              ))}
            </ul>
          ) : null}
        </section>
      ) : null}
    </div>
  );
}
