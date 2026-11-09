"use client";

import { Music2, ParkingSquare, Pause, Play, Square, Timer, X, Zap } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent, type ReactNode } from "react";
import { AudioEngine } from "@/components/audio/AudioEngine";
import { YouTubeMusic } from "@/components/audio/YouTubeMusic";
import { SoundscapePlayer } from "@/components/timer/SoundscapePlayer";
import { IconButton } from "@/components/ui/Button";
import { useNow } from "@/hooks/useNow";
import { formatClock } from "@/lib/time";
import { getRemainingMs, INITIATION_PRESET, useFocusStore } from "@/store/useFocusStore";
import { useParkingLotStore } from "@/store/useParkingLotStore";

type Panel = "music" | "park" | "timer" | null;

/**
 * Tiny Chrome-style tool cluster: icon buttons, one panel at a time.
 * Lives inside the fullscreen element so music/parking stay reachable.
 */
export function ViewerToolstrip({ extra, drop = "down" }: { extra?: ReactNode; drop?: "up" | "down" }) {
  const [panel, setPanel] = useState<Panel>(null);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setPanel(null);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const toggle = (id: Exclude<Panel, null>) => setPanel((p) => (p === id ? null : id));
  const pos = drop === "up" ? "bottom-full mb-2" : "top-full mt-2";

  return (
    <div ref={rootRef} className="flex items-center gap-0.5">
      <ToolPop open={panel === "music"} pos={pos} onToggle={() => toggle("music")} label="Music" icon={<Music2 className="size-4" />}>
        <SoundscapePlayer compact />
        <YouTubeMusic />
        <div className="mt-3 border-t border-border pt-3">
          <AudioEngine variant="dock" />
        </div>
      </ToolPop>
      <ToolPop open={panel === "park"} pos={pos} onToggle={() => toggle("park")} label="Park a thought" icon={<ParkingSquare className="size-4" />}>
        <ParkField />
      </ToolPop>
      <ToolPop open={panel === "timer"} pos={pos} onToggle={() => toggle("timer")} label="Focus timer" icon={<TimerIcon />}>
        <TimerChip />
      </ToolPop>
      {extra}
    </div>
  );
}

function ToolPop({
  open,
  pos,
  onToggle,
  label,
  icon,
  children,
}: {
  open: boolean;
  pos: string;
  onToggle: () => void;
  label: string;
  icon: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="relative">
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-pressed={open}
        onClick={onToggle}
        className={`inline-flex h-9 min-w-9 items-center justify-center rounded-lg px-1.5 text-ink-faint transition-colors hover:bg-surface-sunken hover:text-ink ${open ? "bg-surface-sunken text-ink" : ""}`}
      >
        {icon}
      </button>
      {open ? (
        <div className={`absolute right-0 z-50 max-h-[min(28rem,calc(100dvh-5rem))] w-[min(20rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-border bg-surface-raised p-3 shadow-soft ${pos}`}>
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium lowercase text-ink-muted">{label}</span>
            <button type="button" aria-label="Close" onClick={onToggle} className="text-ink-faint hover:text-ink">
              <X className="size-3.5" />
            </button>
          </div>
          {children}
        </div>
      ) : null}
    </div>
  );
}

function ParkField() {
  const park = useParkingLotStore((s) => s.park);
  const [text, setText] = useState("");
  const onPark = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    park(text);
    setText("");
  };
  return (
    <form onSubmit={onPark} className="flex items-center gap-2 rounded-xl border border-border bg-surface px-2 py-1">
      <ParkingSquare className="size-4 shrink-0 text-mist-500" aria-hidden="true" />
      <input
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Park it, deal later…"
        aria-label="Park a distracting thought"
        className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-ink outline-none placeholder:text-ink-faint"
      />
    </form>
  );
}

function TimerIcon() {
  const status = useFocusStore((s) => s.status);
  const remainingMsStored = useFocusStore((s) => s.remainingMs);
  const endsAt = useFocusStore((s) => s.endsAt);
  const now = useNow(status === "running" ? 1000 : 0);
  const remaining = now === null ? remainingMsStored : getRemainingMs({ status, endsAt, remainingMs: remainingMsStored }, now);
  if (status !== "running" && status !== "paused") return <Timer className="size-4" />;
  return (
    <span className="inline-flex items-center gap-1">
      <Timer className="size-4" />
      <span className="font-mono text-[10px] tabular-nums">{formatClock(remaining)}</span>
    </span>
  );
}

function TimerChip() {
  const status = useFocusStore((s) => s.status);
  const remainingMsStored = useFocusStore((s) => s.remainingMs);
  const endsAt = useFocusStore((s) => s.endsAt);
  const pause = useFocusStore((s) => s.pause);
  const resume = useFocusStore((s) => s.resume);
  const stop = useFocusStore((s) => s.stop);
  const start = useFocusStore((s) => s.start);
  const now = useNow(status === "running" ? 1000 : 0);
  const remaining = now === null ? remainingMsStored : getRemainingMs({ status, endsAt, remainingMs: remainingMsStored }, now);

  if (status === "running" || status === "paused") {
    return (
      <div className="flex items-center gap-1">
        <span className="px-1 font-mono text-sm tabular-nums text-ink">{formatClock(remaining)}</span>
        {status === "running" ? (
          <IconButton label="Pause block" onClick={pause} className="size-8">
            <Pause className="size-3.5" />
          </IconButton>
        ) : (
          <IconButton label="Resume block" onClick={resume} className="size-8">
            <Play className="size-3.5" />
          </IconButton>
        )}
        <IconButton label="Done for now" onClick={stop} className="size-8">
          <Square className="size-3.5" />
        </IconButton>
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => start(INITIATION_PRESET)}
      className="inline-flex items-center gap-1.5 rounded-lg bg-accent-soft px-2.5 py-1.5 text-sm text-ink"
    >
      <Zap className="size-3.5" /> Start {INITIATION_PRESET}m
    </button>
  );
}
