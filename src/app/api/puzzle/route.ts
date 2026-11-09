import { NextResponse } from "next/server";
import { makePuzzle } from "@/lib/kinetic";

/**
 * POST /api/puzzle  { text: string, kind?: "type" | "drag" }
 *   -> { before, after, answer, options, source: "ai" | "heuristic" }
 *
 * Builds a one-gap "speedbump" from a paragraph for Kinetic Reading. Uses an
 * OpenAI-compatible endpoint when OPENAI_API_KEY is set; otherwise, or on any
 * failure, the offline heuristic. Never throws to the client.
 */
export async function POST(req: Request) {
  let text = "";
  let kind: "type" | "drag" = "drag";
  try {
    const body = (await req.json()) as { text?: unknown; kind?: unknown };
    text = typeof body.text === "string" ? body.text.trim().slice(0, 4000) : "";
    if (body.kind === "type" || body.kind === "drag") kind = body.kind;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    const ai = await puzzleWithAi(text, apiKey);
    if (ai) return NextResponse.json({ ...ai, kind, source: "ai" });
  }
  const local = makePuzzle(text);
  if (!local) return NextResponse.json({ error: "Not enough text for a puzzle" }, { status: 422 });
  return NextResponse.json({ ...local, kind, source: "heuristic" });
}

const SYSTEM_PROMPT = `You create one tiny recall check from a paragraph a student just read.
Pick the single most important concept word (a noun or key term, 5+ letters) in one sentence from the paragraph.
Return the sentence split around that word, plus three plausible distractor words that also appear in or fit the paragraph.
Respond with JSON only: {"before": "text before the word", "after": "text after the word", "answer": "the word", "options": ["answer", "d1", "d2", "d3"]}.
"before" + answer + "after" must reproduce the original sentence exactly.`;

async function puzzleWithAi(text: string, apiKey: string) {
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.3,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: text },
        ],
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const p = JSON.parse(content) as { before?: unknown; after?: unknown; answer?: unknown; options?: unknown };
    if (typeof p.answer !== "string" || typeof p.before !== "string" || typeof p.after !== "string" || !Array.isArray(p.options)) return null;
    const answer = p.answer.trim();
    if (answer.length < 3 || answer.length > 30 || /\s/.test(answer)) return null;
    const options = Array.from(
      new Set([answer, ...p.options.filter((o): o is string => typeof o === "string").map((o) => o.trim()).filter(Boolean)]),
    ).slice(0, 4);
    if (options.length < 3) return null;
    // Shuffle so the answer isn't always first.
    for (let i = options.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [options[i], options[j]] = [options[j], options[i]];
    }
    return { before: p.before, after: p.after, answer, options };
  } catch {
    return null;
  }
}
