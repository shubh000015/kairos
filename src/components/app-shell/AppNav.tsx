"use client";

import { BookOpenText, CircleDot, ListChecks, MoreHorizontal, Settings, Sunrise } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo, LogoMark } from "@/components/brand/Logo";
import { useFocusStore } from "@/store/useFocusStore";

/**
 * Four persistently visible destinations. Spatial memory needs a short, fixed
 * list — never a hamburger, never a sixth tab. Insights lives on Focus;
 * Settings is a quiet icon that always sits in the same corner.
 */
const ITEMS = [
  { href: "/app", label: "Focus", icon: CircleDot },
  { href: "/app/tasks", label: "Tasks", icon: ListChecks },
  { href: "/app/study", label: "Study", icon: BookOpenText },
  { href: "/app/routines", label: "Care", icon: Sunrise },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app" || pathname.startsWith("/app/insights");
  return pathname.startsWith(href);
}

function NavLink({
  href,
  label,
  icon: Icon,
  active,
  layout,
}: {
  href: string;
  label: string;
  icon: typeof CircleDot;
  active: boolean;
  layout: "rail" | "bar";
}) {
  const rail = layout === "rail";
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={
        rail
          ? `group flex items-center gap-3 border-l-2 px-3 py-2 text-[14px] transition-colors ${
              active
                ? "border-accent bg-accent-soft/40 text-ink"
                : "border-transparent text-ink-muted hover:border-border hover:text-ink"
            }`
          : `flex flex-col items-center gap-0.5 py-2 text-[11px] ${active ? "text-accent" : "text-ink-faint"}`
      }
    >
      <Icon className={rail ? `size-4 ${active ? "text-accent" : "text-ink-faint group-hover:text-ink-muted"}` : "size-5"} aria-hidden="true" />
      {label}
    </Link>
  );
}

/** Left rail on desktop, bottom bar on mobile. Dims itself while a block is running. */
export function AppNav() {
  const pathname = usePathname();
  const status = useFocusStore((s) => s.status);
  const inFocus = status === "running" || status === "paused";
  const settingsActive = pathname.startsWith("/app/settings");

  return (
    <>
      <nav aria-label="Main" className={`sticky top-0 hidden h-screen w-52 shrink-0 flex-col border-r border-border/80 bg-surface px-3 py-6 transition-opacity duration-500 md:flex ${inFocus ? "opacity-55 hover:opacity-100" : ""}`}>
        <Link href="/" className="mb-12 inline-flex px-2">
          <Logo />
        </Link>
        <ul className="flex flex-col gap-0.5">
          {ITEMS.map((it) => (
            <li key={it.href}>
              <NavLink {...it} active={isActive(pathname, it.href)} layout="rail" />
            </li>
          ))}
        </ul>
        <div className="mt-auto flex flex-col gap-3 px-1">
          <Link
            href="/app/settings"
            aria-current={settingsActive ? "page" : undefined}
            className={`inline-flex items-center gap-2 border-l-2 px-3 py-2 text-sm ${
              settingsActive ? "border-accent bg-accent-soft/40 text-ink" : "border-transparent text-ink-faint hover:text-ink"
            }`}
          >
            <Settings className="size-4" aria-hidden="true" />
            Settings
          </Link>
          <p className="px-3 font-mono text-[11px] leading-relaxed text-ink-faint">{inFocus ? "In a block. Everything else can wait." : "Nothing here is urgent."}</p>
        </div>
      </nav>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-border/80 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="grid grid-cols-5">
          {ITEMS.map((it) => (
            <li key={it.href}>
              <NavLink {...it} active={isActive(pathname, it.href)} layout="bar" />
            </li>
          ))}
          <li>
            <Link
              href="/app/settings"
              aria-current={settingsActive ? "page" : undefined}
              aria-label="Settings"
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] ${settingsActive ? "text-accent" : "text-ink-faint"}`}
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
              More
            </Link>
          </li>
        </ul>
      </nav>

      <Link href="/" className="fixed left-4 top-4 z-30 md:hidden" aria-label="Kairos home">
        <LogoMark className="h-7 w-9 text-accent" />
      </Link>
    </>
  );
}
