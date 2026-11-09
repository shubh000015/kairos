"use client";

import { Dices, Plus, Trash2, UtensilsCrossed } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useRoutineStore, type DopamineBucket } from "@/store/useRoutineStore";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

const BUCKETS: Array<{ id: DopamineBucket; title: string; blurb: string }> = [
  { id: "quick", title: "Quick hits", blurb: "2–5 min · between steps" },
  { id: "reset", title: "Resets", blurb: "5–15 min · between blocks" },
  { id: "earned", title: "Earned", blurb: "20+ min · after a hard thing" },
];

/**
 * A menu of healthy, pre-decided rewards. Deciding what to do on a break is itself
 * a drain; the menu removes that decision. "Quick pick" removes it entirely.
 */
export function DopamineMenu() {
  const menu = useRoutineStore((s) => s.menu);
  const addMenuItem = useRoutineStore((s) => s.addMenuItem);
  const removeMenuItem = useRoutineStore((s) => s.removeMenuItem);

  const [pick, setPick] = useState<string | null>(null);
  const [adding, setAdding] = useState<DopamineBucket | null>(null);
  const [text, setText] = useState("");
  const [minutes, setMinutes] = useState(5);

  const quickPick = (bucket?: DopamineBucket) => {
    const pool = bucket ? menu.filter((m) => m.bucket === bucket) : menu;
    if (!pool.length) return;
    const item = pool[Math.floor(Math.random() * pool.length)];
    setPick(`${item.text} · ${item.minutes} min`);
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    if (!adding) return;
    addMenuItem(text, adding, minutes);
    setText("");
    setAdding(null);
  };

  return (
    <Card>
      <CardHeader
        icon={<UtensilsCrossed className="size-5" />}
        title="Dopamine menu"
        description="Pre-decided breaks, so a break doesn't turn into a 2-hour scroll."
        action={
          <Button variant="soft" size="sm" onClick={() => quickPick()}>
            <Dices className="size-4" /> Quick pick
          </Button>
        }
      />
      <CardBody className="flex flex-col gap-4 pt-3">
        {pick ? (
          <div className="rise-in flex items-center justify-between gap-3 rounded-xl bg-accent-soft/70 px-4 py-3 text-ink">
            <span>{pick}</span>
            <button type="button" onClick={() => quickPick()} className="text-sm text-accent hover:underline">another</button>
          </div>
        ) : null}

        <div className="grid gap-4 sm:grid-cols-3">
          {BUCKETS.map((b) => {
            const items = menu.filter((m) => m.bucket === b.id);
            return (
              <section key={b.id} className="rounded-xl border border-border p-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div>
                    <h3 className="text-sm font-medium text-ink">{b.title}</h3>
                    <p className="text-xs text-ink-faint">{b.blurb}</p>
                  </div>
                  <button type="button" onClick={() => quickPick(b.id)} aria-label={`Random ${b.title}`} className="text-ink-faint hover:text-ink"><Dices className="size-4" /></button>
                </div>
                <ul className="space-y-1 text-sm">
                  {items.map((m) => (
                    <li key={m.id} className="group flex items-start justify-between gap-2 text-ink">
                      <span>{m.text} <span className="text-ink-faint">· {m.minutes}m</span></span>
                      <button type="button" onClick={() => removeMenuItem(m.id)} aria-label="Remove" className="text-ink-faint opacity-0 group-hover:opacity-100 focus:opacity-100"><Trash2 className="size-3.5" /></button>
                    </li>
                  ))}
                  {items.length === 0 ? <li className="text-ink-faint">Nothing here yet.</li> : null}
                </ul>
                {adding === b.id ? (
                  <form onSubmit={submit} className="mt-2 flex flex-col gap-2">
                    <Input value={text} onChange={(e) => setText(e.target.value)} placeholder="What helps?" aria-label="Menu item" autoFocus className="py-1.5 text-sm" />
                    <div className="flex items-center gap-2">
                      <input type="number" min={1} max={120} value={minutes} onChange={(e) => setMinutes(Number(e.target.value))} aria-label="Minutes" className="w-16 rounded-lg border border-border bg-surface-raised px-2 py-1 text-sm text-ink" />
                      <span className="text-xs text-ink-faint">min</span>
                      <Button type="submit" variant="primary" size="sm" className="ml-auto" disabled={!text.trim()}>Add</Button>
                    </div>
                  </form>
                ) : (
                  <button type="button" onClick={() => { setAdding(b.id); setMinutes(b.id === "quick" ? 3 : b.id === "reset" ? 8 : 25); }} className="mt-2 inline-flex items-center gap-1 text-xs text-ink-faint hover:text-ink"><Plus className="size-3.5" /> add</button>
                )}
              </section>
            );
          })}
        </div>
      </CardBody>
    </Card>
  );
}
