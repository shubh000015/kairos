/**
 * In-browser machine learning. One small quantised sentence-embedding model
 * (all-MiniLM-L6-v2, ~23 MB) is downloaded once, cached by the browser, and then
 * runs entirely on this device — WebGPU when available, WASM otherwise.
 *
 * The same embeddings power two features:
 *  - semantic extractive summaries (sentences closest to the text's centroid, de-duplicated)
 *  - semantic search across the user's notes, thoughts and tasks
 *
 * Transformers.js is dynamically imported, so none of it ships until the user opts in.
 */

import { splitSentencesPlain } from "./kinetic";

export const MODEL_ID = "Xenova/all-MiniLM-L6-v2";
export const MODEL_SIZE_LABEL = "≈23 MB";

export type ModelStatus = "idle" | "loading" | "ready" | "error";

interface ModelState {
  status: ModelStatus;
  /** 0..1 while downloading. */
  progress: number;
  device: "webgpu" | "wasm" | null;
  error: string | null;
}

type Embedder = (texts: string[], opts: { pooling: "mean"; normalize: boolean }) => Promise<{ tolist: () => number[][] }>;

let state: ModelState = { status: "idle", progress: 0, device: null, error: null };
const listeners = new Set<() => void>();
let loading: Promise<Embedder> | null = null;
let embedder: Embedder | null = null;
const cache = new Map<string, number[]>();

function update(patch: Partial<ModelState>) {
  state = { ...state, ...patch };
  listeners.forEach((l) => l());
}

export const getModelState = () => state;
export function subscribeModel(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

const SERVER_STATE: ModelState = { status: "idle", progress: 0, device: null, error: null };
export const getServerModelState = () => SERVER_STATE;

async function hasWebGPU(): Promise<boolean> {
  try {
    const gpu = (navigator as Navigator & { gpu?: { requestAdapter: () => Promise<unknown> } }).gpu;
    return !!gpu && !!(await gpu.requestAdapter());
  } catch {
    return false;
  }
}

/** Loads (or returns) the embedding pipeline. Safe to call many times. */
export function loadModel(): Promise<Embedder> {
  if (embedder) return Promise.resolve(embedder);
  if (loading) return loading;
  update({ status: "loading", progress: 0, error: null });
  loading = (async () => {
    const { pipeline, env } = await import("@huggingface/transformers");
    env.allowLocalModels = false;
    const device = (await hasWebGPU()) ? "webgpu" : "wasm";
    const files = new Map<string, { loaded: number; total: number }>();
    const create = (d: "webgpu" | "wasm") =>
      pipeline("feature-extraction", MODEL_ID, {
        device: d,
        dtype: "q8",
        progress_callback: (p: { status: string; file?: string; loaded?: number; total?: number }) => {
          if (p.status === "progress" && p.file && p.total) {
            files.set(p.file, { loaded: p.loaded ?? 0, total: p.total });
            let loaded = 0;
            let total = 0;
            files.forEach((f) => {
              loaded += f.loaded;
              total += f.total;
            });
            update({ progress: total ? loaded / total : 0 });
          }
        },
      });
    let pipe: unknown;
    let used: "webgpu" | "wasm" = device;
    try {
      pipe = await create(device);
    } catch (e) {
      if (device !== "webgpu") throw e;
      used = "wasm";
      pipe = await create("wasm");
    }
    embedder = pipe as Embedder;
    update({ status: "ready", progress: 1, device: used });
    return embedder;
  })().catch((e: unknown) => {
    loading = null;
    update({ status: "error", error: e instanceof Error ? e.message : "Couldn't load the model." });
    throw e;
  });
  return loading;
}

/** Normalised embeddings for each text, cached by exact string. */
export async function embed(texts: string[]): Promise<number[][]> {
  const missing = [...new Set(texts.filter((t) => !cache.has(t)))];
  if (missing.length) {
    const model = await loadModel();
    for (let i = 0; i < missing.length; i += 32) {
      const batch = missing.slice(i, i + 32);
      const out = (await model(batch, { pooling: "mean", normalize: true })).tolist();
      batch.forEach((t, j) => cache.set(t, out[j]));
    }
  }
  return texts.map((t) => cache.get(t)!);
}

const dot = (a: number[], b: number[]) => {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * b[i];
  return s;
};

/**
 * Semantic extractive summary: the `n` sentences most central to the passage,
 * chosen with maximal marginal relevance so they don't repeat each other.
 * Returned in reading order.
 */
export async function summarizeOnDevice(text: string, n: number): Promise<string[]> {
  const sentences = splitSentencesPlain(text).filter((s) => s.split(/\s+/).length >= 4);
  if (sentences.length <= n) return sentences;
  const vecs = await embed(sentences);
  const centroid = vecs[0].map((_, k) => vecs.reduce((a, v) => a + v[k], 0) / vecs.length);
  const relevance = vecs.map((v) => dot(v, centroid));
  const picked: number[] = [];
  const LAMBDA = 0.7;
  while (picked.length < n) {
    let best = -1;
    let bestScore = -Infinity;
    for (let i = 0; i < vecs.length; i++) {
      if (picked.includes(i)) continue;
      const redundancy = picked.length ? Math.max(...picked.map((p) => dot(vecs[i], vecs[p]))) : 0;
      const score = LAMBDA * relevance[i] - (1 - LAMBDA) * redundancy + (i === 0 ? 0.02 : 0);
      if (score > bestScore) {
        bestScore = score;
        best = i;
      }
    }
    if (best < 0) break;
    picked.push(best);
  }
  return picked.sort((a, b) => a - b).map((i) => sentences[i]);
}

export interface SearchItem {
  id: string;
  text: string;
}

/** Items ranked by meaning, not keywords. Scores are cosine similarity (−1..1). */
export async function semanticSearch<T extends SearchItem>(query: string, items: T[], k = 8): Promise<Array<T & { score: number }>> {
  const q = query.trim();
  if (!q || !items.length) return [];
  const [qv, ...iv] = await embed([q, ...items.map((i) => i.text)]);
  return items
    .map((item, i) => ({ ...item, score: dot(qv, iv[i]) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, k);
}
