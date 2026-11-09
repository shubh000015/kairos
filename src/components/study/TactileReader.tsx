"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Pause, Play, SkipBack, SkipForward } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { splitSentencesPlain } from "@/lib/kinetic";
import { useSettingsStore } from "@/store/useSettingsStore";

const MIN_RATE = 0.5;
const MAX_RATE = 2.5;
const RATE_STEP = 0.5;

type HotKey = "space" | "left" | "right" | "slower" | "faster";

const KEYS: Array<{ id: HotKey; cap: string; label: string }> = [
  { id: "space", cap: "Space", label: "play / pause" },
  { id: "left", cap: "←", label: "previous sentence" },
  { id: "right", cap: "→", label: "next sentence" },
  { id: "slower", cap: "[", label: "slower" },
  { id: "faster", cap: "]", label: "faster" },
];

/** Speaks sentence `i`, then keeps going while `isCurrent()` holds. */
function speakChain(
  sentences: string[],
  i: number,
  rate: number,
  cb: { isCurrent: () => boolean; onAdvance: (i: number) => void; onDone: () => void },
) {
  if (i >= sentences.length) return cb.onDone();
  const u = new SpeechSynthesisUtterance(sentences[i]);
  u.rate = rate;
  u.onend = () => {
    if (!cb.isCurrent()) return;
    if (i + 1 < sentences.length) {
      cb.onAdvance(i + 1);
      speakChain(sentences, i + 1, rate, cb);
    } else {
      cb.onDone();
    }
  };
  window.speechSynthesis.speak(u);
}

const isTyping = (t: EventTarget | null) =>
  t instanceof HTMLElement && (t.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(t.tagName));

/**
 * Read-aloud you steer with your hands. Speech is queued one sentence at a time
 * (reliable across browsers, and makes ← / → jump exactly one idea), and every
 * hotkey flashes its keycap so control feels physical.
 *
 *   Space play/pause · ← previous sentence · → next sentence · [ slower · ] faster
 */
export function TactileReader({ text }: { text: string }) {
  const hydrated = useHydrated();
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const sentences = useMemo(() => splitSentencesPlain(text), [text]);

  const [index, setIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [rate, setRate] = useState(1);
  const [flash, setFlash] = useState<{ key: HotKey; n: number } | null>(null);

  const token = useRef(0);
  const playingRef = useRef(false);
  const flashTimer = useRef<number | null>(null);
  const sentenceRefs = useRef<Array<HTMLSpanElement | null>>([]);

  const supported = hydrated && typeof window !== "undefined" && "speechSynthesis" in window;
  const safeIndex = Math.min(index, Math.max(0, sentences.length - 1));

  const speakFrom = (i: number, r: number) => {
    const my = ++token.current;
    window.speechSynthesis.cancel();
    speakChain(sentences, i, r, {
      isCurrent: () => my === token.current && playingRef.current,
      onAdvance: setIndex,
      onDone: () => {
        playingRef.current = false;
        setPlaying(false);
      },
    });
  };

  const stop = () => {
    token.current++;
    playingRef.current = false;
    setPlaying(false);
    window.speechSynthesis.cancel();
  };

  const pulse = (key: HotKey) => {
    setFlash((f) => ({ key, n: (f?.n ?? 0) + 1 }));
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
    flashTimer.current = window.setTimeout(() => setFlash(null), 260);
  };

  const toggle = () => {
    pulse("space");
    if (playingRef.current) return stop();
    if (!sentences.length) return;
    playingRef.current = true;
    setPlaying(true);
    speakFrom(safeIndex, rate);
  };

  const jump = (delta: number) => {
    pulse(delta > 0 ? "right" : "left");
    const next = Math.max(0, Math.min(sentences.length - 1, safeIndex + delta));
    setIndex(next);
    if (playingRef.current) speakFrom(next, rate);
  };

  const changeRate = (delta: number) => {
    pulse(delta > 0 ? "faster" : "slower");
    const r = Math.round(Math.max(MIN_RATE, Math.min(MAX_RATE, rate + delta)) * 10) / 10;
    setRate(r);
    // The Web Speech API can't change rate mid-utterance; restart the current sentence.
    if (playingRef.current && r !== rate) speakFrom(safeIndex, r);
  };

  const jumpTo = (i: number) => {
    setIndex(i);
    if (playingRef.current) speakFrom(i, rate);
  };

  // Global hotkeys while mounted; the latest handler is read through a ref.
  const onKey = useRef<(e: KeyboardEvent) => void>(() => {});
  useEffect(() => {
    onKey.current = (e: KeyboardEvent) => {
      if (e.ctrlKey || e.metaKey || e.altKey || isTyping(e.target)) return;
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        toggle();
      } else if (e.key === "ArrowRight") {
        e.preventDefault();
        jump(1);
      } else if (e.key === "ArrowLeft") {
        e.preventDefault();
        jump(-1);
      } else if (e.key === "]") {
        e.preventDefault();
        changeRate(RATE_STEP);
      } else if (e.key === "[") {
        e.preventDefault();
        changeRate(-RATE_STEP);
      }
    };
  });
  useEffect(() => {
    if (!supported) return;
    const handler = (e: KeyboardEvent) => onKey.current(e);
    window.addEventListener("keydown", handler);
    const playing = playingRef;
    return () => {
      window.removeEventListener("keydown", handler);
      playing.current = false;
      window.speechSynthesis.cancel();
    };
  }, [supported]);

  // Keep the spoken sentence in view.
  useEffect(() => {
    sentenceRefs.current[safeIndex]?.scrollIntoView({ block: "nearest", behavior: reduceMotion ? "auto" : "smooth" });
  }, [safeIndex, reduceMotion]);

  useEffect(() => () => {
    if (flashTimer.current) window.clearTimeout(flashTimer.current);
  }, []);

  if (!hydrated) return null;
  if (!supported) {
    return <p className="text-sm text-ink-muted">This browser doesn&apos;t offer read-aloud. Chrome, Edge and Safari do.</p>;
  }
  if (!sentences.length) {
    return <p className="text-sm text-ink-muted">Paste some text in the Reader tab first, then come back here to listen.</p>;
  }

  const progress = sentences.length > 1 ? safeIndex / (sentences.length - 1) : 1;
  const lit = (k: HotKey) => flash?.key === k;

  return (
    <div className="flex flex-col gap-4">
      {/* Control deck */}
      <div className="sticky top-3 z-10 flex flex-wrap items-center gap-4 rounded-2xl border border-border bg-surface-raised/95 px-4 py-3 shadow-soft backdrop-blur">
        <div className="flex items-center gap-1.5">
          <DeckButton label="Previous sentence" active={lit("left")} onClick={() => jump(-1)}>
            <SkipBack className="size-4" />
          </DeckButton>
          <DeckButton label={playing ? "Pause" : "Play"} active={lit("space")} onClick={toggle} primary>
            {playing ? <Pause className="size-5" /> : <Play className="size-5" />}
          </DeckButton>
          <DeckButton label="Next sentence" active={lit("right")} onClick={() => jump(1)}>
            <SkipForward className="size-4" />
          </DeckButton>
        </div>

        <div className="flex items-center gap-1.5">
          <DeckButton label="Slower" active={lit("slower")} onClick={() => changeRate(-RATE_STEP)} disabled={rate <= MIN_RATE}>
            <span className="text-sm font-medium">−</span>
          </DeckButton>
          <div className="relative h-8 w-16 overflow-hidden text-center" aria-live="polite" aria-label={`Speed ${rate} times`}>
            <AnimatePresence initial={false}>
              <motion.span
                key={rate}
                initial={reduceMotion ? false : { y: 8, opacity: 0, scale: 0.8 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={reduceMotion ? undefined : { y: -8, opacity: 0, scale: 0.8 }}
                transition={{ type: "spring", stiffness: 500, damping: 28 }}
                className="absolute inset-0 font-display text-2xl leading-8 tabular-nums text-ink"
              >
                {rate.toFixed(1)}×
              </motion.span>
            </AnimatePresence>
          </div>
          <DeckButton label="Faster" active={lit("faster")} onClick={() => changeRate(RATE_STEP)} disabled={rate >= MAX_RATE}>
            <span className="text-sm font-medium">+</span>
          </DeckButton>
        </div>

        <div className="ml-auto min-w-32 flex-1 sm:max-w-56">
          <div className="mb-1 flex justify-between text-[11px] text-ink-faint">
            <span>sentence {safeIndex + 1} of {sentences.length}</span>
            <span>{playing ? "reading" : "paused"}</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-surface-sunken">
            <div className="h-full rounded-full bg-accent transition-[width] duration-300" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      </div>

      {/* Hotkey legend */}
      <ul className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-ink-muted" aria-label="Keyboard shortcuts">
        {KEYS.map((k) => (
          <li key={k.id} className="inline-flex items-center gap-1.5">
            <motion.kbd
              key={lit(k.id) ? `${k.id}-${flash?.n}` : k.id}
              initial={lit(k.id) && !reduceMotion ? { scale: 0.86, y: 2 } : false}
              animate={{ scale: 1, y: 0 }}
              transition={{ type: "spring", stiffness: 700, damping: 18 }}
              className={`inline-flex min-w-7 items-center justify-center rounded-md border px-1.5 py-0.5 font-mono text-[11px] shadow-[0_2px_0_var(--color-border)] transition-colors duration-150 ${
                lit(k.id) ? "border-accent bg-accent text-accent-ink" : "border-border bg-surface text-ink"
              }`}
            >
              {k.cap}
            </motion.kbd>
            {k.label}
          </li>
        ))}
      </ul>

      {/* Text, with the spoken sentence lit */}
      <article className="max-h-[60vh] overflow-y-auto rounded-2xl border border-border bg-surface px-5 py-4 text-lg leading-relaxed text-ink-muted">
        {sentences.map((s, i) => (
          <span
            key={i}
            ref={(el) => {
              sentenceRefs.current[i] = el;
            }}
            onClick={() => jumpTo(i)}
            className={`cursor-pointer rounded px-0.5 transition-colors duration-200 ${
              i === safeIndex ? "bg-accent-soft text-ink" : i < safeIndex ? "text-ink-faint hover:text-ink-muted" : "hover:text-ink"
            }`}
          >
            {s}{" "}
          </span>
        ))}
      </article>
    </div>
  );
}

function DeckButton({
  children,
  label,
  active,
  onClick,
  primary = false,
  disabled = false,
}: {
  children: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
  primary?: boolean;
  disabled?: boolean;
}) {
  return (
    <motion.button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      disabled={disabled}
      animate={active ? { scale: [1, 0.88, 1.04, 1] } : { scale: 1 }}
      transition={{ duration: 0.26 }}
      className={`inline-flex items-center justify-center rounded-full border transition-colors disabled:opacity-40 ${
        primary ? "size-11 border-accent bg-accent text-accent-ink" : "size-9 border-border bg-surface text-ink hover:border-ink-faint"
      } ${active && !primary ? "border-accent bg-accent-soft" : ""}`}
    >
      {children}
    </motion.button>
  );
}
