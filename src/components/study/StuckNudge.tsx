"use client";

import { AnimatePresence, motion } from "framer-motion";
import { Lightbulb, ListTree, Loader2, Scissors, Sparkles, X } from "lucide-react";
import { useEffect, useState } from "react";
import type { StuckReason } from "@/hooks/useStuckDetector";
import { requestExplanation, type Explanation, type ExplainMode } from "@/lib/explain";
import { requestBreakdown } from "@/lib/magicBreakdown";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Button } from "@/components/ui/Button";

type Variant =
  | { kind: "reading"; text: string }
  | { kind: "task"; stepText: string; onShrink: (steps: string[]) => void };

interface StuckNudgeProps {
  open: boolean;
  reason: StuckReason | null;
  variant: Variant;
  onClose: () => void;
}

/**
 * The quiet "Stuck?" card. Appears once, bottom-right, never blocks the page.
 * Frames the problem as the material being dense, not the person being slow.
 */
export function StuckNudge({ open, reason, variant, onClose }: StuckNudgeProps) {
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);
  const [busy, setBusy] = useState<string | null>(null);
  const [result, setResult] = useState<Explanation | null>(null);
  const [shrunk, setShrunk] = useState<string[] | null>(null);

  const close = () => {
    setResult(null);
    setShrunk(null);
    setBusy(null);
    onClose();
  };

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const explain = async (mode: ExplainMode) => {
    if (variant.kind !== "reading") return;
    setBusy(mode);
    try {
      setResult(await requestExplanation(variant.text, mode));
    } finally {
      setBusy(null);
    }
  };

  const shrink = async () => {
    if (variant.kind !== "task") return;
    setBusy("shrink");
    try {
      const r = await requestBreakdown(variant.stepText);
      setShrunk(r.steps.slice(0, 4));
    } finally {
      setBusy(null);
    }
  };

  const title =
    reason === "thrash"
      ? "Lots of clicking, not much landing?"
      : variant.kind === "reading"
        ? "Stuck on this bit?"
        : "This step isn't moving?";
  const subtitle =
    variant.kind === "reading"
      ? "That's the material being dense, not you. Pick a way in:"
      : "Steps that don't start are usually too big. Pick one:";

  return (
    <AnimatePresence>
      {open ? (
        <motion.aside
          key="stuck"
          role="dialog"
          aria-label="Stuck? Some ways forward"
          initial={reduceMotion ? false : { opacity: 0, y: 16, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={reduceMotion ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.98 }}
          transition={{ duration: 0.32, ease: [0.2, 0.8, 0.2, 1] }}
          className="fixed bottom-24 right-4 z-50 w-[min(26rem,calc(100vw-2rem))] rounded-2xl border border-border bg-surface-raised p-4 shadow-soft md:bottom-6 md:right-6"
        >
          <div className="mb-2 flex items-start justify-between gap-3">
            <div>
              <div className="eyebrow mb-1 inline-flex items-center gap-1.5">
                <Lightbulb className="size-3.5" aria-hidden="true" /> a gentle nudge
              </div>
              <h2 className="font-display text-xl leading-tight text-ink">{title}</h2>
            </div>
            <button type="button" onClick={close} aria-label="Dismiss" className="text-ink-faint hover:text-ink">
              <X className="size-4" />
            </button>
          </div>

          {!result && !shrunk ? (
            <>
              <p className="mb-3 text-sm text-ink-muted">{subtitle}</p>
              <div className="flex flex-wrap gap-2">
                {variant.kind === "reading" ? (
                  <>
                    <Button size="sm" variant="soft" onClick={() => explain("summary")} disabled={busy !== null}>
                      {busy === "summary" ? <Loader2 className="size-4 animate-spin" /> : <Sparkles className="size-4" />} Summarise it
                    </Button>
                    <Button size="sm" onClick={() => explain("analogy")} disabled={busy !== null}>
                      {busy === "analogy" ? <Loader2 className="size-4 animate-spin" /> : <Lightbulb className="size-4" />} Give me an analogy
                    </Button>
                    <Button size="sm" onClick={() => explain("pieces")} disabled={busy !== null}>
                      {busy === "pieces" ? <Loader2 className="size-4 animate-spin" /> : <Scissors className="size-4" />} Smaller pieces
                    </Button>
                  </>
                ) : (
                  <Button size="sm" variant="soft" onClick={shrink} disabled={busy !== null}>
                    {busy === "shrink" ? <Loader2 className="size-4 animate-spin" /> : <ListTree className="size-4" />} Shrink this step
                  </Button>
                )}
                <Button size="sm" variant="ghost" onClick={close}>
                  I&apos;m fine, just thinking
                </Button>
              </div>
            </>
          ) : null}

          {result ? (
            <div className="rise-in">
              <div className="mb-1.5 text-sm font-medium text-ink">{result.lead}</div>
              <ul className="space-y-1.5 text-sm leading-relaxed text-ink">
                {result.lines.map((l, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="mt-2 size-1.5 shrink-0 rounded-full bg-accent" aria-hidden="true" />
                    <span>{l}</span>
                  </li>
                ))}
              </ul>
              <div className="mt-3 flex flex-wrap items-center gap-2">
                <Button size="sm" variant="ghost" onClick={() => setResult(null)}>
                  Try another way
                </Button>
                <Button size="sm" variant="soft" onClick={close}>
                  Got it, back to it
                </Button>
                <span className="ml-auto text-[11px] text-ink-faint">
                  {result.source === "ai" ? "cloud AI" : result.source === "on-device" ? "on-device model · nothing left this device" : "computed on this device"}
                </span>
              </div>
            </div>
          ) : null}

          {shrunk && variant.kind === "task" ? (
            <div className="rise-in">
              <div className="mb-1.5 text-sm font-medium text-ink">Instead of “{variant.stepText}”:</div>
              <ol className="space-y-1.5 text-sm text-ink">
                {shrunk.map((s, i) => (
                  <li key={i} className="flex gap-2">
                    <span className="font-mono text-xs text-ink-faint">{i + 1}.</span>
                    <span>{s}</span>
                  </li>
                ))}
              </ol>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  onClick={() => {
                    variant.onShrink(shrunk);
                    close();
                  }}
                >
                  Use these
                </Button>
                <Button size="sm" variant="ghost" onClick={close}>
                  Keep the original
                </Button>
              </div>
            </div>
          ) : null}
        </motion.aside>
      ) : null}
    </AnimatePresence>
  );
}
