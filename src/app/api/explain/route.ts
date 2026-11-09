import { NextResponse } from "next/server";
import { explainHeuristic, type ExplainMode } from "@/lib/explain";

/**
 * POST /api/explain  { text: string, mode: "summary" | "analogy" | "pieces" }
 *   -> { mode, lead, lines[], source: "ai" | "heuristic" }
 *
 * The "Stuck?" nudge. LLM when OPENAI_API_KEY is set; otherwise (or on any
 * failure) an extractive heuristic. Never throws to the client.
 */
export async function POST(req: Request) {
  let text = "";
  let mode: ExplainMode = "summary";
  try {
    const body = (await req.json()) as { text?: unknown; mode?: unknown };
    text = typeof body.text === "string" ? body.text.trim().slice(0, 6000) : "";
    if (body.mode === "summary" || body.mode === "analogy" || body.mode === "pieces") mode = body.mode;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!text) return NextResponse.json({ error: "text is required" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    const ai = await explainWithAi(text, mode, apiKey);
    if (ai) return NextResponse.json({ mode, ...ai, source: "ai" });
  }
  return NextResponse.json(explainHeuristic(text, mode));
}

const PROMPTS: Record<ExplainMode, string> = {
  summary: "Summarise the passage in at most 3 short sentences a tired student can absorb. Plain words. No preamble.",
  analogy: "Explain the core idea of the passage with ONE vivid everyday analogy (2–4 sentences), then one sentence on where the analogy breaks down. No preamble.",
  pieces: "Break the passage into 3–5 bullet-sized pieces, each one idea, each under 15 words, in reading order. No numbering, no preamble.",
};

async function explainWithAi(text: string, mode: ExplainMode, apiKey: string) {
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.5,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content: `You help a student with ADHD who is stuck on dense material. Never mention ADHD, focus, or effort. Never say "simply" or "just". ${PROMPTS[mode]} Respond with JSON: {"lead": "a 3-6 word heading", "lines": ["...", "..."]}`,
          },
          { role: "user", content: text },
        ],
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const p = JSON.parse(content) as { lead?: unknown; lines?: unknown };
    if (!Array.isArray(p.lines)) return null;
    const lines = p.lines.filter((l): l is string => typeof l === "string" && l.trim().length > 0).map((l) => l.trim()).slice(0, 6);
    if (!lines.length) return null;
    return { lead: typeof p.lead === "string" && p.lead.trim() ? p.lead.trim() : "Here's another way in", lines };
  } catch {
    return null;
  }
}
