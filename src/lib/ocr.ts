/**
 * On-device OCR via tesseract.js. Loaded lazily so the PDF reader stays light
 * until a scan or figure actually needs it. Workers are fetched from a CDN;
 * if that fails we return empty string and leave the original page visible.
 */

type TessWorker = {
  recognize: (image: HTMLCanvasElement | string) => Promise<{ data: { text: string } }>;
};

let worker: TessWorker | null = null;
let starting: Promise<TessWorker | null> | null = null;

async function getWorker(): Promise<TessWorker | null> {
  if (typeof window === "undefined") return null;
  if (worker) return worker;
  if (!starting) {
    starting = (async () => {
      try {
        const { createWorker } = await import("tesseract.js");
        const w = await createWorker("eng", 1, {
          workerPath: "https://cdn.jsdelivr.net/npm/tesseract.js@5/dist/worker.min.js",
          corePath: "https://cdn.jsdelivr.net/npm/tesseract.js-core@5/tesseract-core-simd-lstm.wasm.js",
          langPath: "https://tessdata.projectnaptha.com/4.0.0",
        });
        worker = w as TessWorker;
        return worker;
      } catch {
        starting = null;
        return null;
      }
    })();
  }
  return starting;
}

/** Downscale + contrast so Tesseract sees print, not a huge photograph. */
export function prepareForOcr(src: HTMLCanvasElement, maxWidth = 1600): HTMLCanvasElement {
  const scale = Math.min(2, maxWidth / Math.max(1, src.width));
  const w = Math.max(1, Math.round(src.width * scale));
  const h = Math.max(1, Math.round(src.height * scale));
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  const ctx = c.getContext("2d");
  if (!ctx) return src;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  try {
    ctx.filter = "grayscale(1) contrast(1.25) brightness(1.05)";
  } catch {
    // filter is optional
  }
  ctx.drawImage(src, 0, 0, w, h);
  return c;
}

export async function ocrCanvas(source: HTMLCanvasElement): Promise<string> {
  const w = await getWorker();
  if (!w) return "";
  try {
    const prepared = prepareForOcr(source);
    const { data } = await w.recognize(prepared);
    return cleanupOcrText(data.text ?? "");
  } catch {
    return "";
  }
}

export function cleanupOcrText(raw: string): string {
  return raw
    .replace(/\u000c/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[^\S\n]{2,}/g, " ")
    .trim();
}
