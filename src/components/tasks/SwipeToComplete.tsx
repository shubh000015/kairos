"use client";

import { Check } from "lucide-react";
import { AnimatePresence, animate, motion, useMotionValue, useTransform } from "framer-motion";
import { useRef, useState, type ReactNode } from "react";
import { playCompletionThud } from "@/lib/sound";
import { useFocusStore } from "@/store/useFocusStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { CompletionBurst } from "@/components/ui/CompletionBurst";

interface SwipeToCompleteProps {
  /** Fired after the gesture (or `celebrate()` from a child) finishes its animation. */
  onComplete: () => void;
  disabled?: boolean;
  children: (api: { celebrate: () => void; completing: boolean }) => ReactNode;
  className?: string;
}

const MIN_TRAVEL = 150;
const TRAVEL_RATIO = 0.55;

/**
 * Finishing should have weight. Drag the row a full stroke to the right and it
 * commits with a sub-bass thud and a burst. A short flick does nothing — it
 * springs back — so completion is a deliberate physical motion, not a twitch.
 */
export function SwipeToComplete({ onComplete, disabled = false, children, className = "" }: SwipeToCompleteProps) {
  const ref = useRef<HTMLDivElement>(null);
  const x = useMotionValue(0);
  const [completing, setCompleting] = useState(false);
  const [burst, setBurst] = useState(false);
  const soundEnabled = useFocusStore((s) => s.soundEnabled);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);

  const threshold = () => Math.max(MIN_TRAVEL, (ref.current?.offsetWidth ?? 400) * TRAVEL_RATIO);

  const progress = useTransform(x, (v) => Math.min(1, Math.max(0, v / threshold())));
  const trackOpacity = useTransform(progress, [0, 0.15, 1], [0, 0.6, 1]);
  const checkScale = useTransform(progress, [0, 0.9, 1], [0.6, 0.95, 1.25]);
  const labelX = useTransform(progress, [0, 1], [-8, 0]);

  const celebrate = () => {
    if (completing || disabled) return;
    setCompleting(true);
    if (soundEnabled) playCompletionThud();
    if (!reduceMotion) setBurst(true);
    window.setTimeout(
      () => {
        onComplete();
        setBurst(false);
        setCompleting(false);
        x.set(0);
      },
      reduceMotion ? 80 : 520,
    );
  };

  const onDragEnd = () => {
    const v = x.get();
    if (v >= threshold() && !disabled) {
      // Finish the stroke, then commit.
      animate(x, (ref.current?.offsetWidth ?? 400) * 0.7, { type: "spring", stiffness: 420, damping: 34 });
      celebrate();
    } else {
      animate(x, 0, { type: "spring", stiffness: 500, damping: 36 });
    }
  };

  return (
    <div ref={ref} className={`relative ${className}`}>
      {/* Track revealed under the card while dragging. */}
      <motion.div
        aria-hidden="true"
        style={{ opacity: trackOpacity }}
        className="pointer-events-none absolute inset-0 flex items-center rounded-2xl bg-accent-soft pl-5 text-ink"
      >
        <motion.span style={{ scale: checkScale }} className="inline-flex size-8 items-center justify-center rounded-full bg-accent text-accent-ink">
          <Check className="size-4" />
        </motion.span>
        <motion.span style={{ x: labelX }} className="ml-3 text-sm font-medium">
          keep going… release to finish
        </motion.span>
      </motion.div>

      <motion.div
        drag={disabled ? false : "x"}
        dragDirectionLock
        dragMomentum={false}
        onDrag={() => {
          if (x.get() < 0) x.set(0);
        }}
        onDragEnd={onDragEnd}
        style={{ x, touchAction: "pan-y" }}
        className="relative"
        whileDrag={{ cursor: "grabbing" }}
      >
        {children({ celebrate, completing })}
      </motion.div>

      <AnimatePresence>{burst ? <CompletionBurst key="burst" /> : null}</AnimatePresence>
    </div>
  );
}
