"use client";

import { useEffect } from "react";
import { useSettingsStore } from "@/store/useSettingsStore";

/** Keeps <html data-*> attributes in sync with settings after hydration. */
export function ThemeApplier() {
  const theme = useSettingsStore((s) => s.theme);
  const fontScale = useSettingsStore((s) => s.fontScale);
  const relaxedSpacing = useSettingsStore((s) => s.relaxedSpacing);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);

  useEffect(() => {
    const html = document.documentElement;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => {
      const resolved = theme === "system" ? (mq.matches ? "dark" : "light") : theme;
      html.setAttribute("data-theme", resolved);
    };
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [theme]);

  useEffect(() => {
    const html = document.documentElement;
    const toggle = (attr: string, on: boolean, value: string) =>
      on ? html.setAttribute(attr, value) : html.removeAttribute(attr);
    toggle("data-font-scale", fontScale === "large", "large");
    toggle("data-spacing", relaxedSpacing, "relaxed");
    toggle("data-motion", reduceMotion, "reduce");
  }, [fontScale, relaxedSpacing, reduceMotion]);

  return null;
}
