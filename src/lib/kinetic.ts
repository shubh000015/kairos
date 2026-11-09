/**
 * Kinetic Reading — the "speedbump" mechanic.
 *
 * Study text is cut into 60–90-second chunks. Everything below the current chunk is
 * blurred; to unblur the next one the reader clears a tiny puzzle built from what
 * they just read (type the missing word, or drag the keyword into the gap).
 *
 * Everything here is pure and runs offline. `/api/puzzle` can upgrade a puzzle with
 * an LLM only when the user opts into cloud AI; the local puzzle always renders first.
 */

import nlp from "compromise";
import { cloudAllowed } from "./aiPolicy";

export interface Chunk {
  id: string;
  text: string;
  words: number;
}

export type PuzzleKind = "type" | "drag";

export interface Puzzle {
  kind: PuzzleKind;
  /** Sentence text before the gap. */
  before: string;
  /** Sentence text after the gap. */
  after: string;
  /** The word that was removed, as it appeared. */
  answer: string;
  /** Shuffled choices (includes `answer`). Used for `drag`, and as a hint for `type`. */
  options: string[];
  source: "heuristic" | "ai";
}

/** About 110 words reads in roughly 60–90 seconds at study pace. */
export const TARGET_CHUNK_WORDS = 110;
const MIN_CHUNK_WORDS = 35;

export function countWords(s: string): number {
  const t = s.trim();
  return t ? t.split(/\s+/).length : 0;
}

/** Sentence split that doesn't need the DOM. Keeps order for display. */
export function splitSentencesPlain(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/** Cut text into reading chunks at paragraph / sentence boundaries. */
export function chunkText(text: string, target = TARGET_CHUNK_WORDS): Chunk[] {
  const paragraphs = text
    .replace(/\r\n?/g, "\n")
    .split(/\n{2,}/)
    .map((p) => p.replace(/\s*\n\s*/g, " ").trim())
    .filter(Boolean);

  // Break any paragraph that is far too long into sentence groups near the target.
  const units: string[] = [];
  for (const p of paragraphs) {
    if (countWords(p) <= target * 1.6) {
      units.push(p);
      continue;
    }
    let buf: string[] = [];
    let n = 0;
    for (const s of splitSentencesPlain(p)) {
      const w = countWords(s);
      if (n > 0 && n + w > target) {
        units.push(buf.join(" "));
        buf = [];
        n = 0;
      }
      buf.push(s);
      n += w;
    }
    if (buf.length) units.push(buf.join(" "));
  }

  // Merge short paragraphs forward until a chunk is comfortably sized.
  const chunks: Chunk[] = [];
  let acc: string[] = [];
  let accWords = 0;
  const flush = () => {
    if (!acc.length) return;
    const t = acc.join("\n\n");
    chunks.push({ id: `c${chunks.length}`, text: t, words: countWords(t) });
    acc = [];
    accWords = 0;
  };
  for (const u of units) {
    const w = countWords(u);
    if (accWords > 0 && accWords + w > target * 1.25) flush();
    acc.push(u);
    accWords += w;
    if (accWords >= target * 0.75) flush();
  }
  flush();

  // A tiny trailing chunk is folded into the previous one.
  if (chunks.length >= 2 && chunks[chunks.length - 1].words < MIN_CHUNK_WORDS) {
    const last = chunks.pop()!;
    const prev = chunks[chunks.length - 1];
    const t = `${prev.text}\n\n${last.text}`;
    chunks[chunks.length - 1] = { ...prev, text: t, words: countWords(t) };
  }
  return chunks;
}

/* ---------- Puzzle generation ---------- */

const STOPWORDS = new Set(
  (
    "about above after again against along also although always among another anyone anything around because become becomes been before being below between beyond cannot could during either enough every everything first found further having however indeed instead itself later least little might money never nothing often other others ought outside people perhaps please rather really right second several should since something sometimes still their there these thing things think third those though three through today together toward under until using usually various where whether which while whole whose within without would yours yourself quite where while since until under never these those being would could should there their which about above after again whether though although because general different example important however therefore something anything everything another without within through between".split(
      /\s+/,
    )
  ),
);

interface Candidate {
  word: string; // as it appears
  lower: string;
  sentenceIndex: number;
  tokenIndex: number;
  score: number;
}

/** Deterministic PRNG so the same chunk always yields the same puzzle. */
function mulberry32(seed: number) {
  return () => {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

const WORD_RE = /^[A-Za-z][A-Za-z-]{3,}[A-Za-z]$/;

function cleanToken(tok: string): { core: string; lead: string; trail: string } {
  const m = tok.match(/^([^A-Za-z]*)([A-Za-z][A-Za-z-]*[A-Za-z]|[A-Za-z]+)([^A-Za-z]*)$/);
  if (!m) return { core: "", lead: tok, trail: "" };
  return { lead: m[1], core: m[2], trail: m[3] };
}

interface PosInfo {
  nouns: Set<string>;
  /** Proper nouns, people, places, organisations, acronyms. */
  entities: Set<string>;
  /** Verbs, adjectives, adverbs: poor blanks, because the sentence still reads without them. */
  weak: Set<string>;
}

const ENTITY_TAGS = ["ProperNoun", "Person", "Place", "Organization", "Acronym"];
const WEAK_TAGS = ["Verb", "Adjective", "Adverb"];

/** Part-of-speech pass with compromise. Runs locally in a few ms; null if tagging fails. */
function tagParts(text: string): PosInfo | null {
  try {
    const info: PosInfo = { nouns: new Set(), entities: new Set(), weak: new Set() };
    const doc = nlp(text) as { json: () => Array<{ terms: Array<{ text: string; tags?: string[] }> }> };
    for (const sentence of doc.json()) {
      for (const term of sentence.terms) {
        const w = term.text.toLowerCase().replace(/[^a-z-]/g, "");
        const tags = term.tags ?? [];
        if (!w) continue;
        if (tags.includes("Noun") && !tags.includes("Pronoun")) info.nouns.add(w);
        if (tags.some((t) => ENTITY_TAGS.includes(t))) info.entities.add(w);
        if (!tags.includes("Noun") && tags.some((t) => WEAK_TAGS.includes(t))) info.weak.add(w);
      }
    }
    return info;
  } catch {
    return null;
  }
}

/**
 * Build a puzzle from a chunk of text. Picks a mid-length sentence and its most
 * important noun or entity (via compromise part-of-speech tagging), boosted by
 * length, repetition in the chunk and mid-sentence capitalisation.
 * Pure and deterministic: no network, same chunk → same puzzle.
 */
export function makePuzzle(chunk: string, index = 0): Puzzle | null {
  const sentences = splitSentencesPlain(chunk);
  if (!sentences.length) return null;
  const pos = tagParts(chunk);

  // Frequency of content words across the chunk.
  const freq = new Map<string, number>();
  for (const s of sentences) {
    for (const tok of s.split(/\s+/)) {
      const { core } = cleanToken(tok);
      const lower = core.toLowerCase();
      if (core.length >= 5 && WORD_RE.test(core) && !STOPWORDS.has(lower)) freq.set(lower, (freq.get(lower) ?? 0) + 1);
    }
  }

  const candidates: Candidate[] = [];
  sentences.forEach((s, si) => {
    const tokens = s.split(/\s+/);
    const n = tokens.length;
    if (n < 6 || n > 42) return;
    tokens.forEach((tok, ti) => {
      const { core } = cleanToken(tok);
      const lower = core.toLowerCase();
      if (core.length < 5 || !WORD_RE.test(core) || STOPWORDS.has(lower)) return;
      let score = Math.min(core.length, 12) / 12;
      score += Math.min(3, (freq.get(lower) ?? 1) - 1) * 0.35;
      if (ti > 0 && /^[A-Z]/.test(core)) score += 0.5; // proper noun / defined term
      if (/[A-Z]{2,}/.test(core)) score -= 0.4; // shouting acronyms are hard to type
      if (ti === 0) score -= 0.2;
      score += (n >= 10 && n <= 26 ? 0.3 : 0); // comfortable sentence length
      if (pos) {
        if (pos.nouns.has(lower)) score += 0.7;
        if (pos.entities.has(lower)) score += 0.4;
        if (pos.weak.has(lower)) score -= 0.6;
      }
      candidates.push({ word: core, lower, sentenceIndex: si, tokenIndex: ti, score });
    });
  });
  if (!candidates.length) return null;

  const rand = mulberry32(hashString(chunk) + index * 7919);
  candidates.sort((a, b) => b.score - a.score);
  // Pick among the top few so repeated chunks still feel varied.
  const pick = candidates[Math.floor(rand() * Math.min(3, candidates.length))];

  const tokens = sentences[pick.sentenceIndex].split(/\s+/);
  const { lead, trail } = cleanToken(tokens[pick.tokenIndex]);
  const before = `${tokens.slice(0, pick.tokenIndex).join(" ")}${tokens.length && pick.tokenIndex > 0 ? " " : ""}${lead}`;
  const after = `${trail}${pick.tokenIndex < tokens.length - 1 ? " " : ""}${tokens.slice(pick.tokenIndex + 1).join(" ")}`;

  // Distractors: other content words from the same chunk. Same part of speech first
  // (a noun answer among adverbs gives itself away), then similar length.
  const seen = new Set<string>([pick.lower]);
  const posPenalty = (c: Candidate) => (pos && pos.nouns.has(pick.lower) && !pos.nouns.has(c.lower) ? 100 : 0);
  const pool = candidates
    .filter((c) => !seen.has(c.lower) && (seen.add(c.lower), true))
    .sort(
      (a, b) =>
        posPenalty(a) + Math.abs(a.word.length - pick.word.length) - (posPenalty(b) + Math.abs(b.word.length - pick.word.length)),
    )
    .slice(0, 6)
    .map((c) => c.word);
  const fallback = ["process", "system", "theory", "result", "method", "factor", "pattern", "effect"];
  const distractors: string[] = [];
  while (distractors.length < 3 && pool.length) distractors.push(pool.splice(Math.floor(rand() * pool.length), 1)[0]);
  for (const f of fallback) {
    if (distractors.length >= 3) break;
    if (f !== pick.lower && !distractors.map((d) => d.toLowerCase()).includes(f)) distractors.push(matchCase(f, pick.word));
  }

  const options = shuffle([pick.word, ...distractors.map((d) => matchCase(d, pick.word))], rand);
  return { kind: index % 2 === 0 ? "drag" : "type", before, after, answer: pick.word, options, source: "heuristic" };
}

function matchCase(word: string, like: string): string {
  if (/^[A-Z]/.test(like) && !/^[A-Z]/.test(word)) return word[0].toUpperCase() + word.slice(1);
  if (!/^[A-Z]/.test(like) && /^[A-Z][a-z]/.test(word)) return word.toLowerCase();
  return word;
}

function shuffle<T>(arr: T[], rand: () => number): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Forgiving check: case-insensitive, trims punctuation, allows one typo on longer words. */
export function isCloseEnough(input: string, answer: string): boolean {
  const a = input.trim().toLowerCase().replace(/[^a-z-]/g, "");
  const b = answer.trim().toLowerCase().replace(/[^a-z-]/g, "");
  if (!a) return false;
  if (a === b) return true;
  if (b.length >= 6 && levenshtein(a, b) <= 1) return true;
  return false;
}

function levenshtein(a: string, b: string): number {
  if (Math.abs(a.length - b.length) > 2) return 3;
  const prev = new Array(b.length + 1).fill(0).map((_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let last = prev[0];
    prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, last + (a[i - 1] === b[j - 1] ? 0 : 1));
      last = tmp;
    }
  }
  return prev[b.length];
}

/**
 * Ask the server for an LLM-made puzzle; fall back to the heuristic on any failure.
 * The heuristic result is returned immediately if the request takes too long.
 */
export async function requestPuzzle(chunk: string, index: number, signal?: AbortSignal): Promise<Puzzle | null> {
  const local = makePuzzle(chunk, index);
  if (!cloudAllowed()) return local;
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 6000);
    signal?.addEventListener("abort", () => controller.abort());
    const res = await fetch("/api/puzzle", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text: chunk, kind: local?.kind ?? "drag" }),
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    if (!res.ok) return local;
    const data = (await res.json()) as Partial<Puzzle> & { source?: string };
    if (data.source !== "ai" || typeof data.answer !== "string" || !Array.isArray(data.options)) return local;
    return {
      kind: local?.kind ?? "drag",
      before: String(data.before ?? ""),
      after: String(data.after ?? ""),
      answer: data.answer,
      options: data.options.filter((o): o is string => typeof o === "string"),
      source: "ai",
    };
  } catch {
    return local;
  }
}
