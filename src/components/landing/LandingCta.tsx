"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSettingsStore } from "@/store/useSettingsStore";

export function LandingCta({ size = "lg" }: { size?: "lg" | "sm" }) {
  const visited = useSettingsStore((s) => s.hasVisitedApp);
  const cls =
    size === "lg"
      ? "btn-tactile btn-sheen inline-flex items-center gap-2 rounded-lg bg-accent px-6 py-3 text-base font-medium text-accent-ink shadow-soft hover:brightness-105"
      : "btn-tactile btn-sheen inline-flex items-center gap-1.5 rounded-lg bg-accent px-3.5 py-1.5 text-sm font-medium text-accent-ink shadow-soft hover:brightness-105";
  const label = visited ? "Back to your space" : size === "lg" ? "Open Kairos" : "Open the app";
  return (
    <Link href="/app" className={cls}>
      {label}
      <ArrowRight className={size === "lg" ? "size-4" : "size-3.5"} aria-hidden="true" />
    </Link>
  );
}
