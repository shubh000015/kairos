"use client";

import { ArrowRight, Check, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useFocusStore } from "@/store/useFocusStore";
import { selectParked, useParkingLotStore } from "@/store/useParkingLotStore";

/**
 * Where parked thoughts resurface — only outside of focus, and collapsed by default
 * so the list never competes with starting the next block.
 */
export function ParkedThoughts() {
  const status = useFocusStore((s) => s.status);
  // selectParked returns a new array each call; useShallow compares contents.
  const parked = useParkingLotStore(useShallow(selectParked));
  const markDone = useParkingLotStore((s) => s.markDone);
  const release = useParkingLotStore((s) => s.release);
  const promote = useParkingLotStore((s) => s.promote);
  const [open, setOpen] = useState(false);

  const inFocus = status === "running" || status === "paused";
  if (inFocus || parked.length === 0) return null;

  return (
    <section
      className="w-full max-w-xl rounded-2xl border border-border bg-surface-raised shadow-soft"
      aria-labelledby="parked-heading"
    >
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls="parked-list"
        className="flex w-full items-center justify-between gap-3 rounded-2xl px-5 py-4 text-left hover:bg-surface-sunken"
      >
        <span id="parked-heading" className="text-ink">
          You parked {parked.length} thought{parked.length === 1 ? "" : "s"}.{" "}
          <span className="text-ink-muted">Want a look?</span>
        </span>
        <ChevronDown
          className={`size-5 shrink-0 text-ink-faint transition-transform ${open ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {open ? (
        <ul id="parked-list" className="divide-y divide-border border-t border-border">
          {parked.map((t) => (
            <li key={t.id} className="flex items-center gap-3 px-5 py-3">
              <span className="min-w-0 flex-1 break-words text-ink">{t.text}</span>
              <div className="flex shrink-0 items-center gap-1">
                <IconButton label="Make it a task" onClick={() => promote(t.id)}>
                  <ArrowRight className="size-4" aria-hidden="true" />
                </IconButton>
                <IconButton label="Done" onClick={() => markDone(t.id)}>
                  <Check className="size-4" aria-hidden="true" />
                </IconButton>
                <IconButton label="Let it go" onClick={() => release(t.id)}>
                  <X className="size-4" aria-hidden="true" />
                </IconButton>
              </div>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function IconButton({
  label,
  onClick,
  children,
}: {
  label: string;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      title={label}
      className="rounded-lg p-2 text-ink-faint hover:bg-surface-sunken hover:text-ink"
    >
      {children}
    </button>
  );
}
