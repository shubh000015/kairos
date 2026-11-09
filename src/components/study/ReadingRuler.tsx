"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";

/**
 * Wraps content and, when enabled, dims everything except a horizontal band that
 * follows the pointer — a digital version of the finger-under-the-line trick.
 */
export function ReadingRuler({ enabled, height = 72, children }: { enabled: boolean; height?: number; children: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const [y, setY] = useState<number | null>(null);

  const onMove = useCallback((e: React.PointerEvent) => {
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    setY(e.clientY - rect.top);
  }, []);

  return (
    <div ref={ref} onPointerMove={enabled ? onMove : undefined} onPointerLeave={() => setY(null)} className="relative">
      {children}
      {enabled && y !== null ? (
        <div
          aria-hidden="true"
          className="reading-mask pointer-events-none absolute inset-0 rounded-xl transition-[background] duration-75"
          style={{ ["--ruler-y" as string]: `${y}px`, ["--ruler-h" as string]: `${height}px` }}
        />
      ) : null}
    </div>
  );
}
