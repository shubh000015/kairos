"use client";

import { BookOpen, ChevronLeft, ChevronRight, ExternalLink, FileText, Loader2, MessageSquarePlus, Pause, Play, ScanLine, Trash2, Type, Upload, Zap } from "lucide-react";
import { useCallback, useEffect, useRef, useState, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { splitSentences, useSpeech } from "@/hooks/useSpeech";
import { useStuckDetector, type StuckReason } from "@/hooks/useStuckDetector";
import { parsePdfPage, type ParsedPage } from "@/lib/pdfParse";
import { useStudyStore } from "@/store/useStudyStore";
import { Button, IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Pill } from "@/components/ui/Misc";
import { toast } from "@/components/ui/Toast";
import { BionicText } from "./BionicText";
import { KineticReader } from "./KineticReader";
import { ReadingRuler } from "./ReadingRuler";
import { StuckNudge } from "./StuckNudge";

type PdfJs = typeof import("pdfjs-dist");
type PdfDocument = import("pdfjs-dist").PDFDocumentProxy;

let pdfjsPromise: Promise<PdfJs> | null = null;
function loadPdfJs(): Promise<PdfJs> {
  if (!pdfjsPromise) {
    pdfjsPromise = import("pdfjs-dist").then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      return mod;
    });
  }
  return pdfjsPromise;
}

/**
 * Original page stays visible. Parsing (text, figures, OCR) happens beside it
 * for kinetic / bionic / read-aloud — never instead of the PDF.
 */
export function PdfReader() {
  const pdfs = useStudyStore((s) => s.pdfs);
  const upsertPdf = useStudyStore((s) => s.upsertPdf);
  const setPdfPage = useStudyStore((s) => s.setPdfPage);
  const setPdfGoal = useStudyStore((s) => s.setPdfGoal);
  const addPdfNote = useStudyStore((s) => s.addPdfNote);
  const removePdfNote = useStudyStore((s) => s.removePdfNote);
  const kinetic = useStudyStore((s) => s.kinetic);
  const setKinetic = useStudyStore((s) => s.setKinetic);

  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [pdfjs, setPdfjs] = useState<PdfJs | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [parsedHold, setParsedHold] = useState<{ key: string; page: number; data: ParsedPage } | null>(null);
  const [ocrToken, setOcrToken] = useState<string | null>(null);
  const [bionic, setBionic] = useState(false);
  const [ruler, setRuler] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState("");
  const [rate, setRate] = useState(1);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const frameRef = useRef<HTMLDivElement>(null);
  const parseRef = useRef<HTMLDivElement>(null);
  const renderTask = useRef<{ cancel: () => void } | null>(null);
  const fileUrlRef = useRef<string | null>(null);
  const speech = useSpeech();

  const parsed = parsedHold && parsedHold.key === key && parsedHold.page === page ? parsedHold.data : null;
  const ocrRunning = ocrToken === `${key}:${page}`;
  const pageText = parsed?.text ?? "";
  const [stuck, setStuck] = useState<StuckReason | null>(null);
  useStuckDetector({
    target: parseRef,
    contextKey: `${key ?? ""}:${page}`,
    enabled: !!doc && !!pageText && !kinetic,
    onStuck: setStuck,
  });

  const session = key ? pdfs[key] : undefined;
  const pagesRead = Math.max(0, page - startPage + 1);
  const goal = session?.pageGoal ?? 3;
  const goalDone = pagesRead >= goal;

  const openFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setError("That isn't a PDF.");
        return;
      }
      setError(null);
      setLoading(true);
      speech.stop();
      try {
        const lib = await loadPdfJs();
        const data = await file.arrayBuffer();
        const loaded = await lib.getDocument({ data, useSystemFonts: true }).promise;
        const k = `${file.name}:${file.size}`;
        const prev = useStudyStore.getState().pdfs[k];
        const first = Math.min(prev?.lastPage ?? 1, loaded.numPages);
        void doc?.loadingTask.destroy();
        if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
        const url = URL.createObjectURL(file);
        fileUrlRef.current = url;
        setFileUrl(url);
        setFileName(file.name);
        setPdfjs(lib);
        setDoc(loaded);
        setKey(k);
        setPage(first);
        setStartPage(first);
        setParsedHold(null);
        upsertPdf({ key: k, name: file.name, pageCount: loaded.numPages });
        toast(prev ? `Back to page ${first}.` : `Opened. ${loaded.numPages} pages — original stays on the left.`);
      } catch {
        setError("Couldn't open that file. It may be encrypted or damaged.");
      } finally {
        setLoading(false);
      }
    },
    [doc, upsertPdf, speech],
  );

  const onPick = (e: ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    if (f) void openFile(f);
    e.target.value = "";
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) void openFile(f);
  };

  useEffect(() => () => {
    if (fileUrlRef.current) URL.revokeObjectURL(fileUrlRef.current);
  }, []);

  // Render the original page, then parse beside it.
  useEffect(() => {
    if (!doc || !key || !pdfjs) return;
    let cancelled = false;
    const token = `${key}:${page}`;
    (async () => {
      try {
        const p = await doc.getPage(page);
        const frameWidth = frameRef.current?.clientWidth ?? 700;
        const base = p.getViewport({ scale: 1 });
        const scale = Math.min(2.4, Math.max(0.6, (frameWidth - 2) / base.width));
        const dpr = Math.min(window.devicePixelRatio || 1, 2);
        const viewport = p.getViewport({ scale });

        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        canvas.width = Math.floor(viewport.width * dpr);
        canvas.height = Math.floor(viewport.height * dpr);
        canvas.style.width = `${Math.floor(viewport.width)}px`;
        canvas.style.height = `${Math.floor(viewport.height)}px`;
        renderTask.current?.cancel();
        const task = p.render({ canvas, canvasContext: ctx, viewport, transform: dpr !== 1 ? [dpr, 0, 0, dpr, 0, 0] : undefined });
        renderTask.current = task;
        await task.promise.catch(() => {});
        if (cancelled) return;
        setPdfPage(key, page);

        const cssWidth = Math.floor(viewport.width);
        const cssHeight = Math.floor(viewport.height);
        const result = await parsePdfPage({
          pdfjs,
          page: p,
          pageCanvas: canvas,
          cssWidth,
          cssHeight,
          runOcr: true,
          onOcrStart: () => {
            if (!cancelled) setOcrToken(token);
          },
        });
        if (cancelled) return;
        setParsedHold({ key, page, data: result });
        setOcrToken((cur) => (cur === token ? null : cur));
      } catch {
        if (!cancelled) setError("Couldn't render that page.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, key, page, pdfjs, setPdfPage]);

  useEffect(() => () => void doc?.loadingTask.destroy(), [doc]);

  const go = (next: number) => {
    if (!doc) return;
    const clamped = Math.min(doc.numPages, Math.max(1, next));
    speech.stop();
    setPage(clamped);
  };

  const saveNote = (e: FormEvent) => {
    e.preventDefault();
    if (!key || !note.trim()) return;
    addPdfNote(key, note, page);
    setNote("");
    toast(`Noted on page ${page}.`);
  };

  const sentences = splitSentences(pageText);
  const recents = Object.values(pdfs).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  if (!doc) {
    return (
      <div className="flex flex-col gap-5">
        <label
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex cursor-pointer flex-col items-center gap-3 rounded-3xl border-2 border-dashed px-6 py-14 text-center transition-colors ${
            dragging ? "border-accent bg-accent-soft/50" : "border-border bg-surface-raised hover:border-ink-faint"
          }`}
        >
          {loading ? <Loader2 className="size-8 animate-spin text-ink-faint" /> : <Upload className="size-8 text-ink-faint" />}
          <div className="text-ink">{loading ? "Opening…" : "Drop a PDF here, or click to choose"}</div>
          <p className="max-w-sm text-sm text-ink-muted">Stays on your device. The original page stays put; we parse text and figures beside it for reading tools.</p>
          <input type="file" accept="application/pdf,.pdf" onChange={onPick} className="sr-only" />
        </label>
        {error ? <p className="text-sm text-urgent">{error}</p> : null}
        {recents.length > 0 ? (
          <div className="rounded-2xl border border-border bg-surface-raised p-4">
            <h3 className="mb-2 text-sm font-medium text-ink-muted">You were reading</h3>
            <ul className="space-y-1 text-sm">
              {recents.map((r) => (
                <li key={r.key} className="flex items-center justify-between gap-3 text-ink">
                  <span className="inline-flex min-w-0 items-center gap-2"><FileText className="size-4 shrink-0 text-ink-faint" /><span className="truncate">{r.name}</span></span>
                  <span className="shrink-0 text-ink-faint">page {r.lastPage} of {r.pageCount}{r.notes.length ? ` · ${r.notes.length} notes` : ""}</span>
                </li>
              ))}
            </ul>
            <p className="mt-2 text-xs text-ink-faint">Open the same file again to pick up where you left off.</p>
          </div>
        ) : null}
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2 text-sm">
        <div className="inline-flex items-center rounded-lg border border-border">
          <IconButton label="Previous page" onClick={() => go(page - 1)} disabled={page <= 1}><ChevronLeft className="size-4" /></IconButton>
          <form onSubmit={(e) => { e.preventDefault(); const v = Number((e.currentTarget.elements.namedItem("p") as HTMLInputElement).value); if (v) go(v); }} className="flex items-center gap-1 px-1 text-xs text-ink-muted">
            <input name="p" key={page} defaultValue={page} inputMode="numeric" aria-label="Page number" className="w-10 rounded bg-transparent text-center tabular-nums text-ink focus:outline-none" />
            / {doc.numPages}
          </form>
          <IconButton label="Next page" onClick={() => go(page + 1)} disabled={page >= doc.numPages}><ChevronRight className="size-4" /></IconButton>
        </div>

        <Button variant={ruler ? "soft" : "ghost"} size="sm" onClick={() => setRuler((r) => !r)} aria-pressed={ruler}><ScanLine className="size-4" /> Ruler</Button>
        <Button variant={kinetic ? "soft" : "ghost"} size="sm" onClick={() => { speech.stop(); setKinetic(!kinetic); }} aria-pressed={kinetic} title="Blur what's ahead; clear a tiny puzzle to unlock the next section"><Zap className="size-4" /> Kinetic</Button>
        <Button variant={bionic ? "soft" : "ghost"} size="sm" onClick={() => setBionic((b) => !b)} aria-pressed={bionic}><Type className="size-4" /> Bionic</Button>

        {fileUrl ? (
          <a href={fileUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs text-ink-muted hover:text-ink">
            <ExternalLink className="size-3.5" /> Original file{fileName ? ` · ${fileName}` : ""}
          </a>
        ) : null}

        {speech.supported && pageText ? (
          <div className="ml-auto flex items-center gap-2">
            <select value={rate} onChange={(e) => setRate(Number(e.target.value))} aria-label="Reading speed" className="rounded-lg border border-border bg-surface-raised px-2 py-1 text-xs text-ink">
              {[0.8, 1, 1.2, 1.4, 1.7].map((r) => <option key={r} value={r}>{r}×</option>)}
            </select>
            {speech.speaking ? (
              <Button variant="secondary" size="sm" onClick={speech.stop}><Pause className="size-4" /> Stop</Button>
            ) : (
              <Button variant="secondary" size="sm" onClick={() => speech.speakFrom(sentences, 0, rate)}><Play className="size-4" /> Read parsed text</Button>
            )}
          </div>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-3 rounded-xl border border-border bg-surface-raised px-4 py-2.5 text-sm">
        <span className="text-ink-muted">This sitting:</span>
        <div className="inline-flex items-center gap-1">
          {[1, 2, 3, 5, 8].map((g) => (
            <button key={g} type="button" onClick={() => key && setPdfGoal(key, g)} aria-pressed={goal === g} className={`rounded-full border px-2.5 py-0.5 text-xs ${goal === g ? "border-accent bg-accent-soft text-ink" : "border-border text-ink-muted hover:text-ink"}`}>{g} page{g === 1 ? "" : "s"}</button>
          ))}
        </div>
        <div className="ml-auto flex items-center gap-2">
          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuenow={Math.min(pagesRead, goal)} aria-valuemin={0} aria-valuemax={goal}>
            <div className="h-full bg-accent transition-[width]" style={{ width: `${Math.min(100, (pagesRead / goal) * 100)}%` }} />
          </div>
          {goalDone ? <Pill tone="sage">Goal met — stop or keep going, both fine</Pill> : <span className="text-xs tabular-nums text-ink-faint">{pagesRead}/{goal}</span>}
        </div>
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]">
        <div className="flex flex-col gap-2">
          <div className="flex items-center gap-2 text-xs text-ink-faint">
            <BookOpen className="size-3.5" /> Original page
          </div>
          <ReadingRuler enabled={ruler} height={64}>
            <div ref={frameRef} className="overflow-auto rounded-2xl border border-border bg-surface-sunken/60 p-2 shadow-soft">
              <div className="flex justify-center">
                <canvas ref={canvasRef} className="max-w-full rounded-md bg-surface shadow-soft" aria-label={`Original PDF page ${page}`} />
              </div>
            </div>
          </ReadingRuler>
        </div>

        <div className="flex flex-col gap-3">
          <div className="flex items-center gap-2 text-xs text-ink-faint">
            <Type className="size-3.5" /> Parsed for study
            {ocrRunning ? (
              <span className="inline-flex items-center gap-1 text-ink-muted"><Loader2 className="size-3 animate-spin" /> OCR…</span>
            ) : parsed?.source === "ocr" ? (
              <span>from scan</span>
            ) : parsed?.source === "mixed" ? (
              <span>text + figure OCR</span>
            ) : parsed ? (
              <span>embedded text</span>
            ) : (
              <span>reading page…</span>
            )}
          </div>
          <div ref={parseRef} className="min-h-[12rem] overflow-auto rounded-2xl border border-border bg-surface-raised shadow-soft">
            {kinetic && pageText && !(speech.speaking || speech.currentIndex >= 0) ? (
              <div className="px-2 py-4 text-[1.05rem] sm:px-4">
                <KineticReader
                  key={`${key}:${page}`}
                  text={pageText}
                  bionic={bionic}
                  className="[&>article]:border-0 [&>article]:shadow-none"
                  finale={
                    page < doc.numPages ? (
                      <Button variant="soft" size="sm" onClick={() => go(page + 1)}>
                        Page {page + 1} <ChevronRight className="size-4" />
                      </Button>
                    ) : (
                      <span className="text-ink-muted">Last page. That&apos;s the document.</span>
                    )
                  }
                />
              </div>
            ) : (
              <article className="flex flex-col gap-4 px-5 py-6 text-[1.05rem] leading-relaxed text-ink sm:px-7">
                {parsed?.blocks.length ? (
                  parsed.blocks.map((block, i) =>
                    block.type === "figure" ? (
                      <figure key={block.figure.id} className="overflow-hidden rounded-xl border border-border bg-surface">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={block.figure.src} alt={block.figure.label || "Figure from this page"} className="mx-auto max-h-[28rem] w-auto max-w-full object-contain" />
                        {block.figure.label ? <figcaption className="px-3 py-2 text-sm text-ink-muted">{block.figure.label}</figcaption> : <figcaption className="px-3 py-2 text-xs text-ink-faint">Figure on this page</figcaption>}
                        {block.figure.ocr ? <p className="border-t border-border px-3 py-2 text-sm text-ink">{bionic ? <BionicText text={block.figure.ocr} enabled /> : block.figure.ocr}</p> : null}
                      </figure>
                    ) : speech.speaking || speech.currentIndex >= 0 ? (
                      <p key={`t-${i}`}>
                        {splitSentences(block.text).map((s, si) => {
                          const all = sentences;
                          const idx = all.indexOf(s);
                          return (
                            <span key={si}>
                              <button type="button" onClick={() => speech.speakFrom(all, idx >= 0 ? idx : 0, rate)} className={`rounded px-0.5 text-left ${idx === speech.currentIndex ? "bg-accent-soft" : "hover:bg-surface-sunken"}`}>{s}</button>{" "}
                            </span>
                          );
                        })}
                      </p>
                    ) : (
                      <div key={`t-${i}`}><BionicText text={block.text} enabled={bionic} /></div>
                    ),
                  )
                ) : ocrRunning ? (
                  <p className="text-ink-muted">Reading this scan. The original page stays on the left.</p>
                ) : (
                  <p className="text-ink-faint">No selectable text yet — the original page is still there. If this is a scan, OCR will fill this pane.</p>
                )}
              </article>
            )}
          </div>

          <form onSubmit={saveNote} className="flex items-center gap-2">
            <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Note for page ${page}`} aria-label="Page note" />
            <IconButton label="Save note" type="submit" className="shrink-0 bg-accent-soft text-ink"><MessageSquarePlus className="size-4" /></IconButton>
          </form>
          {session && session.notes.length > 0 ? (
            <ul className="flex max-h-[16rem] flex-col gap-1.5 overflow-y-auto pr-1">
              {session.notes.map((n) => (
                <li key={n.id} className="group flex items-start gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm">
                  <button type="button" onClick={() => go(n.at)} className="shrink-0 font-mono text-xs text-mist-600 hover:underline dark:text-mist-300">p.{n.at}</button>
                  <span className="flex-1 text-ink">{n.text}</span>
                  <button type="button" onClick={() => key && removePdfNote(key, n.id)} aria-label="Delete note" className="text-ink-faint opacity-0 group-hover:opacity-100 focus:opacity-100"><Trash2 className="size-3.5" /></button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-ink-faint">Page notes land here. Click one to jump to its page.</p>
          )}
          <label className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-border px-3 py-2 text-sm text-ink-muted hover:text-ink">
            <Upload className="size-4" /> Open a different PDF
            <input type="file" accept="application/pdf,.pdf" onChange={onPick} className="sr-only" />
          </label>
        </div>
      </div>
      {error ? <p className="text-sm text-urgent">{error}</p> : null}
      {pageText ? <StuckNudge open={stuck !== null} reason={stuck} variant={{ kind: "reading", text: pageText }} onClose={() => setStuck(null)} /> : null}
    </div>
  );
}
