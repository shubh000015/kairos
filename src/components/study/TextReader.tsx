"use client";

import { AlignLeft, Minus, Pause, Play, Plus, ScanLine, Type, Zap } from "lucide-react";
import { useMemo, useState } from "react";
import { splitSentences, useSpeech } from "@/hooks/useSpeech";
import { hashString } from "@/lib/kinetic";
import { useStudyStore } from "@/store/useStudyStore";
import { Button } from "@/components/ui/Button";
import { Textarea } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Misc";
import { BionicText } from "./BionicText";
import { KineticReader } from "./KineticReader";
import { ReadingRuler } from "./ReadingRuler";

/**
 * Paste any text — notes, an article, a chapter — and read it in a calm,
 * adjustable view with optional bionic emphasis, a reading ruler, and read-aloud.
 */
export function TextReader() {
  const text = useStudyStore((s) => s.readerText);
  const setText = useStudyStore((s) => s.setReaderText);
  const fontSize = useStudyStore((s) => s.readerFontSize);
  const setFontSize = useStudyStore((s) => s.setReaderFontSize);
  const kinetic = useStudyStore((s) => s.kinetic);
  const setKinetic = useStudyStore((s) => s.setKinetic);
  const kineticUnlocked = useStudyStore((s) => s.readerKineticUnlocked);
  const setKineticUnlocked = useStudyStore((s) => s.setReaderKineticUnlocked);

  // Stores hydrate after mount, so "is there text?" can't be decided at first render.
  // Only an explicit user choice overrides the default of "show the text if there is any".
  const [editingOverride, setEditing] = useState<boolean | null>(null);
  const editing = editingOverride ?? text.length === 0;
  const [bionic, setBionic] = useState(false);
  const [ruler, setRuler] = useState(false);
  const [rate, setRate] = useState(1);
  const speech = useSpeech();

  const sentences = useMemo(() => splitSentences(text), [text]);
  const words = useMemo(() => (text.trim() ? text.trim().split(/\s+/).length : 0), [text]);
  const minutes = Math.max(1, Math.round(words / 200));

  if (editing) {
    return (
      <div className="flex flex-col gap-3">
        <Textarea
          value={text}
          onChange={(e) => {
            setEditing(true); // typing pins the editor open until "Read it"
            setText(e.target.value);
          }}
          placeholder="Paste notes, an article, a chapter… anything you need to actually get through."
          rows={12}
          aria-label="Text to read"
          autoFocus
        />
        <div className="flex items-center justify-between text-sm text-ink-faint">
          <span>{words ? `${words} words · about ${minutes} min` : "Nothing yet"}</span>
          <Button variant="primary" size="sm" onClick={() => setEditing(false)} disabled={!text.trim()}>
            Read it
          </Button>
        </div>
      </div>
    );
  }

  if (!text.trim()) {
    return <EmptyState icon={<Type className="size-8" />} title="Nothing to read yet" action={<Button onClick={() => setEditing(true)}>Paste some text</Button>} />;
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <Button variant="ghost" size="sm" onClick={() => { speech.stop(); setEditing(true); }}>
          <AlignLeft className="size-4" /> Edit text
        </Button>
        <span className="text-ink-faint">·</span>
        <Button
          variant={kinetic ? "soft" : "ghost"}
          size="sm"
          onClick={() => {
            speech.stop();
            setKinetic(!kinetic);
          }}
          aria-pressed={kinetic}
          title={kinetic ? "On: blurs what's next. Turn off to see the whole text." : "Optional. Off by default — the whole text stays visible."}
        >
          <Zap className="size-4" /> Kinetic
        </Button>
        <Button variant={bionic ? "soft" : "ghost"} size="sm" onClick={() => setBionic((b) => !b)} aria-pressed={bionic}>
          <Type className="size-4" /> Bionic
        </Button>
        <Button variant={ruler ? "soft" : "ghost"} size="sm" onClick={() => setRuler((r) => !r)} aria-pressed={ruler}>
          <ScanLine className="size-4" /> Ruler
        </Button>
        <div className="inline-flex items-center gap-1 rounded-lg border border-border">
          <button type="button" onClick={() => setFontSize(fontSize - 2)} aria-label="Smaller text" className="p-1.5 text-ink-muted hover:text-ink">
            <Minus className="size-4" />
          </button>
          <span className="w-8 text-center text-xs tabular-nums text-ink-muted">{fontSize}</span>
          <button type="button" onClick={() => setFontSize(fontSize + 2)} aria-label="Larger text" className="p-1.5 text-ink-muted hover:text-ink">
            <Plus className="size-4" />
          </button>
        </div>

        {speech.supported && !kinetic ? (
          <div className="ml-auto flex items-center gap-2">
            <select value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label="Reading speed" className="rounded-lg border border-border bg-surface-raised px-2 py-1 text-xs text-ink">
              {[0.8, 1, 1.2, 1.4, 1.7, 2].map((r) => (
                <option key={r} value={r}>
                  {r}×
                </option>
              ))}
            </select>
            {speech.speaking ? (
              <Button variant="secondary" size="sm" onClick={speech.stop}>
                <Pause className="size-4" /> Stop
              </Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => speech.speakFrom(sentences, 0, rate)}>
                <Play className="size-4" /> Read aloud
              </Button>
            )}
          </div>
        ) : null}
      </div>

      {kinetic ? (
        <ReadingRuler enabled={ruler} height={Math.round(fontSize * 2.4)}>
          <KineticReader
            key={hashString(text)}
            text={text}
            fontSize={fontSize}
            bionic={bionic}
            initialUnlocked={kineticUnlocked}
            onProgress={(n) => setKineticUnlocked(n)}
            finale={
              <Button variant="soft" size="sm" onClick={() => { setKineticUnlocked(0); setEditing(true); }}>
                Paste something new
              </Button>
            }
          />
        </ReadingRuler>
      ) : (
      <ReadingRuler enabled={ruler} height={Math.round(fontSize * 2.4)}>
        <article className="mx-auto max-w-2xl rounded-2xl border border-border bg-surface-raised px-6 py-8 leading-relaxed text-ink shadow-soft sm:px-10" style={{ fontSize }}>
          {speech.speaking || speech.currentIndex >= 0 ? (
            <p>
              {sentences.map((s, i) => (
                <span key={i}>
                  <button
                    type="button"
                    onClick={() => speech.speakFrom(sentences, i, rate)}
                    className={`rounded px-0.5 text-left transition-colors ${i === speech.currentIndex ? "bg-accent-soft" : "hover:bg-surface-sunken"}`}
                  >
                    {s}
                  </button>{" "}
                </span>
              ))}
            </p>
          ) : (
            <BionicText text={text} enabled={bionic} />
          )}
        </article>
      </ReadingRuler>
      )}
      <p className="text-center text-xs text-ink-faint">
        {words} words · about {minutes} min at a normal pace. {kinetic ? "Each section unlocks the next." : "Partway counts."}
      </p>
    </div>
  );
}
