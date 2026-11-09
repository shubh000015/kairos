import { ocrCanvas } from "@/lib/ocr";

type PdfJs = typeof import("pdfjs-dist");
type PdfPage = import("pdfjs-dist").PDFPageProxy;

export type PdfFigure = {
  id: string;
  src: string;
  x: number;
  y: number;
  w: number;
  h: number;
  label?: string;
  ocr?: string;
};

export type ParseBlock =
  | { type: "text"; text: string; y: number }
  | { type: "figure"; figure: PdfFigure; y: number };

export type ParsedPage = {
  blocks: ParseBlock[];
  text: string;
  figures: PdfFigure[];
  source: "embedded" | "ocr" | "mixed";
};

type Token = { str: string; x: number; y: number; w: number; h: number; hasEOL: boolean };
type ImageBox = { name: string; x: number; y: number; w: number; h: number };

function mul(a: number[], b: number[]): number[] {
  return [
    a[0] * b[0] + a[2] * b[1],
    a[1] * b[0] + a[3] * b[1],
    a[0] * b[2] + a[2] * b[3],
    a[1] * b[2] + a[3] * b[3],
    a[0] * b[4] + a[2] * b[5] + a[4],
    a[1] * b[4] + a[3] * b[5] + a[5],
  ];
}

function apply(m: number[], x: number, y: number): [number, number] {
  return [m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]];
}

function cropPage(pageCanvas: HTMLCanvasElement, box: { x: number; y: number; w: number; h: number }, cssWidth: number, cssHeight: number): string | null {
  const sx = Math.max(0, Math.floor((box.x / cssWidth) * pageCanvas.width));
  const sy = Math.max(0, Math.floor((box.y / cssHeight) * pageCanvas.height));
  const sw = Math.min(pageCanvas.width - sx, Math.max(1, Math.floor((box.w / cssWidth) * pageCanvas.width)));
  const sh = Math.min(pageCanvas.height - sy, Math.max(1, Math.floor((box.h / cssHeight) * pageCanvas.height)));
  if (sw < 12 || sh < 12) return null;
  const c = document.createElement("canvas");
  c.width = sw;
  c.height = sh;
  const ctx = c.getContext("2d");
  if (!ctx) return null;
  ctx.drawImage(pageCanvas, sx, sy, sw, sh, 0, 0, sw, sh);
  try {
    return c.toDataURL("image/png");
  } catch {
    return null;
  }
}

function reconstructLines(tokens: Token[], pageWidth: number): { text: string; y: number; h: number }[] {
  if (tokens.length === 0) return [];
  const mid = pageWidth / 2;
  const left = tokens.filter((t) => t.x + t.w / 2 < mid - 16);
  const right = tokens.filter((t) => t.x + t.w / 2 > mid + 16);
  const gutter = tokens.length - left.length - right.length;
  const columns =
    left.length > tokens.length * 0.2 && right.length > tokens.length * 0.2 && gutter < tokens.length * 0.18
      ? [left, right]
      : [tokens];

  const lines: { text: string; y: number; h: number }[] = [];
  for (const col of columns) {
    const sorted = [...col].sort((a, b) => a.y - b.y || a.x - b.x);
    const groups: Token[][] = [];
    for (const t of sorted) {
      const last = groups[groups.length - 1];
      const prev = last?.[last.length - 1];
      const thresh = Math.max(2, (prev?.h ?? t.h) * 0.55);
      if (last && prev && Math.abs(t.y - prev.y) <= thresh) last.push(t);
      else groups.push([t]);
    }
    for (const g of groups) {
      g.sort((a, b) => a.x - b.x);
      let line = "";
      for (let i = 0; i < g.length; i++) {
        const cur = g[i];
        const prev = g[i - 1];
        if (prev) {
          const gap = cur.x - (prev.x + prev.w);
          if (prev.hasEOL || gap > Math.max(1.2, prev.h * 0.28)) line += " ";
        }
        line += cur.str;
      }
      const text = line.replace(/[ \t]{2,}/g, " ").trim();
      if (text) lines.push({ text, y: Math.min(...g.map((t) => t.y)), h: Math.max(...g.map((t) => t.h)) });
    }
  }
  return lines;
}

function captionFor(box: { x: number; y: number; w: number; h: number }, tokens: Token[]): string | undefined {
  const near = tokens.filter((t) => {
    const under = t.y >= box.y + box.h - 8 && t.y <= box.y + box.h + Math.max(40, t.h * 3.2);
    const overlapX = t.x + t.w > box.x && t.x < box.x + box.w;
    return under && overlapX;
  });
  const joined = near
    .sort((a, b) => a.y - b.y || a.x - b.x)
    .map((t) => t.str)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (/^(fig(\.|ure)?|image|table|diagram|chart|graph|plate)\b/i.test(joined) || joined.length > 8) return joined.slice(0, 180);
  return undefined;
}

async function collectImageBoxes(pdfjs: PdfJs, page: PdfPage, viewport: { width: number; height: number; convertToViewportPoint: (x: number, y: number) => number[] }): Promise<ImageBox[]> {
  const ops = await page.getOperatorList();
  const { OPS } = pdfjs;
  let ctm = [1, 0, 0, 1, 0, 0];
  const stack: number[][] = [];
  const boxes: ImageBox[] = [];

  const pushPaint = (name: string) => {
    const corners = [apply(ctm, 0, 0), apply(ctm, 1, 0), apply(ctm, 0, 1), apply(ctm, 1, 1)].map(([x, y]) => viewport.convertToViewportPoint(x, y));
    const xs = corners.map((c) => c[0]);
    const ys = corners.map((c) => c[1]);
    const x = Math.min(...xs);
    const y = Math.min(...ys);
    const w = Math.max(...xs) - x;
    const h = Math.max(...ys) - y;
    if (Number.isFinite(w) && Number.isFinite(h) && w >= 36 && h >= 36 && w * h >= 2800) {
      boxes.push({ name: String(name), x, y, w, h });
    }
  };

  for (let i = 0; i < ops.fnArray.length; i++) {
    const fn = ops.fnArray[i];
    const args = (ops.argsArray[i] ?? []) as unknown[];
    if (fn === OPS.save) stack.push(ctm.slice());
    else if (fn === OPS.restore) ctm = stack.pop() ?? ctm;
    else if (fn === OPS.transform && args.length >= 6) ctm = mul(ctm, args as number[]);
    else if (
      (fn === OPS.paintImageXObject || fn === OPS.paintImageXObjectRepeat || fn === OPS.paintInlineImageXObject) &&
      args[0] != null
    ) {
      pushPaint(String(args[0]));
    }
  }
  return boxes;
}

export function blocksToPlain(blocks: ParseBlock[]): string {
  return blocks
    .map((b) => {
      if (b.type === "text") return b.text;
      return [b.figure.label, b.figure.ocr].filter(Boolean).join("\n");
    })
    .filter(Boolean)
    .join("\n\n")
    .trim();
}

async function ocrDataUrl(src: string): Promise<string> {
  const img = document.createElement("img");
  const cropped = await new Promise<HTMLCanvasElement | null>((resolve) => {
    img.onload = () => {
      const c = document.createElement("canvas");
      c.width = img.naturalWidth;
      c.height = img.naturalHeight;
      const ctx = c.getContext("2d");
      if (!ctx) return resolve(null);
      ctx.drawImage(img, 0, 0);
      resolve(c);
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
  if (!cropped) return "";
  return ocrCanvas(cropped);
}

export async function parsePdfPage(opts: {
  pdfjs: PdfJs;
  page: PdfPage;
  pageCanvas: HTMLCanvasElement;
  cssWidth: number;
  cssHeight: number;
  runOcr?: boolean;
  onOcrStart?: () => void;
}): Promise<ParsedPage> {
  const { pdfjs, page, pageCanvas, cssWidth, cssHeight, runOcr = true, onOcrStart } = opts;
  const base = page.getViewport({ scale: 1 });
  const view = page.getViewport({ scale: cssWidth / base.width });

  const content = await page.getTextContent();
  const tokens: Token[] = [];
  for (const it of content.items) {
    if (!("str" in it) || !it.str) continue;
    const tr = it.transform as number[];
    const [x, y] = view.convertToViewportPoint(tr[4], tr[5]);
    const h = Math.max(it.height || Math.hypot(tr[2], tr[3]), 4);
    const w = it.width || Math.max(8, it.str.length * h * 0.45);
    tokens.push({ str: it.str, x, y: y - h, w, h, hasEOL: Boolean(it.hasEOL) });
  }

  const lines = reconstructLines(tokens, view.width);
  const imageBoxes = await collectImageBoxes(pdfjs, page, view);
  const pageArea = view.width * view.height;

  const figures: PdfFigure[] = [];
  let pageIsScan = false;
  for (const box of imageBoxes) {
    if (box.w * box.h > pageArea * 0.82) {
      pageIsScan = true;
      continue;
    }
    const src = cropPage(pageCanvas, { x: box.x - 6, y: box.y - 6, w: box.w + 12, h: box.h + 12 }, cssWidth, cssHeight);
    if (!src) continue;
    figures.push({
      id: `${Math.round(box.x)}-${Math.round(box.y)}-${Math.round(box.w)}`,
      src,
      x: box.x,
      y: box.y,
      w: box.w,
      h: box.h,
      label: captionFor(box, tokens),
    });
  }

  figures.sort((a, b) => b.w * b.h - a.w * a.h);
  const kept: PdfFigure[] = [];
  for (const f of figures) {
    const overlap = kept.some((g) => {
      const ix = Math.max(0, Math.min(f.x + f.w, g.x + g.w) - Math.max(f.x, g.x));
      const iy = Math.max(0, Math.min(f.y + f.h, g.y + g.h) - Math.max(f.y, g.y));
      return ix * iy > 0.72 * Math.min(f.w * f.h, g.w * g.h);
    });
    if (!overlap) kept.push(f);
  }
  kept.sort((a, b) => a.y - b.y || a.x - b.x);

  const textFromPdf = lines.map((l) => l.text).join("\n");
  const sparse = textFromPdf.replace(/\s/g, "").length < 48;
  if (sparse && imageBoxes.length > 0) pageIsScan = true;

  const blocks: ParseBlock[] = [];
  const remainingFigs = [...kept];
  for (const line of lines) {
    while (remainingFigs[0] && remainingFigs[0].y + remainingFigs[0].h * 0.4 < line.y) {
      const figure = remainingFigs.shift()!;
      blocks.push({ type: "figure", figure, y: figure.y });
    }
    const prev = blocks[blocks.length - 1];
    if (prev?.type === "text" && line.y - prev.y < Math.max(22, line.h * 1.8)) {
      prev.text += "\n" + line.text;
    } else {
      blocks.push({ type: "text", text: line.text, y: line.y });
    }
  }
  for (const figure of remainingFigs) blocks.push({ type: "figure", figure, y: figure.y });

  let source: ParsedPage["source"] = "embedded";
  if (runOcr && (pageIsScan || kept.some((f) => !f.label))) {
    onOcrStart?.();
    if (pageIsScan && sparse) {
      const ocr = await ocrCanvas(pageCanvas);
      if (ocr) {
        source = "ocr";
        const figs = blocks.filter((b) => b.type === "figure");
        const next: ParseBlock[] = [{ type: "text", text: ocr, y: 0 }, ...figs];
        return { blocks: next, text: blocksToPlain(next), figures: kept, source };
      }
    }
    for (const f of kept.slice(0, 4)) {
      const ocr = await ocrDataUrl(f.src);
      if (ocr) {
        f.ocr = ocr;
        source = "mixed";
      }
    }
  }

  const finalBlocks = blocks.length ? blocks : textFromPdf ? [{ type: "text" as const, text: textFromPdf, y: 0 }] : [];
  return { blocks: finalBlocks, text: blocksToPlain(finalBlocks), figures: kept, source };
}

/** Embedded PDF text only — used for kinetic puzzles and read-aloud, never shown as a second view. */
export async function extractPageText(page: PdfPage): Promise<string> {
  const base = page.getViewport({ scale: 1 });
  const content = await page.getTextContent();
  const tokens: Token[] = [];
  for (const it of content.items) {
    if (!("str" in it) || !it.str) continue;
    const tr = it.transform as number[];
    const [x, y] = base.convertToViewportPoint(tr[4], tr[5]);
    const h = Math.max(it.height || Math.hypot(tr[2], tr[3]), 4);
    const w = it.width || Math.max(8, it.str.length * h * 0.45);
    tokens.push({ str: it.str, x, y: y - h, w, h, hasEOL: Boolean(it.hasEOL) });
  }
  return reconstructLines(tokens, base.width)
    .map((l) => l.text)
    .join("\n")
    .trim();
}
