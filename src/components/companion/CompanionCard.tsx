"use client";

import { Pencil, Sprout } from "lucide-react";
import { useState } from "react";
import { useNow } from "@/hooks/useNow";
import { formatDuration } from "@/lib/time";
import { MOOD_LINES, moodFor, nextStageFor, stageFor, useCompanionStore, type CompanionHue } from "@/store/useCompanionStore";
import { Button, IconButton } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { CompanionSprite } from "./CompanionSprite";

const HUE_OPTIONS: Array<{ value: CompanionHue; label: string; swatch: string }> = [
  { value: "sage", label: "Sage", swatch: "bg-accent" },
  { value: "mist", label: "Mist", swatch: "bg-mist-500" },
  { value: "clay", label: "Clay", swatch: "bg-clay-500" },
];

/**
 * A virtual body double: it sits beside you while you work and grows from your
 * focus minutes. It cannot die, wilt, or be disappointed.
 */
export function CompanionCard({ compact = false }: { compact?: boolean }) {
  const name = useCompanionStore((s) => s.name);
  const hue = useCompanionStore((s) => s.hue);
  const totalFedMs = useCompanionStore((s) => s.totalFedMs);
  const lastFedAt = useCompanionStore((s) => s.lastFedAt);
  const rename = useCompanionStore((s) => s.rename);
  const setHue = useCompanionStore((s) => s.setHue);
  const now = useNow(60_000);

  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(name);

  const stage = stageFor(totalFedMs);
  const next = nextStageFor(totalFedMs);
  const mood = now === null ? "awake" : moodFor(lastFedAt, now);
  // Deterministic line per stage+mood so it doesn't flicker on re-render.
  const line = MOOD_LINES[mood][(stage.index + name.length) % MOOD_LINES[mood].length];
  const progress = next ? (totalFedMs - stage.atMs) / (next.atMs - stage.atMs) : 1;

  if (compact) {
    return (
      <div className="flex items-center gap-3">
        <CompanionSprite stage={stage.index} mood={mood} hue={hue} className="size-20" />
        <div className="min-w-0">
          <div className="text-sm font-medium text-ink">{name}</div>
          <div className="text-xs text-ink-muted">{line}</div>
        </div>
      </div>
    );
  }

  return (
    <Card>
      <CardHeader
        icon={<Sprout className="size-5" />}
        title={`${name} · ${stage.name}`}
        description={stage.blurb}
        action={
          <IconButton label="Rename companion" onClick={() => { setDraft(name); setEditing((e) => !e); }}>
            <Pencil className="size-4" />
          </IconButton>
        }
      />
      <CardBody className="flex flex-col items-center gap-4">
        <CompanionSprite stage={stage.index} mood={mood} hue={hue} className="size-44" />
        <p className="text-center text-sm text-ink-muted">{line}</p>

        <div className="w-full">
          <div className="mb-1 flex justify-between text-xs text-ink-faint">
            <span>{formatDuration(totalFedMs)} of focus so far</span>
            {next ? <span>{formatDuration(next.atMs - totalFedMs)} to {next.name}</span> : <span>Fully grown</span>}
          </div>
          <div className="h-2 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuenow={Math.round(progress * 100)} aria-valuemin={0} aria-valuemax={100}>
            <div className="h-full rounded-full bg-accent transition-[width] duration-700" style={{ width: `${Math.round(progress * 100)}%` }} />
          </div>
        </div>

        {editing ? (
          <form
            className="flex w-full flex-col gap-3"
            onSubmit={(e) => {
              e.preventDefault();
              rename(draft);
              setEditing(false);
            }}
          >
            <Input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={24} aria-label="Companion name" />
            <div className="flex items-center gap-2" role="radiogroup" aria-label="Companion colour">
              {HUE_OPTIONS.map((h) => (
                <button
                  key={h.value}
                  type="button"
                  role="radio"
                  aria-checked={hue === h.value}
                  aria-label={h.label}
                  onClick={() => setHue(h.value)}
                  className={`size-8 rounded-full ${h.swatch} ${hue === h.value ? "ring-2 ring-ring ring-offset-2 ring-offset-surface-raised" : ""}`}
                />
              ))}
              <Button type="submit" variant="primary" size="sm" className="ml-auto">
                Save
              </Button>
            </div>
          </form>
        ) : null}
      </CardBody>
    </Card>
  );
}
