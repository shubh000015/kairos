"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";

/** Remembers that the user has been inside the app, so the landing page can offer "Back to app". */
export function VisitedMarker() {
  const hasVisited = useSettingsStore((s) => s.hasVisitedApp);
  const set = useSettingsStore((s) => s.set);
  useEffect(() => {
    if (!hasVisited) set("hasVisitedApp", true);
  }, [hasVisited, set]);
  return null;
}
