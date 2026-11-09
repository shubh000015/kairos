import { NextResponse } from "next/server";
import { breakdownHeuristic } from "@/lib/magicBreakdown";

/**
 * POST /api/breakdown  { title: string }  ->  { steps: string[], source: "ai" | "heuristic" }
 *
 * Uses an OpenAI-compatible chat endpoint when OPENAI_API_KEY is set, otherwise
 * (or on any failure) returns the offline heuristic breakdown. Never throws to the client.
 */
export async function POST(req: Request) {
  let title = "";
  try {
    const body = (await req.json()) as { title?: unknown };
    title = typeof body.title === "string" ? body.title.trim().slice(0, 300) : "";
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  if (!title) return NextResponse.json({ error: "title is required" }, { status: 400 });

  const apiKey = process.env.OPENAI_API_KEY;
  if (apiKey) {
    const ai = await breakdownWithAi(title, apiKey);
    if (ai) return NextResponse.json({ steps: ai, source: "ai" });
  }
  return NextResponse.json({ steps: breakdownHeuristic(title), source: "heuristic" });
}

const SYSTEM_PROMPT = `You help people with ADHD start tasks. Break the task into 3-5 micro-steps.
Rules: each step starts with a verb, describes a physical/visible action, takes under 10 minutes,
and the FIRST step must be trivially easy (e.g. "Open the textbook to the contents page").
Never mention ADHD, motivation, or discipline. No numbering. Respond with JSON: {"steps": ["...", "..."]}`;

async function breakdownWithAi(title: string, apiKey: string): Promise<string[] | null> {
  const baseUrl = (process.env.OPENAI_BASE_URL ?? "https://api.openai.com/v1").replace(/\/$/, "");
  const model = process.env.OPENAI_MODEL ?? "gpt-4o-mini";
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 12_000);
    const res = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json", authorization: `Bearer ${apiKey}` },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: SYSTEM_PROMPT },
          { role: "user", content: `Task: ${title}` },
        ],
      }),
    });
    clearTimeout(timeout);
    if (!res.ok) return null;
    const data = (await res.json()) as { choices?: Array<{ message?: { content?: string } }> };
    const content = data.choices?.[0]?.message?.content;
    if (!content) return null;
    const parsed = JSON.parse(content) as { steps?: unknown };
    if (!Array.isArray(parsed.steps)) return null;
    const steps = parsed.steps
      .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
      .map((s) => s.trim().replace(/^\d+[.)]\s*/, ""))
      .slice(0, 5);
    return steps.length >= 2 ? steps : null;
  } catch {
    return null;
  }
}
