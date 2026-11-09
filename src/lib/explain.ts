import { cloudAllowed, onDeviceMLEnabled } from "./aiPolicy";
import { splitSentencesPlain } from "./kinetic";

/**
 * "Stuck?" helpers. Offline heuristics that always produce something useful, an
 * optional on-device embedding model for better summaries, and `/api/explain`
 * only when the user opts into cloud AI.
 */

export type ExplainMode = "summary" | "analogy" | "pieces";

export interface Explanation {
  mode: ExplainMode;
  /** Short heading line. */
  lead: string;
  /** Bullets or sentences to show. */
  lines: string[];
  source: "heuristic" | "on-device" | "ai";
}

const STOP = new Set(
  "the a an and or but of to in on at for with from by as is are was were be been being this that these those it its into than then there their they them we you your our he she his her not no yes can could would should will may might also very more most such which who whom what when where why how if about over under between through during before after above below up down out off again further once here all any both each few other some own same so too just only".split(
    " ",
  ),
);

function keywords(text: string): Map<string, number> {
  const freq = new Map<string, number>();
  for (const raw of text.toLowerCase().split(/[^a-z0-9-]+/)) {
    if (raw.length < 4 || STOP.has(raw)) continue;
    freq.set(raw, (freq.get(raw) ?? 0) + 1);
  }
  return freq;
}

function rankSentences(text: string): Array<{ s: string; score: number; i: number }> {
  const sentences = splitSentencesPlain(text);
  const freq = keywords(text);
  return sentences
    .map((s, i) => {
      const words = s.toLowerCase().split(/[^a-z0-9-]+/).filter((w) => w.length >= 4 && !STOP.has(w));
      const score = words.reduce((a, w) => a + (freq.get(w) ?? 0), 0) / Math.sqrt(words.length + 1);
      // Mild preference for sentences near the start (topic sentences).
      return { s, score: score * (1 + (i === 0 ? 0.25 : 0)), i };
    })
    .sort((a, b) => b.score - a.score);
}

export function explainHeuristic(text: string, mode: ExplainMode): Explanation {
  const ranked = rankSentences(text);
  const top = (n: number) => ranked.slice(0, n).sort((a, b) => a.i - b.i).map((r) => r.s);
  const keys = [...keywords(text).entries()].sort((a, b) => b[1] - a[1]).slice(0, 4).map(([k]) => k);

  if (mode === "summary") {
    return {
      mode,
      lead: "The gist, in the text's own words",
      lines: top(Math.min(2, ranked.length)),
      source: "heuristic",
    };
  }
  if (mode === "pieces") {
    return {
      mode,
      lead: "Smaller pieces — take one at a time",
      lines: top(Math.min(4, ranked.length)).map((s) => shorten(s)),
      source: "heuristic",
    };
  }
  // analogy: without a model we can't invent one, so we scaffold the person making their own —
  // which, for memory, works at least as well.
  return {
    mode,
    lead: "Build the analogy yourself (it sticks better)",
    lines: [
      `The key idea seems to be about ${keys.slice(0, 2).join(" and ") || "this concept"}.`,
      `Finish this sentence out loud: “${keys[0] ?? "This"} is basically like ______, because ______.”`,
      "Anything from daily life works — kitchens, traffic, group chats. Wrong analogies still help.",
    ],
    source: "heuristic",
  };
}

function shorten(s: string): string {
  // Trim trailing subordinate clauses so each piece reads as one idea.
  const cut = s.split(/,\s(?:which|while|whereas|although|because|so that|meaning)\b/)[0];
  return cut.length < s.length ? `${cut.replace(/[.,;:]$/, "")}.` : s;
}

/** On-device semantic version of summary / pieces. Null if the model isn't enabled or fails. */
async function explainOnDevice(text: string, mode: ExplainMode): Promise<Explanation | null> {
  if (mode === "analogy" || !onDeviceMLEnabled()) return null;
  try {
    const { summarizeOnDevice } = await import("./ondevice");
    const lines = await summarizeOnDevice(text, mode === "summary" ? 2 : 4);
    if (!lines.length) return null;
    return {
      mode,
      lead: mode === "summary" ? "The gist, in the text's own words" : "Smaller pieces — take one at a time",
      lines: mode === "pieces" ? lines.map(shorten) : lines,
      source: "on-device",
    };
  } catch {
    return null;
  }
}

/**
 * Local first: the on-device model (if enabled), then the heuristic. The server LLM
 * is only asked when the user has opted into cloud AI, and any failure falls back.
 */
export async function requestExplanation(text: string, mode: ExplainMode): Promise<Explanation> {
  const local = (await explainOnDevice(text, mode)) ?? explainHeuristic(text, mode);
  if (!cloudAllowed()) return local;
  try {
    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), 9000);
    const res = await fetch("/api/explain", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ text, mode }),
      signal: controller.signal,
    });
    window.clearTimeout(timer);
    if (!res.ok) return local;
    const data = (await res.json()) as Partial<Explanation>;
    if (data.source !== "ai" || !Array.isArray(data.lines) || !data.lines.length) return local;
    return { mode, lead: String(data.lead ?? local.lead), lines: data.lines.map(String), source: "ai" };
  } catch {
    return local;
  }
}
