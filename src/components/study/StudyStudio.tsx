"use client";

import { createContext, useCallback, useContext, useRef, useSyncExternalStore, type ReactNode } from "react";
import { Maximize2, Minimize2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { ViewerToolstrip } from "./ViewerToolstrip";

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
      <div ref={stageRef} data-study-studio className="study-studio flex flex-col gap-3">
        <div className="studio-strip relative z-20 flex items-center justify-end gap-1">
          <ViewerToolstrip extra={
            <Button variant={fullscreen ? "soft" : "ghost"} size="sm" onClick={toggle} className="h-9 shrink-0 px-2">
              {fullscreen ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
              <span className="hidden sm:inline">{fullscreen ? "Exit" : "Fullscreen"}</span>
            </Button>
          } />
        </div>
        <div className="study-studio-body min-h-0 flex-1 overflow-auto">{children}</div>
      </div>
    </StudioContext.Provider>
  );
}
