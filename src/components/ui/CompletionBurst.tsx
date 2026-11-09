"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";

const COLORS = ["#84A59D", "#6B7A8F", "#EBE9E1", "#E27D60", "#F7F5F0", "#2C363F"];

/**
 * A short, physical-feeling burst: a ring that expands and fades, plus a dozen
 * particles thrown outward with a little gravity. Mount it to play it once.
 */
/** Deterministic jitter so render stays pure; `seed` varies per mount via the key. */
function jitter(i: number, k: number) {
  const x = Math.sin(i * 12.9898 + k * 78.233) * 43758.5453;
  return x - Math.floor(x);
}

export function CompletionBurst({ count = 14, size = 180, seed = 1 }: { count?: number; size?: number; seed?: number }) {
  const particles = useMemo(
    () =>
      Array.from({ length: count }, (_, i) => {
        const angle = (i / count) * Math.PI * 2 + (jitter(i, seed) - 0.5) * 0.5;
        const dist = size * (0.32 + jitter(i, seed + 1) * 0.26);
        return {
          x: Math.cos(angle) * dist,
          y: Math.sin(angle) * dist + size * 0.12, // slight fall
          r: 3 + jitter(i, seed + 2) * 4,
          color: COLORS[i % COLORS.length],
          delay: jitter(i, seed + 3) * 0.05,
          rot: (jitter(i, seed + 4) - 0.5) * 240,
        };
      }),
    [count, size, seed],
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center overflow-visible" aria-hidden="true">
      <motion.div
        initial={{ scale: 0.2, opacity: 0.6 }}
        animate={{ scale: 1.15, opacity: 0 }}
        transition={{ duration: 0.55, ease: "easeOut" }}
        className="absolute rounded-full border-2 border-accent"
        style={{ width: size * 0.9, height: size * 0.9 }}
      />
      {particles.map((p, i) => (
        <motion.span
          key={i}
          initial={{ x: 0, y: 0, scale: 1, opacity: 1, rotate: 0 }}
          animate={{ x: p.x, y: p.y, scale: 0.4, opacity: 0, rotate: p.rot }}
          transition={{ duration: 0.75, delay: p.delay, ease: [0.17, 0.67, 0.3, 1] }}
          className="absolute block"
          style={{ width: p.r * 2, height: p.r * 2, borderRadius: i % 3 === 0 ? 2 : "9999px", background: p.color }}
        />
      ))}
    </div>
  );
}
