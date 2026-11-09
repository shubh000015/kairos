import type { ReactNode } from "react";

export function PageHeader({ title, description, action }: { title: string; description?: string; action?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="font-display text-4xl tracking-tight text-ink">{title}</h1>
        {description ? <p className="mt-1 max-w-prose text-ink-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ icon, title, body, action }: { icon?: ReactNode; title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 rounded-xl border border-dashed border-border px-6 py-10 text-center">
      {icon ? <div className="text-ink-faint">{icon}</div> : null}
      <div className="text-ink">{title}</div>
      {body ? <p className="max-w-sm text-sm text-ink-muted">{body}</p> : null}
      {action}
    </div>
  );
}

export function Pill({ children, tone = "neutral" }: { children: ReactNode; tone?: "neutral" | "sage" | "mist" | "clay" }) {
  const tones = {
    neutral: "bg-surface-sunken text-ink-muted",
    sage: "bg-accent-soft text-ink",
    mist: "bg-mist-100 text-mist-500 dark:bg-mist-800 dark:text-mist-200",
    clay: "bg-urgent-soft text-urgent",
  };
  return <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ${tones[tone]}`}>{children}</span>;
}

export function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="rounded-md border border-border bg-surface-sunken px-1.5 py-0.5 font-mono text-xs text-ink-faint">{children}</kbd>
  );
}
