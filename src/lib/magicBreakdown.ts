import { cloudAllowed } from "./aiPolicy";

/**
 * Magic Breakdown — turns an intimidating task into 3–5 physical, verb-first
 * micro-steps.
 *
 * It's a deterministic router: a keyword scan picks a hand-written template, which
 * covers the large majority of study and life tasks with zero network and zero
 * latency. Only a task that matches no template is offered to the cloud LLM, and
 * only when the user has opted into cloud AI.
 *
 * Rules that make a step "ADHD-sized":
 *  - starts with a verb, names a physical/visible action
 *  - carries a time box where it helps (time blindness)
 *  - the first step is always trivially easy (open / set / write one line)
 */

export interface Template {
  id: string;
  /** Any of these words/phrases (whole-word, case-insensitive) selects the template. */
  keywords: string[];
  steps: (subject: string) => string[];
}

/** Order matters: more specific templates come first. */
export const TEMPLATES: Template[] = [
  {
    id: "exam",
    keywords: ["exam", "exams", "test", "midterm", "finals", "quiz", "viva", "revise", "revision"],
    steps: (s) => [
      `Open your notes or textbook for ${s} — just open them`,
      "Skim the headings (5 min) and list the 3 topics that feel shakiest",
      "Read about the shakiest topic (10 min)",
      "Do 2 practice questions, or explain it out loud to nobody (5 min)",
      "Write 3 bullets of what you now understand, then stop",
    ],
  },
  {
    id: "memorise",
    keywords: ["memorise", "memorize", "flashcards", "flashcard", "vocab", "vocabulary", "anki", "learn by heart"],
    steps: (s) => [
      `Open your flashcards or list for ${s}`,
      "Pick only the first 10 cards",
      "Go through them once, saying each answer out loud (5 min)",
      "Re-do only the ones you missed",
      "Close it — spaced repetition works best in short sessions",
    ],
  },
  {
    id: "read",
    keywords: ["read", "reading", "chapter", "chapters", "textbook", "pages", "article", "paper"],
    steps: (s) => [
      `Open ${s} to the first page you need`,
      "Scan the headings and bold words (2 min)",
      "Read the first section (10 min) with the ruler on",
      "Write one sentence: what was that section about?",
      "Read the next section, or stop here — both count",
    ],
  },
  {
    id: "write",
    keywords: ["write", "writing", "essay", "report", "draft", "blog", "thesis", "dissertation", "cover letter", "statement"],
    steps: (s) => [
      `Open a blank doc and type the title: ${s}`,
      "Brainstorm bullet points (5 min) — messy is fine",
      "Write a messy first draft of one section (15 min), no editing",
      "Write the next section the same way",
      "Edit (10 min) — a different task from writing",
    ],
  },
  {
    id: "present",
    keywords: ["presentation", "slides", "slide deck", "deck", "pitch", "talk", "speech"],
    steps: (s) => [
      `Open a blank deck for ${s}`,
      "Write one slide title per point you need to make (5 min)",
      "Fill each slide with 3 words, not sentences",
      "Say it out loud once with a timer running",
      "Fix only the slide where you stumbled",
    ],
  },
  {
    id: "lecture",
    keywords: ["watch", "lecture", "lectures", "video", "videos", "course", "tutorial", "recording", "webinar"],
    steps: (s) => [
      `Open ${s} in Study → Lecture mode and set speed to 1.25×`,
      "Watch the first 10-minute chunk",
      "Pause: write a one-sentence summary at the timestamp",
      "Watch the next chunk",
      "Write down one question you still have",
    ],
  },
  {
    id: "problems",
    keywords: ["assignment", "homework", "problem set", "pset", "worksheet", "exercise", "exercises", "questions", "lab", "maths", "math", "calculus"],
    steps: (s) => [
      `Open ${s} and read only question 1`,
      "Rewrite question 1 in your own words",
      "Attempt question 1 (10 min) — partial counts",
      "Move to question 2, even if 1 isn't perfect",
      "Note anything you want to ask someone about",
    ],
  },
  {
    id: "research",
    keywords: ["research", "sources", "literature", "references", "bibliography", "citations"],
    steps: (s) => [
      `Open a note titled "Sources: ${s.replace(/[“”]/g, "")}"`,
      "Search once and open the top 3 results in tabs (3 min)",
      "Skim each abstract or intro (2 min each)",
      "Paste the 2 useful ones into the note with one line each",
      "Close every other tab",
    ],
  },
  {
    id: "code",
    keywords: ["code", "coding", "program", "build", "implement", "fix", "debug", "bug", "project", "app", "website", "feature", "deploy", "script"],
    steps: (s) => [
      `Open the project for ${s} and run it once as it is`,
      "Write one sentence: what should be different when you're done?",
      "Make the smallest change that moves toward that (15 min)",
      "Run it again and look at what happened",
      "Commit, or write a note about where you stopped",
    ],
  },
  {
    id: "admin",
    keywords: ["email", "emails", "message", "reply", "apply", "application", "form", "submit", "register", "invoice", "taxes", "bill", "bills"],
    steps: (s) => [
      `Open ${s} and look at it for 30 seconds`,
      "Write the first sentence or fill the first field, however clumsy",
      "Fill in the easiest part first",
      "Use placeholders where you're unsure",
      "Press send or submit — done beats perfect",
    ],
  },
  {
    id: "call",
    keywords: ["call", "phone", "ring", "book an", "book a", "appointment", "doctor", "dentist"],
    steps: (s) => [
      `Find the number or link for ${s}`,
      "Write the one sentence you'll open with",
      "Set a 2-minute timer and dial before it ends",
      "Write down what they said",
      "Add any follow-up as a new task",
    ],
  },
  {
    id: "clean",
    keywords: ["clean", "tidy", "organise", "organize", "laundry", "dishes", "room", "desk", "declutter", "vacuum"],
    steps: (s) => [
      `Stand up and walk to ${s}`,
      "Clear one surface only (5 min)",
      "Put away 10 things — count them",
      "Take out anything that's trash",
      "Stop when the timer ends, even mid-pile",
    ],
  },
  {
    id: "errand",
    keywords: ["shop", "shopping", "groceries", "errand", "errands", "buy", "pick up", "return"],
    steps: (s) => [
      `Write the list for ${s} on your phone`,
      "Put shoes and keys by the door",
      "Leave the house — that's the hard part done",
      "Get only what's on the list",
      "Tick it off when you're home",
    ],
  },
  {
    id: "exercise",
    keywords: ["exercise", "workout", "gym", "run", "walk", "yoga", "stretch"],
    steps: (s) => [
      `Put on the clothes for ${s} — that's all for now`,
      "Do 2 minutes of anything",
      "Decide: keep going or stop. Both are fine",
      "If going, do 10 more minutes",
      "Drink water",
    ],
  },
  {
    id: "plan",
    keywords: ["plan", "planning", "schedule", "outline", "organise my", "organize my", "prioritise", "prioritize"],
    steps: (s) => [
      `Open a blank note titled ${s}`,
      "List everything in your head (3 min) — no order",
      "Circle the one that's due soonest",
      "Write the very first step for that one",
      "Add it to Tasks and close the note",
    ],
  },
];

const GENERIC = (s: string) => [
  `Open everything you need for ${s} — nothing else yet`,
  "Spend 5 minutes finding the smallest first action",
  "Do that action",
  "Write down what the next action would be",
  "Tick this off — starting is the hard part",
];

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const COMPILED = TEMPLATES.map((t) => ({ t, re: new RegExp(`\\b(?:${t.keywords.map(escapeRe).join("|")})\\b`, "i") }));

function extractSubject(title: string): string {
  const m = title.match(/\b(?:for|on|about|of|from)\s+(.+)$/i);
  const raw = (m?.[1] ?? title).trim().replace(/[.!?]+$/, "");
  return raw.length > 0 ? `“${raw}”` : "it";
}

/**
 * The template whose keyword appears earliest in the title (so the leading verb
 * wins: "write an article" → write, "read the essay" → read), or null. Pure, ~0.1 ms.
 */
export function matchTemplate(title: string): { id: string; steps: string[] } | null {
  const clean = title.trim();
  if (!clean) return null;
  let best: { t: Template; at: number } | null = null;
  for (const { t, re } of COMPILED) {
    const m = re.exec(clean);
    if (m && (!best || m.index < best.at)) best = { t, at: m.index };
  }
  return best ? { id: best.t.id, steps: best.t.steps(extractSubject(clean)) } : null;
}

/** Template if one matches, otherwise the generic starter steps. Never empty for a non-empty title. */
export function breakdownHeuristic(title: string): string[] {
  const clean = title.trim();
  if (!clean) return [];
  return matchTemplate(clean)?.steps ?? GENERIC(extractSubject(clean));
}

export interface BreakdownResult {
  steps: string[];
  /** template: matched a hand-written template · ai: cloud LLM · heuristic: generic starter steps */
  source: "template" | "ai" | "heuristic";
  templateId?: string;
}

/**
 * Client helper. Templates first (instant, offline). Only an unmatched task goes
 * to the API route, and only with cloud AI enabled; any failure falls back locally.
 */
export async function requestBreakdown(title: string): Promise<BreakdownResult> {
  const hit = matchTemplate(title);
  if (hit) return { steps: hit.steps, source: "template", templateId: hit.id };
  if (cloudAllowed()) {
    try {
      const res = await fetch("/api/breakdown", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ title }),
      });
      if (res.ok) {
        const data = (await res.json()) as { steps?: unknown; source?: string };
        if (Array.isArray(data.steps) && data.steps.length >= 2) {
          return { steps: data.steps.map(String).slice(0, 5), source: data.source === "ai" ? "ai" : "heuristic" };
        }
      }
    } catch {
      // offline or route unavailable — fall through
    }
  }
  return { steps: breakdownHeuristic(title), source: "heuristic" };
}
