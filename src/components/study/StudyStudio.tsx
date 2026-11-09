"use client";

import { createContext, useCallback, useContext, useRef, useState, useSyncExternalStore, type FormEvent, type ReactNode } from "react";
import { Maximize2, Minimize2, Pause, Play, ParkingSquare, Square, Zap } from "lucide-react";
import { AudioEngine } from "@/components/audio/AudioEngine";
import { SoundscapePlayer } from "@/components/timer/SoundscapePlayer";
import { Button, IconButton } from "@/components/ui/Button";
import { formatClock } from "@/lib/time";
import { getRemainingMs, INITIATION_PRESET, useFocusStore } from "@/store/useFocusStore";
import { useParkingLotStore } from "@/store/useParkingLotStore";

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };

function fullscreenElement(): Element | null {
  const doc = document as FsDoc;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function subscribeFullscreen(onStoreChange: () => void) {
  document.addEventListener("fullscreenchange", onStoreChange);
  document.addEventListener("webkitfullscreenchange", onStoreChange);
  return () => {
    document.removeEventListener("fullscreenchange", onStoreChange);
    document.removeEventListener("webkitfullscreenchange", onStoreChange);
  };
}

type StudioApi = {
  toggle: () => void;
  fullscreen: boolean;
};

const StudioContext = createContext<StudioApi | null>(null);

export function useStudyStudio() {
  return useContext(StudioContext);
}

function StudioDock() {
  const park = useParkingLotStore((s) => s.park);
  const [text, setText] = useState("");
  const status = useFocusStore((s) => s.status);
  const remainingMsStored = useFocusStore((s) => s.remainingMs);
  const endsAt = useFocusStore((s) => s.endsAt);
  const pause = useFocusStore((s) => s.pause);
  const resume = useFocusStore((s) => s.resume);
  const stop = useFocusStore((s) => s.stop);
  const start = useFocusStore((s) => s.start);
  const remaining = getRemainingMs({ status, endsAt, remainingMs: remainingMsStored });

  const onPark = (e: FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    park(text);
    setText("");
  };

  return (
    <div className="studio-dock shrink-0 rounded-2xl border border-border bg-surface-raised/95 p-3 shadow-soft backdrop-blur">
      <div className="flex flex-col gap-3">
        <SoundscapePlayer compact />
        <AudioEngine variant="dock" />
        <div className="flex flex-wrap items-center gap-2">
          <form onSubmit={onPark} className="flex min-w-[14rem] flex-1 items-center gap-2 rounded-xl border border-border bg-surface px-2 py-1">
            <ParkingSquare className="size-4 shrink-0 text-mist-500" aria-hidden="true" />
            <input
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Park a thought…"
              aria-label="Park a distracting thought"
              className="min-w-0 flex-1 bg-transparent py-1.5 text-sm text-ink outline-none placeholder:text-ink-faint"
            />
          </form>
          {status === "running" || status === "paused" ? (
            <div className="inline-flex items-center gap-1 rounded-xl border border-border bg-surface px-2 py-1">
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
          ) : (
            <Button variant="soft" size="sm" onClick={() => start(INITIATION_PRESET)}>
              <Zap className="size-3.5" /> {INITIATION_PRESET}m
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

export function StudyStudio({ children }: { children: ReactNode }) {
  const stageRef = useRef<HTMLDivElement>(null);
  const fullscreen = useSyncExternalStore(
    subscribeFullscreen,
    () => Boolean(fullscreenElement()?.hasAttribute("data-study-studio")),
    () => false,
  );

  const toggle = useCallback(() => {
    const stage = stageRef.current;
    if (!stage) return;
    const el = fullscreenElement();
    if (el === stage) {
      const exit = document.exitFullscreen?.bind(document) ?? (document as FsDoc).webkitExitFullscreen?.bind(document);
      void Promise.resolve(exit?.()).catch(() => undefined);
      return;
    }
    const req =
      stage.requestFullscreen?.bind(stage) ??
      (stage as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen?.bind(stage);
    void Promise.resolve(req?.()).catch(() => undefined);
  }, []);

  return (
    <StudioContext.Provider value={{ toggle, fullscreen }}>
      <div ref={stageRef} data-study-studio className="study-studio flex flex-col gap-4">
        <div className="flex items-center justify-end">
          <Button variant={fullscreen ? "soft" : "secondary"} size="sm" onClick={toggle}>
            {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
            {fullscreen ? "Exit studio" : "Full studio"}
          </Button>
        </div>
        <div className="study-studio-body min-h-0 flex-1 overflow-auto">{children}</div>
        <StudioDock />
      </div>
    </StudioContext.Provider>
  );
}
