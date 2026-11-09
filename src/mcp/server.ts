import type { McpServer } from "@modelcontextprotocol/server";
import { z } from "zod";
import { makePuzzle } from "@/lib/kinetic";
import { breakdownHeuristic } from "@/lib/magicBreakdown";
import { COMMUNICATION_GUIDE, DEFAULT_MENU, DESIGN_PRINCIPLES, REFRAME_PATTERNS } from "./knowledge";

/**
 * Kairos MCP server.
 *
 * Stateless by design: it never reads the user's browser data. It gives any LLM the
 * same ADHD-informed moves the app makes — tiny-step breakdowns, right-sized focus
 * blocks, shame-free reframes, pre-decided breaks, time calibration, study plans —
 * plus prompts and resources that teach the assistant how to talk to someone with ADHD.
 */
export function registerQuietFocus(server: McpServer) {
  /* ------------------------------------------------------------------ tools */

  server.registerTool(
    "break_down_task",
    {
      title: "Break down a task",
      description:
        "Turn an intimidating task into 3–5 physical, verb-first micro-steps (each under 10 minutes; the first trivially easy). Returns a draft the assistant should keep or refine — never make steps bigger or more numerous.",
      inputSchema: z.object({
        task: z.string().min(1).max(300).describe("The task as the person phrased it, e.g. 'study for the EE midterm'"),
        context: z.string().max(500).optional().describe("Anything known about materials, deadline, or where they're stuck"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ task, context }) => {
      const steps = breakdownHeuristic(task);
      const out = {
        task,
        steps,
        rules: [
          "Each step starts with a verb and names a visible, physical action.",
          "Each step is finishable in under 10 minutes.",
          "Step 1 must be trivially easy — its only job is initiation.",
          "Offer 'Just Start (5 mins)' on step 1 before offering the whole plan.",
          "Show only the next step; keep the rest hidden until asked.",
        ],
        context: context ?? null,
      };
      return {
        content: [{ type: "text", text: `Micro-steps for “${task}”:\n${steps.map((s, i) => `${i + 1}. ${s}`).join("\n")}\n\nShow only step 1 first. Suggest a 5-minute timer.` }],
        structuredContent: out,
      };
    },
  );

  server.registerTool(
    "plan_focus_block",
    {
      title: "Plan a focus block",
      description:
        "Recommend a block length and shape based on current energy, time available and whether the person is stuck. ADHD-sized: 5-minute initiation when paralysed, 10–25 minute flow blocks otherwise. Never recommends more than 25 minutes without a break.",
      inputSchema: z.object({
        energy: z.enum(["low", "medium", "high"]).describe("How the person says they feel right now"),
        minutes_available: z.number().int().min(5).max(600).describe("Roughly how long they have"),
        stuck: z.boolean().optional().describe("True if they're struggling to start at all"),
        task: z.string().max(300).optional(),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ energy, minutes_available, stuck, task }) => {
      const block = stuck ? 5 : energy === "low" ? 10 : energy === "medium" ? 15 : 25;
      const brk = block <= 10 ? 3 : 5;
      const cycles = Math.max(1, Math.floor(minutes_available / (block + brk)));
      const plan = {
        first_block_min: block,
        break_min: brk,
        cycles_that_fit: cycles,
        soundscape: energy === "low" ? "brown noise" : energy === "high" ? "none or rain" : "pink noise",
        opening_line: stuck
          ? `Let's not plan. Set a 5-minute timer and just ${task ? `open what you need for “${task}”` : "open the thing"}. You can stop when it rings.`
          : `Start a ${block}-minute block${task ? ` on “${task}”` : ""}. One step, then a ${brk}-minute break off the dopamine menu.`,
        after: "When the timer ends, offer: Keep going (+5), take the break, or done for now — all three are wins.",
      };
      return {
        content: [{ type: "text", text: `${plan.opening_line}\n\nShape: ${block}m focus / ${brk}m break × up to ${cycles}. Suggested soundscape: ${plan.soundscape}.\n${plan.after}` }],
        structuredContent: plan,
      };
    },
  );

  server.registerTool(
    "reframe_self_talk",
    {
      title: "Reframe shame-based self-talk",
      description:
        "Given something the person said about themselves ('I'm so lazy', 'I wasted the whole day'), return a CBT-for-ADHD reframe plus the principles behind it, so the assistant can respond without shame and pivot to one small action.",
      inputSchema: z.object({ statement: z.string().min(1).max(600) }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ statement }) => {
      const hit = REFRAME_PATTERNS.find((p) => p.test.test(statement));
      const reframe =
        hit?.reframe ??
        "That sounds heavy, and it makes sense you'd feel it. The feeling is real; the verdict isn't. Nothing about today changes what's possible in the next five minutes — what's the smallest version of the next step?";
      const out = {
        statement,
        reframe,
        principles: ["Validate the feeling in one line, then move to action.", "Separate fact (not done yet) from verdict (I'm X).", "Never argue the person into positivity; offer a smaller step instead.", "Do not mention streaks, discipline, or what they 'should' have done."],
        matched_pattern: hit ? hit.test.source : null,
      };
      return { content: [{ type: "text", text: reframe }], structuredContent: out };
    },
  );

  server.registerTool(
    "pick_break",
    {
      title: "Pick a break from the dopamine menu",
      description:
        "Choose a healthy, pre-decided break so the person doesn't have to decide (deciding is the drain). Buckets: quick (2–5 min, between steps), reset (5–15 min, between blocks), earned (20+ min, after a hard thing).",
      inputSchema: z.object({
        bucket: z.enum(["quick", "reset", "earned"]).optional(),
        minutes_available: z.number().int().min(1).max(120).optional(),
        avoid_screens: z.boolean().optional(),
      }),
      annotations: { readOnlyHint: true, idempotentHint: false, openWorldHint: false },
    },
    async ({ bucket, minutes_available, avoid_screens }) => {
      const b = bucket ?? (minutes_available === undefined ? "quick" : minutes_available <= 5 ? "quick" : minutes_available <= 15 ? "reset" : "earned");
      let pool: string[] = [...DEFAULT_MENU[b]];
      if (avoid_screens) pool = pool.filter((p) => !/episode|game/i.test(p));
      const pick = pool[Math.floor(Math.random() * pool.length)];
      return {
        content: [{ type: "text", text: `Break (${b}): ${pick}\n\nSet a timer for it. When it rings, the next block is already waiting — no decision needed.` }],
        structuredContent: { bucket: b, pick, alternatives: pool.filter((p) => p !== pick).slice(0, 2) },
      };
    },
  );

  server.registerTool(
    "estimate_time",
    {
      title: "Calibrate a time estimate",
      description:
        "Adjust the person's time guess for ADHD time blindness and split it into focus blocks. Default multiplier 1.5× unless a measured personal ratio is supplied (the Kairos app shows this on its Insights page).",
      inputSchema: z.object({
        task: z.string().max(300),
        guess_minutes: z.number().min(1).max(1440),
        personal_ratio: z.number().min(0.3).max(5).optional().describe("Measured actual/guess ratio, if known"),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ task, guess_minutes, personal_ratio }) => {
      const ratio = personal_ratio ?? 1.5;
      const adjusted = Math.round(guess_minutes * ratio);
      const block = adjusted <= 15 ? adjusted : 25;
      const blocks = Math.max(1, Math.ceil(adjusted / block));
      const anchors = adjusted <= 10 ? "about one song and a half" : adjusted <= 30 ? "about one TV episode" : adjusted <= 60 ? "about a film's first act" : `about ${Math.round(adjusted / 45)} lecture${adjusted > 90 ? "s" : ""}`;
      return {
        content: [{ type: "text", text: `“${task}” — you guessed ${guess_minutes} min. Plan for ~${adjusted} min (${anchors}): ${blocks} × ${block}-minute block${blocks > 1 ? "s" : ""}. Start with just the first block.` }],
        structuredContent: { task, guess_minutes, ratio_used: ratio, adjusted_minutes: adjusted, blocks, block_minutes: block, anchor: anchors },
      };
    },
  );

  server.registerTool(
    "parking_lot_triage",
    {
      title: "Triage parked thoughts",
      description:
        "Sort a list of intrusive thoughts captured during focus into: do_now (under 2 minutes, after the block), task (needs a slot), someday (keep, no action), let_go (not actually important). Phrased without judgement.",
      inputSchema: z.object({ thoughts: z.array(z.string().min(1).max(300)).min(1).max(50) }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ thoughts }) => {
      const triaged = thoughts.map((t) => {
        const s = t.toLowerCase();
        let bucket: "do_now" | "task" | "someday" | "let_go" = "task";
        if (/\b(google|look up|check|search|what is|how does|wonder|why)\b/.test(s)) bucket = "someday";
        if (/\b(pay|email|text|reply|call|book|order|renew|submit)\b/.test(s)) bucket = /\b(bill|rent|fee|deadline|due)\b/.test(s) ? "task" : "do_now";
        if (/\b(did i|should i have|what if|embarrass|awkward|they think)\b/.test(s)) bucket = "let_go";
        return { thought: t, bucket };
      });
      const lines = triaged.map((x) => `• ${x.thought} → ${x.bucket.replace("_", " ")}`).join("\n");
      return {
        content: [{ type: "text", text: `${lines}\n\n“do now” items: knock them out in one 5-minute sweep after the block. “someday”: keep the list, no action needed. “let go”: those were anxiety, not tasks — it's okay to drop them.` }],
        structuredContent: { triaged },
      };
    },
  );

  server.registerTool(
    "study_plan_from_material",
    {
      title: "Chunk study material",
      description:
        "Turn a lecture, PDF chapter or text into ADHD-sized chunks with an active-recall prompt after each. Returns a plan the assistant can walk the person through one chunk at a time.",
      inputSchema: z.object({
        kind: z.enum(["video", "pdf", "text"]),
        size: z.number().min(1).describe("Video: minutes. PDF: pages. Text: approximate words."),
        minutes_available: z.number().int().min(5).max(600).optional(),
        title: z.string().max(200).optional(),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ kind, size, minutes_available, title }) => {
      const chunkUnit = kind === "video" ? 10 : kind === "pdf" ? 3 : 600;
      const unitLabel = kind === "video" ? "min" : kind === "pdf" ? "pages" : "words";
      const chunks = Math.max(1, Math.ceil(size / chunkUnit));
      const minsPerChunk = kind === "video" ? 12 : kind === "pdf" ? 12 : 6;
      const fits = minutes_available ? Math.max(1, Math.floor(minutes_available / minsPerChunk)) : chunks;
      const plan = Array.from({ length: Math.min(chunks, fits) }, (_, i) => ({
        chunk: i + 1,
        range: kind === "video" ? `${i * chunkUnit}–${Math.min(size, (i + 1) * chunkUnit)} min` : kind === "pdf" ? `pages ${i * chunkUnit + 1}–${Math.min(size, (i + 1) * chunkUnit)}` : `~${unitLabel} ${i * chunkUnit + 1}–${Math.min(size, (i + 1) * chunkUnit)}`,
        recall_prompt: ["In one sentence, what was that about?", "What's one thing you'd put on a flashcard?", "Explain it to a 12-year-old in two lines.", "What question do you still have?"][i % 4],
      }));
      return {
        content: [{ type: "text", text: `${title ? `“${title}” — ` : ""}${chunks} chunk${chunks === 1 ? "" : "s"} of ~${chunkUnit} ${unitLabel}${minutes_available ? `; ${plan.length} fit in ${minutes_available} min` : ""}.\n${plan.map((p) => `${p.chunk}. ${p.range} → ${p.recall_prompt}`).join("\n")}\n\nWalk through one chunk at a time. Do not show the whole list unless asked.` }],
        structuredContent: { kind, size, chunks_total: chunks, plan, tip: kind === "video" ? "Use Kairos → Study → Lecture; it pauses at each chunk automatically." : kind === "pdf" ? "Use Kairos → Study → PDF; set the page goal to 3." : "Use Kairos → Study → Reader with bionic text or read-aloud." },
      };
    },
  );

  server.registerTool(
    "make_speedbump",
    {
      title: "Make a reading speedbump",
      description:
        "Kinetic Reading: turn a paragraph the person just read into a one-gap recall check (missing key word + three distractors). Use after each chunk when reading material together, so the hands move and attention stays in the loop. Accept near-misses; never call an answer wrong, just point back to the paragraph.",
      inputSchema: z.object({
        paragraph: z.string().min(40).max(4000).describe("The text the person just read (one chunk, ~60–200 words)."),
        kind: z.enum(["type", "drag"]).optional().describe("'type' = they type the word; 'drag' = offer the options as chips."),
      }),
      annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
    },
    async ({ paragraph, kind }) => {
      const p = makePuzzle(paragraph, kind === "type" ? 1 : 0);
      if (!p) {
        return { content: [{ type: "text", text: "That paragraph is too short for a gap check — just ask: “In one line, what was that about?”" }], structuredContent: { ok: false } };
      }
      const gap = "＿".repeat(Math.min(10, p.answer.length));
      return {
        content: [
          {
            type: "text",
            text: `${p.before}${gap}${p.after}\n\n${p.kind === "type" ? `Type the missing word (starts with “${p.answer[0]}”, ${p.answer.length} letters).` : `Options: ${p.options.join(" · ")}`}\n\n(Answer for you only: ${p.answer}. Accept case differences and one-letter typos. If they miss twice, show it and move on — unlocking the next section is the reward.)`,
          },
        ],
        structuredContent: { ok: true, kind: p.kind, before: p.before, after: p.after, answer: p.answer, options: p.options },
      };
    },
  );

  /* ---------------------------------------------------------------- prompts */

  server.registerPrompt(
    "adhd_aware_assistant",
    {
      title: "ADHD-aware assistant",
      description: "System-style instructions that make any assistant communicate the way Kairos does: short, verb-first, shame-free, one question at a time.",
    },
    () => ({
      messages: [{ role: "user", content: { type: "text", text: `${COMMUNICATION_GUIDE}\n\nAcknowledge these instructions in one short line, then ask what the person wants to start.` } }],
    }),
  );

  server.registerPrompt(
    "body_double_session",
    {
      title: "Run a body-doubling session",
      description: "Have the assistant act as a quiet co-working partner: check in at intervals, keep replies tiny, never scold.",
      argsSchema: z.object({
        task: z.string().describe("What the person is working on"),
        minutes: z.string().optional().describe("Block length in minutes, default 15"),
      }),
    },
    ({ task, minutes }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `You are my body double for the next ${minutes ?? "15"} minutes while I work on: ${task}.

Rules:
- Reply in one or two short lines, never more.
- Start by asking me to tell you when I've done the very first physical step (opened the file, found the page).
- When I report progress, acknowledge in a few words and ask what the next tiny step is.
- If I go quiet or wander, gently say "still here — what's in front of you right now?"
- No praise inflation, no scolding, no advice unless I ask.
- When I say the timer rang, ask: keep going five more, take a break, or stop here — and accept any answer as a good one.`,
          },
        },
      ],
    }),
  );

  server.registerPrompt(
    "unstick_me",
    {
      title: "Unstick me",
      description: "For when the person is paralysed. Produces a tiny first step and a 5-minute start, nothing else.",
      argsSchema: z.object({ task: z.string(), feeling: z.string().optional() }),
    },
    ({ task, feeling }) => ({
      messages: [
        {
          role: "user",
          content: {
            type: "text",
            text: `I'm stuck on: ${task}.${feeling ? ` I feel: ${feeling}.` : ""}
Use the break_down_task tool. Then reply with ONLY: one line of validation, step 1, and "set a 5-minute timer — you can stop when it rings". Nothing else. No full plan.`,
          },
        },
      ],
    }),
  );

  /* -------------------------------------------------------------- resources */

  server.registerResource(
    "communication-guide",
    "kairos://guide/communication",
    { title: "ADHD communication guide", description: "How to talk to someone with ADHD without making it worse.", mimeType: "text/markdown" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: COMMUNICATION_GUIDE }] }),
  );

  server.registerResource(
    "design-principles",
    "kairos://guide/principles",
    { title: "Kairos design principles", description: "The seven principles the app is built on.", mimeType: "text/markdown" },
    async (uri) => ({ contents: [{ uri: uri.href, mimeType: "text/markdown", text: DESIGN_PRINCIPLES }] }),
  );
}
