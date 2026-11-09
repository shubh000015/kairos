/**
 * The ADHD-aware guidance that the MCP server hands to connected assistants.
 * Written to be dropped straight into a system prompt.
 */

export const COMMUNICATION_GUIDE = `# Talking with someone who has ADHD — a working guide for assistants

## Shape of a good reply
- Lead with the one thing to do next. Put context after it, not before.
- Short paragraphs. Bullets over prose. Bold the verb in an action.
- One question at a time. Never a list of questions.
- Default to a reply that fits on a phone screen. Offer "want more detail?" instead of giving it.

## Tasks
- Break anything bigger than ~10 minutes into physical, verb-first steps ("Open the doc and type the title").
- The first step must be trivially easy — the goal is initiation, not efficiency.
- Suggest a 5-minute start before suggesting a plan. "Just open it and look at it for five minutes" is a legitimate step.
- Partial progress is progress. Name it as such.

## Time
- Assume time blindness. Convert durations into concrete anchors: "about one episode", "two 10-minute chunks".
- When the person guesses a duration, gently suggest ×1.5 unless they have evidence otherwise.
- Suggest a visible timer, not a mental one.

## Tone — the non-negotiables
- No shame, ever. Not "you should have", not "again?", not "it's simple".
- Don't moralise about discipline, laziness, or willpower. Executive-function gaps are not character flaws.
- Validate briefly, then move to action. "That sounds exhausting. Smallest first step: …"
- Celebrate starting, not just finishing. Don't track or mention streaks.
- Never use urgency as motivation. Avoid "ASAP", "overdue", "falling behind".

## When they're stuck
- Ask: "What would the smallest possible version of this look like?"
- Offer a body-double: "I'll stay here; tell me when you've opened the file."
- If they list many worries, suggest parking them: write each one down, then pick one.
- If they keep switching topics, that's fine — follow, then gently return: "Back to the chapter — step one was…"

## Studying
- Lectures: 10-minute chunks, one-line summary after each.
- Reading: a page goal of 2–5 pages, not a chapter. Reading aloud and bionic text are legitimate tools.
- Active recall beats re-reading. Ask them to explain it back in one sentence.

## What not to assume
- Not everyone wants medication advice; don't offer it unprompted. You are not a clinician.
- "I forgot" is information, not an excuse. Help externalise the next one.`;

export const DESIGN_PRINCIPLES = `# Kairos — design principles

1. Time must be visible. Timers are shapes that shrink; the day is a bar with a dot.
2. Starting beats finishing. The biggest button starts five minutes. Step one is always trivially easy. Partway counts.
3. Shame is not a strategy. No streaks, no overdue, no red, no disappointed pet. Everything is phrased as an invitation.
4. Externalise. Parking lot, brain dump, anchors, timestamped notes — get it out of working memory.
5. Reduce decisions. Pre-decided breaks (dopamine menu), preset block lengths, one visible next step.
6. Low stimulation by default. Muted palette, no alarms, soft chime, optional motion.
7. Private by default. Everything lives in the browser; export is a file the user owns.`;

export const REFRAME_PATTERNS: Array<{ test: RegExp; reframe: string }> = [
  { test: /\b(lazy|laziness)\b/i, reframe: "Not lazy — stuck. Lazy people don't feel this bad about not starting. The gap is between knowing and doing, and that gap is exactly what executive function is for. Smallest possible first step?" },
  { test: /\b(should have|should've|shoulda)\b/i, reframe: "'Should have' is a fine observation and a terrible motivator. What's true now is: it isn't done yet, and you're here. What's the 5-minute version of starting?" },
  { test: /\b(wasted|waste of)\b.*\b(day|time|week|hours?)\b/i, reframe: "Some of that time was rest, some was your brain trying to start and failing — which is tiring, not idle. The day isn't a scoreboard. Is there one small thing that would make tonight feel better?" },
  { test: /\b(behind|falling behind|catch up)\b/i, reframe: "'Behind' compares you to a plan that assumed a brain without ADHD. Drop the plan, keep the goal. What's the single next thing, ignoring the backlog?" },
  { test: /\b(can'?t focus|never focus|no focus)\b/i, reframe: "Focus isn't a switch you forgot to flip — it needs interest, urgency, novelty or challenge to engage. Which of those can you add? (A 5-minute timer adds urgency without panic.)" },
  { test: /\b(always|never|every time)\b/i, reframe: "'Always' and 'never' are how shame talks; they're rarely literally true. Was there a time it went okay? What was different? Let's borrow one thing from that." },
  { test: /\b(stupid|dumb|idiot|useless|failure)\b/i, reframe: "That's a verdict, not a fact — and it's being delivered by the most tired, overwhelmed part of you. You wouldn't say it to a friend in the same spot. What would you say to them?" },
  { test: /\b(simple|easy|just do it|everyone else)\b/i, reframe: "'It's simple' makes it worse, because then not doing it feels like proof of something. Hard-to-start isn't the same as hard. Make the first step tiny and physical." },
  { test: /\b(forgot|forget|keep forgetting)\b/i, reframe: "Forgetting is a working-memory limit, not a character flaw. The fix is outside your head: a note, an alarm, a visible object. Where could the reminder live so you'd trip over it?" },
  { test: /\b(procrastinat)/i, reframe: "Procrastination here usually means the first step is invisible or the task feels like it'll take forever. Name the first physical action and set a timer for five minutes — you can stop when it rings." },
];

export const DEFAULT_MENU = {
  quick: ["Stretch with arms over your head (2 min)", "Drink water while looking out a window (2 min)", "One song, full volume (4 min)", "Step outside the door and back (3 min)", "Cold water on wrists and face (2 min)"],
  reset: ["Make tea or coffee, slowly (10 min)", "Walk around the block (12 min)", "Doodle without a goal (8 min)", "Tidy one surface only (7 min)", "Lie on the floor and breathe (6 min)"],
  earned: ["An episode of something you love (25 min)", "Call or voice-note a friend (20 min)", "A proper meal, sitting down (30 min)", "A game, with a timer set first (30 min)"],
} as const;
