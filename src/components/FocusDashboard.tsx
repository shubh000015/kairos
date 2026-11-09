"use client";

import Link from "next/link";
import { useShallow } from "zustand/react/shallow";
import { useNow } from "@/hooks/useNow";
import { dayKey, formatDuration, greeting } from "@/lib/time";
import { useFocusStore } from "@/store/useFocusStore";
import { nextStep, selectOpenTasks, useTaskStore } from "@/store/useTaskStore";
import { CompanionCard } from "@/components/companion/CompanionCard";
import { DayBar } from "@/components/insights/DayBar";
import { ParkedThoughts } from "@/components/parking-lot/ParkedThoughts";
import { FocusPods } from "@/components/pods/FocusPods";
import { AudioEngine } from "@/components/audio/AudioEngine";
import { FocusSession } from "@/components/timer/FocusSession";
import { ZenFlowTracker } from "@/components/timer/ZenFlowTracker";
import { useSettingsStore } from "@/store/useSettingsStore";

/**
 * The home screen. In focus mode everything but the timer, the current step and the
 * parking lot fades back. Outside focus: a gentle greeting, the day bar, the companion.
 */
export function FocusDashboard() {
  const status = useFocusStore((s) => s.status);
  const history = useFocusStore((s) => s.history);
  const flowRunning = useFocusStore((s) => s.flowStartedAt !== null);
  const timerStyle = useSettingsStore((s) => s.timerStyle);
  const setSetting = useSettingsStore((s) => s.set);
  const open = useTaskStore(useShallow(selectOpenTasks));
  const setActive = useTaskStore((s) => s.setActive);
  const activeTaskId = useTaskStore((s) => s.activeTaskId);
  const now = useNow(60_000);

  const countdownActive = status === "running" || status === "paused";
  const inFocus = countdownActive || flowRunning;
  // A running session decides the view, so switching styles never hides live time.
  const style = flowRunning ? "open" : countdownActive ? "countdown" : timerStyle;
  const todayMs = now === null ? 0 : (history[dayKey(new Date(now))] ?? 0);
  const hello = now === null ? "Hello" : greeting(new Date(now));
  const suggestions = open.filter((t) => t.id !== activeTaskId).slice(0, 3);

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_19rem]">
      <div className="flex flex-col gap-8">
        <header className={`transition-opacity duration-500 ${inFocus ? "opacity-0 pointer-events-none h-0 overflow-hidden" : ""}`}>
          <p className="eyebrow mb-2">{todayMs > 0 ? `${formatDuration(todayMs)} of focus today` : "nothing counted yet, nothing missing"}</p>
          <h1 className="font-display text-4xl lowercase tracking-tight text-ink sm:text-5xl">
            {hello.toLowerCase()}. <span className="italic text-ink-muted">start small.</span>
          </h1>
        </header>

        {!inFocus ? (
          <div role="radiogroup" aria-label="Timer style" className="-mb-4 inline-flex self-start rounded-lg border border-border bg-surface-sunken p-0.5">
            {(
              [
                { v: "countdown", label: "Countdown" },
                { v: "open", label: "Open flow" },
              ] as const
            ).map((o) => (
              <button
                key={o.v}
                type="button"
                role="radio"
                aria-checked={style === o.v}
                title={o.v === "open" ? "Counts up from zero. No finish line, no way to fail." : "A block that shrinks as you go."}
                onClick={() => setSetting("timerStyle", o.v)}
                className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${style === o.v ? "bg-surface-raised text-ink shadow-soft" : "text-ink-muted hover:text-ink"}`}
              >
                {o.label}
              </button>
            ))}
          </div>
        ) : null}

        {style === "open" ? <ZenFlowTracker /> : <FocusSession />}

        {!inFocus && suggestions.length > 0 ? (
          <section aria-label="Pick something" className="rise-in">
            <p className="eyebrow mb-3">pick one, or don&apos;t</p>
            <ul className="grid gap-2 sm:grid-cols-3">
              {suggestions.map((t) => {
                const step = nextStep(t);
                return (
                  <li key={t.id}>
                    <button type="button" onClick={() => setActive(t.id)} className="flex h-full w-full flex-col items-start gap-1 rounded-2xl border border-border bg-surface-raised px-4 py-3 text-left shadow-soft transition-colors hover:border-accent">
                      <span className="line-clamp-2 text-ink">{t.title}</span>
                      {step ? <span className="line-clamp-1 text-xs text-ink-muted">next: {step.text}</span> : <span className="text-xs text-ink-faint">no steps yet — that&apos;s fine</span>}
                    </button>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2 flex flex-wrap items-center gap-4 text-sm text-ink-muted">
              <Link href="/app/tasks" className="hover:text-ink">all tasks →</Link>
              <Link href="/app/insights" className="hover:text-ink">minutes that only go up →</Link>
            </div>
          </section>
        ) : null}

        {!inFocus && suggestions.length === 0 ? (
          <Link href="/app/insights" className="text-sm text-ink-faint hover:text-ink">minutes that only go up →</Link>
        ) : null}

        <ParkedThoughts />
      </div>

      <aside className="flex flex-col gap-4">
        <div className={`flex flex-col gap-4 transition-opacity duration-500 ${inFocus ? "opacity-50" : ""}`}>
          <DayBar />
        </div>
        <FocusPods />
        <AudioEngine />
        <div className={`transition-opacity duration-500 ${inFocus ? "opacity-50" : ""}`}>
          <CompanionCard />
        </div>
      </aside>
    </div>
  );
}
