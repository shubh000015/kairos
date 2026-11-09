"use client";

import { ChevronLeft, ChevronRight, FileText, Loader2, Maximize2, MessageSquarePlus, Minimize2, Minus, Pause, Play, Plus, ScanLine, StickyNote, Trash2, Upload } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type ChangeEvent, type DragEvent, type FormEvent } from "react";
import { splitSentences, useSpeech } from "@/hooks/useSpeech";
import { useStuckDetector, type StuckReason } from "@/hooks/useStuckDetector";
import { extractPageText } from "@/lib/pdfParse";
import { useStudyStore } from "@/store/useStudyStore";
import { IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toast } from "@/components/ui/Toast";
import { ReadingRuler } from "./ReadingRuler";
import { StuckNudge } from "./StuckNudge";
import { ViewerToolstrip } from "./ViewerToolstrip";

type PdfJs = typeof import("pdfjs-dist");
type PdfDocument = import("pdfjs-dist").PDFDocumentProxy;
type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };

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

function fullscreenElement(): Element | null {
  const doc = document as FsDoc;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function subscribeFullscreen(onStoreChange: () => void) {
  document.addEventListener("fullscreenchange", onStoreChange);
  document.addEventListener("webkitfullscreenchange", onStoreChange);
  return () => {
    document.removeEventListener("fullscreenchange", onStoreChange);
    document.removeEventListener("webkitfullscreenchange", onStoreChange);
  };
}

function pdfHash(page: number, zoom: number) {
  const bits = [`page=${page}`, "toolbar=0", "navpanes=0", "scrollbar=0"];
  if (zoom === 1) bits.push("view=FitH");
  else bits.push(`zoom=${Math.round(zoom * 100)}`);
  return bits.join("&");
}

/**
 * The uploaded file itself, one page at a time — the browser's PDF engine,
 * not a reconstructed transcript. Music and notes stay in the thin toolbar.
 */
export function PdfReader() {
  const pdfs = useStudyStore((s) => s.pdfs);
  const upsertPdf = useStudyStore((s) => s.upsertPdf);
  const setPdfPage = useStudyStore((s) => s.setPdfPage);
  const setPdfGoal = useStudyStore((s) => s.setPdfGoal);
  const addPdfNote = useStudyStore((s) => s.addPdfNote);
  const removePdfNote = useStudyStore((s) => s.removePdfNote);

  const [doc, setDoc] = useState<PdfDocument | null>(null);
  const [key, setKey] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [startPage, setStartPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pageText, setPageText] = useState("");
  const [ruler, setRuler] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [note, setNote] = useState("");
  const [notesOpen, setNotesOpen] = useState(false);
  const [zoom, setZoom] = useState(1);
  const [fileName, setFileName] = useState<string | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  const frameRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<HTMLDivElement>(null);
  const fileUrlRef = useRef<string | null>(null);
  const speech = useSpeech();

  const viewerFs = useSyncExternalStore(
    subscribeFullscreen,
    () => Boolean(fullscreenElement()?.hasAttribute("data-pdf-viewer")),
    () => false,
  );

  const [stuck, setStuck] = useState<StuckReason | null>(null);
  useStuckDetector({
    target: frameRef,
    contextKey: `${key ?? ""}:${page}`,
    enabled: !!doc && !!pageText,
    onStuck: setStuck,
  });

  const session = key ? pdfs[key] : undefined;
  const pagesRead = Math.max(0, page - startPage + 1);
  const goal = session?.pageGoal ?? 3;
  const recents = Object.values(pdfs).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 5);

  const openFile = useCallback(
    async (file: File) => {
      if (file.type !== "application/pdf" && !file.name.toLowerCase().endsWith(".pdf")) {
        setError("That isn't a PDF.");
        return;
      }
      setError(null);
      setLoading(true);
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
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
        setDoc(loaded);
        setKey(k);
        setPage(first);
        setStartPage(first);
        setZoom(1);
        setPageText("");
        upsertPdf({ key: k, name: file.name, pageCount: loaded.numPages });
        toast(prev ? `Back to page ${first}.` : `Opened. ${loaded.numPages} pages.`);
      } catch {
        setError("Couldn't open that file. It may be encrypted or damaged.");
      } finally {
        setLoading(false);
      }
    },
    [doc, upsertPdf],
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

  useEffect(() => {
    if (!doc || !key) return;
    let cancelled = false;
    (async () => {
      try {
        const p = await doc.getPage(page);
        const text = await extractPageText(p);
        if (cancelled) return;
        setPdfPage(key, page);
        setPageText(text);
      } catch {
        if (!cancelled) setError("Couldn't read that page.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [doc, key, page, setPdfPage]);

  useEffect(() => () => void doc?.loadingTask.destroy(), [doc]);

  const go = useCallback(
    (next: number) => {
      if (!doc) return;
      speech.stop();
      setPage(Math.min(doc.numPages, Math.max(1, next)));
    },
    [doc, speech],
  );

  useEffect(() => {
    if (!doc) return;
    const onKey = (e: KeyboardEvent) => {
      const t = e.target as HTMLElement | null;
      if (t instanceof HTMLInputElement || t instanceof HTMLTextAreaElement || t?.isContentEditable) return;
      if (e.key === "ArrowRight" || e.key === "PageDown") {
        e.preventDefault();
        go(page + 1);
      } else if (e.key === "ArrowLeft" || e.key === "PageUp") {
        e.preventDefault();
        go(page - 1);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [doc, page, go]);

  const saveNote = (e: FormEvent) => {
    e.preventDefault();
    if (!key || !note.trim()) return;
    addPdfNote(key, note, page);
    setNote("");
    toast(`Noted on page ${page}.`);
  };

  const toggleViewerFs = () => {
    const stage = viewerRef.current;
    if (!stage) return;
    if (viewerFs) {
      const exit = document.exitFullscreen?.bind(document) ?? (document as FsDoc).webkitExitFullscreen?.bind(document);
      void Promise.resolve(exit?.()).catch(() => undefined);
      return;
    }
    const req =
      stage.requestFullscreen?.bind(stage) ??
      (stage as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen?.bind(stage);
    void Promise.resolve(req?.()).catch(() => undefined);
  };

  const sentences = splitSentences(pageText);

  if (!doc || !fileUrl) {
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
          <p className="max-w-sm text-sm text-ink-muted">Stays on your device. You read the original file, one page at a time — like a normal PDF viewer.</p>
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

  const src = `${fileUrl}#${pdfHash(page, zoom)}`;

  return (
    <div ref={viewerRef} data-pdf-viewer className="pdf-viewer flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-border bg-[#3a434c] shadow-soft">
      <div className="pdf-toolbar relative z-30 flex shrink-0 flex-wrap items-center gap-1 border-b border-black/20 bg-surface-raised/95 px-2 py-1.5 backdrop-blur">
        <span className="mr-2 hidden max-w-[10rem] truncate px-1 text-xs text-ink-muted sm:inline" title={fileName ?? undefined}>
          {fileName}
        </span>

        <div className="inline-flex items-center rounded-lg border border-border">
          <IconButton label="Previous page" onClick={() => go(page - 1)} disabled={page <= 1}><ChevronLeft className="size-4" /></IconButton>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const v = Number((e.currentTarget.elements.namedItem("p") as HTMLInputElement).value);
              if (v) go(v);
            }}
            className="flex items-center gap-1 px-1 text-xs text-ink-muted"
          >
            <input name="p" key={page} defaultValue={page} inputMode="numeric" aria-label="Page number" className="w-10 rounded bg-transparent text-center tabular-nums text-ink focus:outline-none" />
            / {doc.numPages}
          </form>
          <IconButton label="Next page" onClick={() => go(page + 1)} disabled={page >= doc.numPages}><ChevronRight className="size-4" /></IconButton>
        </div>

        <div className="inline-flex items-center rounded-lg border border-border">
          <IconButton label="Zoom out" onClick={() => setZoom((z) => Math.max(0.5, Math.round((z - 0.15) * 100) / 100))}><Minus className="size-3.5" /></IconButton>
          <span className="w-12 text-center font-mono text-[11px] tabular-nums text-ink-muted">{Math.round(zoom * 100)}%</span>
          <IconButton label="Zoom in" onClick={() => setZoom((z) => Math.min(2.5, Math.round((z + 0.15) * 100) / 100))}><Plus className="size-3.5" /></IconButton>
        </div>

        <span className="mx-1 hidden h-4 w-px bg-border sm:inline-block" />

        <IconButton label="Reading ruler" onClick={() => setRuler((r) => !r)} aria-pressed={ruler} className={ruler ? "bg-accent-soft text-ink" : ""}>
          <ScanLine className="size-4" />
        </IconButton>

        <div className="relative">
          <IconButton label="Page notes" onClick={() => setNotesOpen((o) => !o)} aria-pressed={notesOpen} className={notesOpen ? "bg-accent-soft text-ink" : ""}>
            <StickyNote className="size-4" />
          </IconButton>
          {notesOpen ? (
            <div className="absolute left-0 top-full z-50 mt-2 w-[min(20rem,calc(100vw-2rem))] rounded-xl border border-border bg-surface-raised p-3 shadow-soft">
              <form onSubmit={saveNote} className="flex items-center gap-2">
                <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Note for page ${page}`} aria-label="Page note" />
                <IconButton label="Save note" type="submit" className="shrink-0 bg-accent-soft text-ink"><MessageSquarePlus className="size-4" /></IconButton>
              </form>
              {session && session.notes.length > 0 ? (
                <ul className="mt-2 flex max-h-40 flex-col gap-1 overflow-y-auto">
                  {session.notes.map((n) => (
                    <li key={n.id} className="group flex items-start gap-2 text-sm">
                      <button type="button" onClick={() => go(n.at)} className="shrink-0 font-mono text-xs text-mist-600 hover:underline dark:text-mist-300">p.{n.at}</button>
                      <span className="flex-1 text-ink">{n.text}</span>
                      <button type="button" onClick={() => key && removePdfNote(key, n.id)} aria-label="Delete note" className="text-ink-faint opacity-0 group-hover:opacity-100"><Trash2 className="size-3.5" /></button>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mt-2 text-xs text-ink-faint">Notes stay attached to the page.</p>
              )}
              <div className="mt-2 flex flex-wrap gap-1">
                <span className="mr-1 self-center text-[11px] text-ink-faint">this sitting</span>
                {[1, 2, 3, 5, 8].map((g) => (
                  <button key={g} type="button" onClick={() => key && setPdfGoal(key, g)} aria-pressed={goal === g} className={`rounded-full border px-2 py-0.5 text-[11px] ${goal === g ? "border-accent bg-accent-soft text-ink" : "border-border text-ink-muted"}`}>{g}p</button>
                ))}
                <span className="self-center text-[11px] tabular-nums text-ink-faint">{Math.min(pagesRead, goal)}/{goal}</span>
              </div>
            </div>
          ) : null}
        </div>

        {speech.supported && pageText ? (
          speech.speaking ? (
            <IconButton label="Stop reading" onClick={speech.stop}><Pause className="size-4" /></IconButton>
          ) : (
            <IconButton label="Read page aloud" onClick={() => speech.speakFrom(sentences, 0, 1)}>
              <Play className="size-4" />
            </IconButton>
          )
        ) : null}

        <div className="ml-auto flex items-center gap-0.5">
          <ViewerToolstrip
            extra={
              <label className="inline-flex cursor-pointer">
                <span className="inline-flex size-9 items-center justify-center rounded-lg text-ink-faint transition-colors hover:bg-surface-sunken hover:text-ink" title="Open a different PDF">
                  <Upload className="size-4" />
                </span>
                <span className="sr-only">Open a different PDF</span>
                <input type="file" accept="application/pdf,.pdf" onChange={onPick} className="sr-only" />
              </label>
            }
          />
          <IconButton label={viewerFs ? "Exit fullscreen" : "Fullscreen"} onClick={toggleViewerFs}>
            {viewerFs ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
          </IconButton>
        </div>
      </div>

      <ReadingRuler enabled={ruler} height={64} className="flex min-h-0 flex-1 flex-col">
        <div ref={frameRef} className="pdf-stage min-h-0 flex-1 overflow-hidden bg-[#525659]">
          <object key={src} data={src} type="application/pdf" className="h-full w-full" aria-label={`${fileName ?? "PDF"} page ${page}`}>
            <iframe title={fileName ?? "PDF"} src={src} className="h-full w-full border-0 bg-[#525659]" />
          </object>
        </div>
      </ReadingRuler>

      {error ? <p className="bg-surface-raised px-3 py-2 text-sm text-urgent">{error}</p> : null}
      {pageText ? <StuckNudge open={stuck !== null} reason={stuck} variant={{ kind: "reading", text: pageText }} onClose={() => setStuck(null)} /> : null}
    </div>
  );
}
