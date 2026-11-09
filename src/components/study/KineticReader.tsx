"use client";

import { ArrowDown, Check, Lock, Sparkles, Unlock } from "lucide-react";
import { useEffect, useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from "react";
import { useStuckDetector, type StuckReason } from "@/hooks/useStuckDetector";
import { chunkText, isCloseEnough, makePuzzle, requestPuzzle, type Chunk, type Puzzle } from "@/lib/kinetic";
import { playUnlockTick } from "@/lib/sound";
import { useFocusStore } from "@/store/useFocusStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useStudyStore } from "@/store/useStudyStore";
import { BionicText } from "./BionicText";
import { StuckNudge } from "./StuckNudge";

interface KineticReaderProps {
  text: string;
  fontSize?: number;
  bionic?: boolean;
  /** How many chunks were already unlocked (persisted by the parent). */
  initialUnlocked?: number;
  onProgress?: (unlocked: number, total: number) => void;
  /** Rendered when every chunk is unlocked. */
  finale?: React.ReactNode;
  className?: string;
}

const LOCKED_PREVIEW = 2;

/**
 * Kinetic Reading. The text is shown one ~90-second chunk at a time; the rest is
 * blurred. Clearing a small puzzle about the chunk you just read unblurs the next.
 * Hands move, the screen rewards, attention stays in the loop.
 */
export function KineticReader({ text, fontSize, bionic = false, initialUnlocked = 0, onProgress, finale, className = "" }: KineticReaderProps) {
  const chunks = useMemo(() => chunkText(text), [text]);
  const total = chunks.length;
  const [unlocked, setUnlocked] = useState(() => Math.min(Math.max(0, initialUnlocked), Math.max(0, total - 1)));
  const [cleared, setCleared] = useState(0);
  const recordSpeedbump = useStudyStore((s) => s.recordSpeedbump);
  const soundEnabled = useFocusStore((s) => s.soundEnabled);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const chunkRefs = useRef<Array<HTMLDivElement | null>>([]);
  const articleRef = useRef<HTMLElement>(null);

  // Stuck detection: ten quiet minutes on one section, or a flurry of aimless clicks.
  const [stuck, setStuck] = useState<StuckReason | null>(null);
  const currentChunk = chunks[Math.min(unlocked, Math.max(0, total - 1))];
  useStuckDetector({
    target: articleRef,
    contextKey: `${currentChunk?.id ?? ""}:${text.length}`,
    enabled: total > 0 && unlocked < total - 1,
    onStuck: setStuck,
  });

  // Scroll a freshly unlocked chunk into comfortable view.
  const lastUnlocked = useRef(unlocked);
  useEffect(() => {
    if (unlocked === lastUnlocked.current) return;
    lastUnlocked.current = unlocked;
    const el = chunkRefs.current[unlocked];
    if (el) {
      const id = window.setTimeout(() => el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" }), 60);
      return () => window.clearTimeout(id);
    }
  }, [unlocked, total, reduceMotion]);

  const unlockNext = (solved: boolean) => {
    if (solved) {
      setCleared((c) => c + 1);
      recordSpeedbump();
      if (soundEnabled) playUnlockTick();
    }
    const next = Math.min(total - 1, unlocked + 1);
    setUnlocked(next);
    onProgress?.(next, total);
  };

  if (total === 0) return null;
  const done = unlocked >= total - 1;
  const hiddenCount = Math.max(0, total - 1 - unlocked - LOCKED_PREVIEW);

  return (
    <div className={`flex flex-col gap-2 ${className}`}>
      {/* Progress — counts up only. */}
      <div className="mx-auto flex w-full max-w-2xl items-center gap-3 px-1 text-xs text-ink-faint">
        <span className="tabular-nums">
          Section {unlocked + 1} of {total}
        </span>
        <div className="h-1 flex-1 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuemin={0} aria-valuemax={total} aria-valuenow={unlocked + 1}>
          <div className="h-full rounded-full bg-accent transition-[width] duration-500" style={{ width: `${((unlocked + 1) / total) * 100}%` }} />
        </div>
        {cleared > 0 ? (
          <span className="inline-flex items-center gap-1 tabular-nums">
            <Sparkles className="size-3" aria-hidden="true" /> {cleared} cleared
          </span>
        ) : null}
      </div>

      {currentChunk ? (
        <StuckNudge open={stuck !== null} reason={stuck} variant={{ kind: "reading", text: currentChunk.text }} onClose={() => setStuck(null)} />
      ) : null}

      <article ref={articleRef} className="mx-auto w-full max-w-2xl rounded-2xl border border-border bg-surface-raised px-6 py-8 leading-relaxed text-ink shadow-soft sm:px-10" style={fontSize ? { fontSize } : undefined}>
        {chunks.map((chunk, i) => {
          if (i > unlocked + LOCKED_PREVIEW) return null;
          const locked = i > unlocked;
          const current = i === unlocked;
          return (
            <div key={chunk.id}>
              <div
                ref={(el) => {
                  chunkRefs.current[i] = el;
                }}
                className={`kinetic-chunk scroll-mt-24 ${locked ? "kinetic-locked" : ""} ${i < unlocked ? "kinetic-read" : ""}`}
                aria-hidden={locked || undefined}
              >
                <BionicText text={chunk.text} enabled={bionic && !locked} />
              </div>
              {current && !done ? (
                <Speedbump key={`bump-${chunk.id}`} chunk={chunk} index={i} onCleared={() => unlockNext(true)} onSkip={() => unlockNext(false)} />
              ) : null}
              {!locked && !current ? <hr className="my-6 border-border/70" /> : null}
            </div>
          );
        })}

        {hiddenCount > 0 ? (
          <p className="mt-4 flex items-center justify-center gap-2 text-center text-xs text-ink-faint">
            <Lock className="size-3" aria-hidden="true" /> {hiddenCount} more section{hiddenCount === 1 ? "" : "s"} unlock as you go
          </p>
        ) : null}

        {done ? (
          <div className="rise-in mt-8 rounded-2xl border border-accent/40 bg-accent-soft/50 px-5 py-4 text-center text-sm text-ink">
            <div className="mb-1 inline-flex items-center gap-2 font-medium">
              <Unlock className="size-4" aria-hidden="true" /> That was the whole thing.
            </div>
            <p className="text-ink-muted">
              {total} section{total === 1 ? "" : "s"}
              {cleared ? `, ${cleared} speedbump${cleared === 1 ? "" : "s"} cleared` : ""}. Reading with your hands counts double.
            </p>
            {finale ? <div className="mt-3">{finale}</div> : null}
          </div>
        ) : null}
      </article>
    </div>
  );
}

/* ---------- The speedbump itself ---------- */

interface SpeedbumpProps {
  chunk: Chunk;
  index: number;
  onCleared: () => void;
  onSkip: () => void;
}

function Speedbump({ chunk, index, onCleared, onSkip }: SpeedbumpProps) {
  const [puzzle, setPuzzle] = useState<Puzzle | null>(() => makePuzzle(chunk.text, index));
  const [attempts, setAttempts] = useState(0);
  const [tried, setTried] = useState<string[]>([]);
  const [solved, setSolved] = useState(false);
  const [wiggle, setWiggle] = useState(false);
  const [typed, setTyped] = useState("");
  const [showChoices, setShowChoices] = useState(false);
  const [over, setOver] = useState(false);
  const interacted = useRef(false);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const inputRef = useRef<HTMLInputElement>(null);

  // Try to upgrade the puzzle with the AI route, but never block on it.
  useEffect(() => {
    const controller = new AbortController();
    void requestPuzzle(chunk.text, index, controller.signal).then((p) => {
      if (p && p.source === "ai" && !interacted.current && !controller.signal.aborted) setPuzzle(p);
    });
    return () => controller.abort();
  }, [chunk.text, index]);

  // Advance after a short "it opened" beat. Fired from the event, so it runs exactly once.
  const finish = () => {
    setSolved(true);
    window.setTimeout(onCleared, reduceMotion ? 150 : 700);
  };

  if (!puzzle) {
    // Not enough text for a sensible gap — don't block the reader.
    return (
      <div className="mt-6 flex items-center justify-center">
        <button type="button" onClick={onSkip} className="inline-flex items-center gap-2 rounded-xl border border-border bg-surface px-4 py-2 text-sm text-ink hover:bg-surface-sunken">
          <ArrowDown className="size-4" aria-hidden="true" /> Continue reading
        </button>
      </div>
    );
  }

  const miss = () => {
    setAttempts((a) => a + 1);
    setWiggle(true);
    window.setTimeout(() => setWiggle(false), 450);
  };

  const attempt = (word: string) => {
    interacted.current = true;
    if (solved) return;
    if (isCloseEnough(word, puzzle.answer)) {
      setTyped(puzzle.answer);
      finish();
    } else {
      setTried((t) => (t.includes(word) ? t : [...t, word]));
      miss();
    }
  };

  const reveal = () => {
    interacted.current = true;
    setTyped(puzzle.answer);
    finish();
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    const word = e.dataTransfer.getData("text/plain");
    if (word) attempt(word);
  };

  const submitTyped = () => {
    if (typed.trim()) attempt(typed);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      submitTyped();
    } else if (e.key === "Escape") {
      inputRef.current?.blur();
    }
  };

  const first = puzzle.answer[0];
  const canReveal = attempts >= 2;
  const remaining = puzzle.options.filter((o) => !tried.includes(o));

  return (
    <div className={`speedbump mt-6 rounded-2xl border px-4 py-4 text-[0.95rem] transition-colors sm:px-5 ${solved ? "border-accent/50 bg-accent-soft/60" : "border-border bg-surface"}`} role="group" aria-label="Quick check to unlock the next section">
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="eyebrow">{solved ? "Unlocked" : puzzle.kind === "drag" ? "Drag the word into the gap" : "Type the missing word"}</span>
        {!solved ? (
          <button type="button" onClick={onSkip} className="text-xs text-ink-faint hover:text-ink-muted">
            skip this one
          </button>
        ) : (
          <Check className="size-4 text-accent" aria-hidden="true" />
        )}
      </div>

      {/* The sentence with a gap. */}
      <div className="leading-relaxed text-ink">
        {puzzle.before}
        {puzzle.kind === "drag" || showChoices || solved ? (
          <span
            onDragOver={(e) => {
              e.preventDefault();
              setOver(true);
            }}
            onDragLeave={() => setOver(false)}
            onDrop={onDrop}
            className={`mx-0.5 inline-flex min-w-[6ch] items-center justify-center rounded-md border-b-2 px-1.5 align-baseline transition-colors ${
              solved
                ? "marker border-transparent font-medium"
                : over
                  ? "border-accent bg-accent-soft/60"
                  : "border-ink-faint/60 bg-surface-sunken/70"
            } ${wiggle && !reduceMotion ? "wiggle" : ""}`}
            aria-label={solved ? `Answer: ${puzzle.answer}` : "Drop the word here"}
          >
            {solved ? puzzle.answer : "\u00a0".repeat(Math.max(4, Math.min(12, puzzle.answer.length)))}
          </span>
        ) : (
            <input
              ref={inputRef}
              value={typed}
              onChange={(e) => setTyped(e.target.value)}
              onKeyDown={onKey}
              placeholder={`${first}${"·".repeat(Math.max(2, puzzle.answer.length - 1))}`}
              aria-label={`Missing word, starts with ${first}`}
              autoComplete="off"
              autoCapitalize="off"
              spellCheck={false}
              style={{ width: `${Math.max(6, puzzle.answer.length + 2)}ch` }}
              className={`mx-0.5 inline-block rounded-md border-b-2 border-ink-faint/60 bg-surface-sunken/70 px-1.5 text-center text-ink outline-none transition-colors placeholder:text-ink-faint focus:border-accent ${wiggle && !reduceMotion ? "wiggle" : ""}`}
            />
        )}
        {puzzle.after}
      </div>

      {/* Choices / controls */}
      {!solved ? (
        <div className="mt-3 flex flex-wrap items-center gap-2">
          {puzzle.kind === "drag" || showChoices ? (
            remaining.map((o) => (
              <button
                key={o}
                type="button"
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", o);
                  e.dataTransfer.effectAllowed = "move";
                }}
                onClick={() => attempt(o)}
                className="cursor-grab select-none rounded-full border border-border bg-surface-raised px-3 py-1 text-sm text-ink shadow-soft transition-transform hover:-translate-y-0.5 hover:border-ink-faint active:cursor-grabbing"
              >
                {o}
              </button>
            ))
          ) : (
            <>
              <button type="button" onClick={submitTyped} className="btn-tactile rounded-full bg-accent px-3.5 py-1 text-sm font-medium text-accent-ink hover:opacity-90">
                Check
              </button>
              <span className="text-xs text-ink-faint">
                starts with <b className="font-medium text-ink-muted">{first}</b> · {puzzle.answer.length} letters
              </span>
              {attempts >= 1 ? (
                <button type="button" onClick={() => setShowChoices(true)} className="text-xs text-ink-muted underline-offset-2 hover:underline">
                  show choices
                </button>
              ) : null}
            </>
          )}
          {attempts > 0 ? (
            <span className="ml-auto text-xs text-ink-muted">
              {canReveal ? (
                <>
                  It&apos;s in the paragraph above —{" "}
                  <button type="button" onClick={reveal} className="text-ink underline-offset-2 hover:underline">
                    show me
                  </button>
                </>
              ) : (
                "Not that one. Glance back up."
              )}
            </span>
          ) : null}
        </div>
      ) : (
        <p className="mt-2 text-xs text-ink-muted">Next section opening…</p>
      )}
    </div>
  );
}
