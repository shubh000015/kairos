"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { useSettingsStore } from "@/store/useSettingsStore";

export function LandingCta({ size = "lg" }: { size?: "lg" | "sm" }) {
  const visited = useSettingsStore((s) => s.hasVisitedApp);
  const cls =
    size === "lg"
      ? "btn-tactile btn-sheen inline-flex items-center gap-2 rounded-2xl bg-accent px-6 py-3.5 text-lg font-medium text-accent-ink shadow-soft hover:brightness-105"
      : "btn-tactile btn-sheen inline-flex items-center gap-1.5 rounded-xl bg-accent px-4 py-2 text-sm font-medium text-accent-ink shadow-soft hover:brightness-105";
  return (
    <Link href="/app" className={cls}>
      {visited ? "back to your space" : size === "lg" ? "open kairos — it's free" : "open the app"}
      <ArrowRight className={size === "lg" ? "size-5" : "size-4"} aria-hidden="true" />
    </Link>
  );
}
