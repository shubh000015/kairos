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
  { href: "/app", label: "focus", icon: CircleDot },
  { href: "/app/tasks", label: "tasks", icon: ListChecks },
  { href: "/app/study", label: "study", icon: BookOpenText },
  { href: "/app/routines", label: "care", icon: Sunrise },
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
          ? `group flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] lowercase tracking-tight transition-colors ${
              active ? "bg-surface-raised text-ink shadow-soft" : "text-ink-muted hover:bg-surface-sunken hover:text-ink"
            }`
          : `flex flex-col items-center gap-0.5 py-2 text-[11px] lowercase ${active ? "text-accent" : "text-ink-faint"}`
      }
    >
      <Icon className={rail ? `size-[18px] ${active ? "text-accent" : "text-ink-faint group-hover:text-ink-muted"}` : "size-5"} aria-hidden="true" />
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
      <nav aria-label="Main" className={`sticky top-0 hidden h-screen w-56 shrink-0 flex-col border-r border-border/70 bg-surface px-4 py-6 transition-opacity duration-500 md:flex ${inFocus ? "opacity-60 hover:opacity-100" : ""}`}>
        <Link href="/" className="mb-10 inline-flex px-2">
          <Logo />
        </Link>
        <ul className="flex flex-col gap-1">
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
            className={`inline-flex items-center gap-2 rounded-xl px-3 py-2 text-sm lowercase tracking-tight ${
              settingsActive ? "bg-surface-raised text-ink shadow-soft" : "text-ink-faint hover:bg-surface-sunken hover:text-ink"
            }`}
          >
            <Settings className="size-4" aria-hidden="true" />
            settings
          </Link>
          <p className="px-2 text-xs leading-relaxed text-ink-faint">{inFocus ? "in a block. everything else can wait." : "nothing here is urgent."}</p>
        </div>
      </nav>

      <nav aria-label="Main" className="fixed inset-x-0 bottom-0 z-30 border-t border-border/70 bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
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
              aria-label="settings"
              className={`flex flex-col items-center gap-0.5 py-2 text-[11px] lowercase ${settingsActive ? "text-accent" : "text-ink-faint"}`}
            >
              <MoreHorizontal className="size-5" aria-hidden="true" />
              more
            </Link>
          </li>
        </ul>
      </nav>

      <Link href="/" className="fixed left-4 top-4 z-30 md:hidden" aria-label="kairos home">
        <LogoMark className="h-7 w-9" />
      </Link>
    </>
  );
}
