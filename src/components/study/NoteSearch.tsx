"use client";

import { Cpu, Loader2, Search } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useShallow } from "zustand/react/shallow";
import { useOnDeviceModel } from "@/hooks/useOnDeviceModel";
import { loadModel, MODEL_SIZE_LABEL, semanticSearch } from "@/lib/ondevice";
import { useParkingLotStore } from "@/store/useParkingLotStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { useStudyStore } from "@/store/useStudyStore";
import { useTaskStore } from "@/store/useTaskStore";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";

interface Item {
  id: string;
  text: string;
  where: string;
}

interface Hit extends Item {
  score: number;
}

const fmt = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.floor(sec % 60)).padStart(2, "0")}`;

/** Plain keyword match: what you get before the on-device model is switched on. */
function keywordSearch(query: string, items: Item[]): Hit[] {
  const terms = query.toLowerCase().split(/\s+/).filter((t) => t.length > 1);
  if (!terms.length) return [];
  return items
    .map((it) => {
      const t = it.text.toLowerCase();
      const hits = terms.filter((w) => t.includes(w)).length;
      return { ...it, score: hits / terms.length };
    })
    .filter((h) => h.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 8);
}

/**
 * Search everything you've written — lecture notes, page notes, parked thoughts,
 * tasks — by meaning. Embeddings are computed in this browser; nothing is uploaded.
 */
export function NoteSearch() {
  const onDevice = useSettingsStore((s) => s.onDeviceML);
  const setSetting = useSettingsStore((s) => s.set);
  const model = useOnDeviceModel();
  const videos = useStudyStore(useShallow((s) => Object.values(s.videos)));
  const pdfs = useStudyStore(useShallow((s) => Object.values(s.pdfs)));
  const thoughts = useParkingLotStore(useShallow((s) => s.thoughts));
  const tasks = useTaskStore(useShallow((s) => s.tasks));

  const items = useMemo<Item[]>(() => {
    const out: Item[] = [];
    for (const v of videos) for (const n of v.notes) out.push({ id: `v:${n.id}`, text: n.text, where: `${v.title || "Lecture"} · ${fmt(n.at)}` });
    for (const p of pdfs) for (const n of p.notes) out.push({ id: `p:${n.id}`, text: n.text, where: `${p.name} · page ${n.at}` });
    for (const t of thoughts) out.push({ id: `t:${t.id}`, text: t.text, where: "Parked thought" });
    for (const t of tasks) {
      const steps = t.steps.map((s) => s.text).join(". ");
      out.push({ id: `k:${t.id}`, text: steps ? `${t.title}. ${steps}` : t.title, where: t.done ? "Task · done" : "Task" });
    }
    return out;
  }, [videos, pdfs, thoughts, tasks]);

  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<Hit[] | null>(null);
  const [busy, setBusy] = useState(false);
  const [mode, setMode] = useState<"semantic" | "keyword">("keyword");
  const debounce = useRef<number | null>(null);
  const run = useRef(0);

  const search = async (q: string) => {
    const id = ++run.current;
    if (!q.trim()) {
      setHits(null);
      return;
    }
    if (!onDevice) {
      setMode("keyword");
      setHits(keywordSearch(q, items));
      return;
    }
    setBusy(true);
    try {
      const r = await semanticSearch(q, items, 8);
      if (id === run.current) {
        setMode("semantic");
        setHits(r.filter((h) => h.score > 0.18));
      }
    } catch {
      if (id === run.current) {
        setMode("keyword");
        setHits(keywordSearch(q, items));
      }
    } finally {
      if (id === run.current) setBusy(false);
    }
  };

  const onChange = (q: string) => {
    setQuery(q);
    if (debounce.current) window.clearTimeout(debounce.current);
    debounce.current = window.setTimeout(() => void search(q), 300);
  };

  const enable = () => {
    setSetting("onDeviceML", true);
    void loadModel().catch(() => {});
  };

  return (
    <Card>
      <CardHeader
        icon={<Search className="size-5" />}
        title="Find anything you wrote"
        description="Lecture notes, page notes, parked thoughts and tasks — searched by meaning, on this device."
      />
      <CardBody className="flex flex-col gap-4 pt-2">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-ink-faint" />
          <Input
            value={query}
            onChange={(e) => onChange(e.target.value)}
            placeholder={onDevice ? "e.g. “why do neurons fire”, “that thing about deadlines”" : "Search your notes"}
            aria-label="Search your notes"
            className="pl-9"
          />
          {busy ? <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-ink-faint" /> : null}
        </div>

        {!onDevice ? (
          <div className="flex flex-wrap items-center gap-3 rounded-xl border border-dashed border-border px-3 py-2 text-sm text-ink-muted">
            <Cpu className="size-4 text-ink-faint" />
            <span className="flex-1">Keyword search for now. Turn on on-device search to find notes by meaning ({MODEL_SIZE_LABEL}, downloaded once, runs offline).</span>
            <Button size="sm" variant="soft" onClick={enable}>Turn on</Button>
          </div>
        ) : model.status === "loading" ? (
          <div className="text-xs text-ink-faint">
            Downloading the model once… {Math.round(model.progress * 100)}%
            <div className="mt-1 h-1 overflow-hidden rounded-full bg-surface-sunken">
              <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.round(model.progress * 100)}%` }} />
            </div>
          </div>
        ) : model.status === "error" ? (
          <p className="text-xs text-urgent">The model couldn&apos;t load ({model.error}). Keyword search still works.</p>
        ) : model.status === "ready" ? (
          <p className="text-xs text-ink-faint">On-device model ready · {model.device === "webgpu" ? "WebGPU" : "WASM"} · {items.length} items indexed</p>
        ) : null}

        {hits === null ? (
          items.length === 0 ? <p className="text-sm text-ink-muted">Nothing written yet. Notes from lectures, PDFs and the parking lot will show up here.</p> : null
        ) : hits.length === 0 ? (
          <p className="text-sm text-ink-muted">Nothing close. Try different words{mode === "keyword" ? " — or turn on on-device search to match by meaning" : ""}.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-border">
            {hits.map((h) => (
              <li key={h.id} className="flex items-start gap-3 py-2.5">
                <span className="mt-1.5 h-1.5 w-10 shrink-0 overflow-hidden rounded-full bg-surface-sunken" aria-hidden>
                  <span className="block h-full bg-accent" style={{ width: `${Math.round(Math.max(0.1, Math.min(1, h.score)) * 100)}%` }} />
                </span>
                <div className="min-w-0">
                  <div className="text-sm text-ink">{h.text}</div>
                  <div className="text-xs text-ink-faint">{h.where}</div>
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardBody>
    </Card>
  );
}
