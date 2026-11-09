"use client";

import { Check, ParkingSquare } from "lucide-react";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";
import { useFocusStore } from "@/store/useFocusStore";
import { selectParked, useParkingLotStore } from "@/store/useParkingLotStore";

const CONFIRM_MS = 1600;

/**
 * Floating capture bar, visible only while a focus block is running or paused.
 *
 * CBT "distractibility delay": the intrusive thought gets written down (so the brain
 * can let go of it) and attention is handed straight back to the task. After saving,
 * the input blurs on purpose — the bar should not become the new focus.
 *
 * Keyboard: press "/" anywhere to jump into the bar. Esc blurs it.
 */
export function DistractionParkingLot() {
  const status = useFocusStore((s) => s.status);
  const park = useParkingLotStore((s) => s.park);
  const parkedCount = useParkingLotStore((s) => selectParked(s).length);

  const inputRef = useRef<HTMLInputElement>(null);
  const [text, setText] = useState("");
  const [justParked, setJustParked] = useState(false);

  const studioFs = useSyncExternalStore(
    (onChange) => {
      document.addEventListener("fullscreenchange", onChange);
      document.addEventListener("webkitfullscreenchange", onChange);
      return () => {
        document.removeEventListener("fullscreenchange", onChange);
        document.removeEventListener("webkitfullscreenchange", onChange);
      };
    },
    () => {
      const el = document.fullscreenElement ?? (document as Document & { webkitFullscreenElement?: Element | null }).webkitFullscreenElement;
      return Boolean(el?.hasAttribute("data-study-studio"));
    },
    () => false,
  );
  const inFocus = status === "running" || status === "paused";

  // "/" hotkey — only when the user is not already typing somewhere.
  useEffect(() => {
    if (!inFocus) return;
    const onKey = (e: globalThis.KeyboardEvent) => {
      if (e.key !== "/" || e.metaKey || e.ctrlKey || e.altKey) return;
      const target = e.target as HTMLElement | null;
      const typing =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target?.isContentEditable;
      if (typing) return;
      e.preventDefault();
      inputRef.current?.focus();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [inFocus]);

  // Brief, quiet confirmation that fades on its own.
  useEffect(() => {
    if (!justParked) return;
    const id = window.setTimeout(() => setJustParked(false), CONFIRM_MS);
    return () => window.clearTimeout(id);
  }, [justParked]);

  if (!inFocus || studioFs) return null;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    park(text);
    setText("");
    setJustParked(true);
    // Hand attention back to the task.
    inputRef.current?.blur();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Escape") inputRef.current?.blur();
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-0 z-40 flex justify-center px-4 pb-[calc(6.75rem+env(safe-area-inset-bottom))] md:pb-[max(1.25rem,env(safe-area-inset-bottom))]">
      <form
        onSubmit={submit}
        className="pointer-events-auto flex w-full max-w-xl items-center gap-2 rounded-2xl border border-border bg-surface-raised/95 p-2 pl-3 shadow-soft backdrop-blur"
        aria-label="Distraction parking lot"
      >
        <ParkingSquare className="size-5 shrink-0 text-mist-500" aria-hidden="true" />

        <label htmlFor="parking-lot-input" className="sr-only">
          Park a distracting thought for later
        </label>
        <input
          id="parking-lot-input"
          ref={inputRef}
          type="text"
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
          autoComplete="off"
          enterKeyHint="done"
          placeholder="Random thought? Park it here, deal with it later."
          className="min-w-0 flex-1 bg-transparent py-2 text-base text-ink placeholder:text-ink-faint focus:outline-none"
        />

        <span
          className={`hidden shrink-0 items-center gap-1 text-sm text-accent transition-opacity duration-300 sm:flex ${
            justParked ? "opacity-100" : "opacity-0"
          }`}
          aria-hidden={!justParked}
        >
          <Check className="size-4" aria-hidden="true" />
          Parked
        </span>

        <kbd
          className="hidden shrink-0 rounded-md border border-border bg-surface-sunken px-1.5 py-0.5 font-mono text-xs text-ink-faint sm:inline-block"
          title='Press "/" to jump here'
        >
          /
        </kbd>

        {parkedCount > 0 ? (
          <span
            className="shrink-0 rounded-full bg-mist-100 px-2.5 py-0.5 text-sm tabular-nums text-mist-700 dark:bg-mist-800 dark:text-mist-200"
            aria-label={`${parkedCount} thought${parkedCount === 1 ? "" : "s"} parked`}
          >
            {parkedCount}
          </span>
        ) : null}

        <div className="sr-only" aria-live="polite">
          {justParked ? "Parked. Back to it." : ""}
        </div>
      </form>
    </div>
  );
}
