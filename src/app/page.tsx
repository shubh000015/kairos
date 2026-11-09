import {
  Anchor,
  BookOpenText,
  Brain,
  Activity,
  CircleDot,
  Dices,
  FileText,
  Gift,
  Hand,
  Headphones,
  Hourglass,
  Leaf,
  LifeBuoy,
  ListTree,
  MonitorPlay,
  ParkingSquare,
  Plug,
  Puzzle,
  Sprout,
  Sunrise,
  Type,
  Users,
  Waves,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { Logo } from "@/components/brand/Logo";
import { HeroPreview } from "@/components/landing/HeroPreview";
import { LandingCta } from "@/components/landing/LandingCta";

const FEATURES = [
  { n: "01", icon: CircleDot, title: "Just Start (5 mins)", body: "A five-minute block with a timer you can see shrinking. Starting is the hard part; this makes starting small.", wide: true },
  { n: "02", icon: ParkingSquare, title: "Distraction parking lot", body: "A thought barges in mid-focus. Type it, hit Enter, it's saved for later. You're back in the work before the thought finishes forming.", wide: true },
  { n: "03", icon: Zap, title: "Kinetic Reading", body: "Everything below the section you're on is blurred. To unblur the next one, type or drag the missing word from what you just read. Hands move every 90 seconds; zoning out doesn't get a chance.", wide: true },
  { n: "04", icon: Gift, title: "Loot-drop breaks", body: "Finish a sprint and roll for the break: three minutes, seven, 15 push-ups, or a short clip that ends on its own. Not knowing is the dopamine.", wide: true },
  { n: "05", icon: Users, title: "Focus pods", body: "Silent body doubling. Join two to four strangers on one 25-minute clock — no camera, no chat, just “3 others are focusing right now”.", wide: true },
  { n: "06", icon: LifeBuoy, title: "Stuck detection", body: "Ten minutes on the same page, or a burst of aimless clicking, and a small card asks: summary, analogy, or smaller pieces? Never a modal, never a scold.", wide: true },
  { n: "07", icon: Activity, title: "Final-stretch audio", body: "A lo-fi groove that quietly picks up 14 BPM and gains a bassline in the last three minutes. Manufactured deadline energy, on every block." },
  { n: "08", icon: Hand, title: "Swipe to complete", body: "Finishing takes a full drag, then a deep thud and a burst of particles. A box tick is too cheap for a brain that needs the payoff." },
  { n: "09", icon: Headphones, title: "Cognitive audio", body: "Spotify that shifts with the task's load: boring work gets energy, dense work gets stillness. Auto from the energy tag, or flip it yourself." },
  { n: "10", icon: Puzzle, title: "YouTube extension", body: "On youtube.com itself: every ten watched minutes the video pauses until you summarise it. A parking-lot button sits on the page." },
  { n: "11", icon: ListTree, title: "Magic Breakdown", body: "“Study for the midterm” becomes five physical steps. The first one is always trivially easy on purpose." },
  { n: "12", icon: MonitorPlay, title: "Lecture mode", body: "Paste a YouTube link. It plays in 10-minute chunks and pauses to ask for one line. Notes pin to timestamps." },
  { n: "13", icon: FileText, title: "PDF, one page at a time", body: "Set a goal of three pages, not a chapter. Reading ruler, per-page notes, read-aloud, bionic text view." },
  { n: "14", icon: Sprout, title: "A companion that can't die", body: "It grows from your focus minutes. When you're away it rests. It never wilts, nags, or looks disappointed." },
  { n: "15", icon: Waves, title: "Soundscapes", body: "Brown, pink, white noise and rain, synthesised on the spot. No downloads, works offline." },
  { n: "16", icon: Dices, title: "Dopamine menu", body: "Pre-decided breaks in three sizes, plus a quick-pick dice so a break doesn't become a two-hour scroll." },
  { n: "17", icon: Hourglass, title: "Time-guess calibration", body: "Guess how long, then see how long. Over a few tasks it tells you your multiplier — the fix for time blindness." },
  { n: "18", icon: Sunrise, title: "Fresh Start", body: "One button archives everything open. Nothing deleted, nothing overdue, nothing red. Monday feels like Monday." },
  { n: "19", icon: Anchor, title: "Daily anchors", body: "Water, meds, food, movement. Resets at midnight and keeps no history. Yesterday is not on the screen." },
  { n: "20", icon: Leaf, title: "Hyperfocus nudge", body: "After 50 minutes a quiet line suggests water and a stretch. It never pauses you or sounds an alarm." },
  { n: "21", icon: Type, title: "Reader", body: "Paste anything. Bigger type, relaxed spacing, a ruler, bionic emphasis, and sentence-by-sentence read-aloud." },
  { n: "22", icon: Plug, title: "Your AI, ADHD-aware", body: "A built-in MCP server lets ChatGPT, Claude or Cursor break tasks down, plan blocks and reframe self-talk the way this app does." },
];

const PRINCIPLES = [
  { title: "Time has to be visible", body: "ADHD brains don't feel time passing. So every timer here is a shape that shrinks, not a number that changes. The day itself is a bar with a dot on it." },
  { title: "Starting beats finishing", body: "Task paralysis is the real enemy. The biggest button on the screen starts five minutes. Breakdowns make step one laughably easy. Partway always counts." },
  { title: "Shame is not a strategy", body: "No streaks to break, no overdue in red, no disappointed pet. Research and lived experience agree: guilt lowers follow-through. Everything here is phrased as an invitation." },
  { title: "Get the thought out of your head", body: "The parking lot is the CBT “distractibility delay” made concrete. Brain dump, anchors and notes all do the same job: externalise it so working memory can let go." },
];

const FAQ = [
  { q: "Is it free? Do I need an account?", a: "Yes, and no. Everything is stored in your browser. There is nothing to sign up for and nothing is sent to a server unless you choose to export a file." },
  { q: "Why no streaks? Streaks motivate me.", a: "For a while, until the first break — then they tend to end the whole habit. Kairos counts things that only go up: minutes focused, blocks started, thoughts parked. If a streak genuinely works for you, that's great; this is for the many people it hurts." },
  { q: "Does the Magic Breakdown use AI?", a: "It works offline using patterns tuned for study tasks. If the person hosting the app adds an OpenAI-compatible key, it upgrades to an LLM automatically. Either way the first step is always a tiny physical action." },
  { q: "Will my PDFs or videos be uploaded?", a: "No. PDFs are rendered in your browser and never leave it. Videos play through YouTube's privacy-enhanced embed; only the link and your notes are stored locally." },
  { q: "Is this medical advice?", a: "No. Kairos is a study tool informed by CBT-for-ADHD techniques and executive-function research. It doesn't diagnose or treat anything. If you're struggling, a clinician or ADHD coach can help in ways software can't." },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-border/60 bg-surface/85 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3 md:px-8">
          <Link href="/" aria-label="Kairos home"><Logo /></Link>
          <nav aria-label="Landing" className="hidden items-center gap-6 text-sm text-ink-muted md:flex">
            <a href="#principles" className="hover:text-ink">Why it works</a>
            <a href="#features" className="hover:text-ink">What&apos;s inside</a>
            <a href="#ai" className="hover:text-ink">For your AI</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
          </nav>
          <LandingCta size="sm" />
        </div>
      </header>

      <main className="flex-1">
        {/* Hero */}
        <section className="relative mx-auto grid max-w-6xl items-center gap-12 px-5 pb-20 pt-16 md:grid-cols-[1.1fr_1fr] md:px-8 md:pt-24">
          <div aria-hidden="true" className="pointer-events-none absolute -top-24 right-[-10%] -z-10 h-[30rem] w-[36rem] rounded-full bg-accent/15 blur-3xl" />
          <div aria-hidden="true" className="pointer-events-none absolute bottom-[-6rem] left-[-12%] -z-10 size-80 rounded-full bg-mist-200/40 blur-3xl" />
          <div>
            <p className="eyebrow mb-5">a study space for adhd brains</p>
            <h1 className="font-display text-5xl lowercase leading-[1.04] text-ink sm:text-6xl lg:text-7xl">
              start small.
              <br />
              <span className="text-ink-muted">finish</span> <span className="marker italic">anyway.</span>
            </h1>
            <p className="mt-7 max-w-xl text-lg leading-relaxed text-ink-muted">
              A visual timer you can feel, a parking lot for runaway thoughts, tasks chopped into steps so small they&apos;re hard to avoid — and a companion that has never once been disappointed in anyone.
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-4">
              <LandingCta />
              <a href="#features" className="text-ink-muted underline-offset-4 hover:text-ink hover:underline">See everything inside →</a>
            </div>
            <p className="mt-6 text-sm text-ink-faint">No account. No streaks. Nothing leaves your browser.</p>
          </div>
          <div className="pb-8">
            <HeroPreview />
          </div>
        </section>

        {/* Honest problem statement */}
        <section className="border-y border-border bg-surface-raised/60">
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 md:grid-cols-3 md:px-8">
            {[
              ["01", "Time is invisible", "“Five minutes” becomes forty-five. Not laziness — the clock in an ADHD brain runs on feel, and feel is unreliable."],
              ["02", "Starting is the hard part", "The task isn't too big. The first step is just invisible. Once it's visible and tiny, the body moves."],
              ["03", "Shame doesn't work", "Red overdue labels, broken streaks and nagging notifications lower follow-through. Most productivity apps are built out of them."],
            ].map(([n, t, b], i) => (
              <div key={n}>
                <div className={`font-display mb-3 text-2xl italic ${["text-accent", "text-mist-500", "text-urgent"][i]}`}>{n}</div>
                <h2 className="font-display text-2xl text-ink">{t}</h2>
                <p className="mt-2 leading-relaxed text-ink-muted">{b}</p>
              </div>
            ))}
          </div>
        </section>

        {/* Principles */}
        <section id="principles" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-20 md:px-8">
          <div className="max-w-2xl">
            <p className="eyebrow mb-4">why it works</p>
            <h2 className="font-display text-4xl lowercase text-ink sm:text-5xl">built from cbt-for-adhd, not from a to-do list template.</h2>
          </div>
          <ol className="mt-12 grid gap-x-12 gap-y-10 md:grid-cols-2">
            {PRINCIPLES.map((p, i) => (
              <li key={p.title} className="flex gap-5">
                <span className="font-display mt-1 text-3xl text-accent">{String(i + 1).padStart(2, "0")}</span>
                <div>
                  <h3 className="text-xl text-ink">{p.title}</h3>
                  <p className="mt-2 leading-relaxed text-ink-muted">{p.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* Features */}
        <section id="features" className="scroll-mt-20 border-t border-border bg-surface-raised/60">
          <div className="mx-auto max-w-6xl px-5 py-20 md:px-8">
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <p className="eyebrow mb-4">what&apos;s inside</p>
                <h2 className="font-display text-4xl lowercase text-ink sm:text-5xl">small tools. one quiet place.</h2>
              </div>
              <p className="max-w-sm text-ink-muted">Each one solves a specific ADHD friction. None of them keep score against you.</p>
            </div>
            <ul className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {FEATURES.map((f, i) => {
                const Icon = f.icon;
                const chip = ["bg-accent-soft text-sage-700", "bg-mist-100 text-mist-700", "bg-clay-100 text-urgent"][i % 3];
                return (
                  <li key={f.n} className={`flex flex-col rounded-3xl border border-border bg-surface p-6 shadow-soft transition-shadow hover:shadow-md ${f.wide ? "sm:col-span-2" : ""}`}>
                    <div className="mb-6 flex items-center justify-between">
                      <span className="eyebrow">{f.n}</span>
                      <span className={`flex size-9 items-center justify-center rounded-xl ${chip}`}>
                        <Icon className="size-[18px]" aria-hidden="true" />
                      </span>
                    </div>
                    <h3 className={`text-ink ${f.wide ? "font-display text-2xl" : "text-lg"}`}>{f.title}</h3>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">{f.body}</p>
                  </li>
                );
              })}
            </ul>
          </div>
        </section>

        {/* Study modes highlight */}
        <section className="mx-auto max-w-6xl px-5 py-20 md:px-8">
          <div className="grid items-center gap-10 md:grid-cols-2">
            <div>
              <p className="eyebrow mb-4">studying from anything</p>
              <h2 className="font-display text-4xl lowercase text-ink">lectures, pdfs, pasted text — made chewable.</h2>
              <p className="mt-4 leading-relaxed text-ink-muted">
                A two-hour lecture is twelve ten-minute chunks with a one-line note after each. A 40-page chapter is a goal of three pages, a ruler under the line, and read-aloud for when your eyes are done. The content is the same; the shape is different.
              </p>
              <Link href="/app/study" className="mt-6 inline-flex items-center gap-2 text-ink underline-offset-4 hover:underline">
                <BookOpenText className="size-4" /> Open Study
              </Link>
            </div>
            <div className="grid gap-3">
              {[
                [MonitorPlay, "Lecture mode", "Chunk 3 of 12 · pauses at 30:00 · “what was that about?”"],
                [FileText, "PDF reader", "Page 14 of 212 · goal 3 pages · 2 of 3 · ruler on"],
                [Type, "Reader", "1,240 words · about 6 min · bionic on · reading aloud at 1.2×"],
              ].map(([Icon, t, b]) => {
                const I = Icon as typeof MonitorPlay;
                return (
                  <div key={t as string} className="flex items-start gap-4 rounded-2xl border border-border bg-surface-raised p-4 shadow-soft">
                    <I className="mt-0.5 size-5 shrink-0 text-accent" aria-hidden="true" />
                    <div>
                      <div className="text-ink">{t as string}</div>
                      <div className="font-mono text-xs text-ink-faint">{b as string}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        {/* MCP — the one deep-slate band on the page, so it reads as a different register. */}
        <section id="ai" className="relative scroll-mt-20 overflow-hidden bg-[#2C363F]">
          <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-32 size-96 rounded-full bg-[#84A59D]/20 blur-3xl" />
          <div className="mx-auto grid max-w-6xl gap-10 px-5 py-20 md:grid-cols-2 md:px-8">
            <div>
              <p className="mb-4 text-[0.7rem] lowercase tracking-[0.16em] text-[#84A59D]">for your ai assistant</p>
              <h2 className="font-display text-4xl lowercase text-[#F7F5F0]">teach chatgpt, claude or cursor to help the adhd way.</h2>
              <p className="mt-4 leading-relaxed text-[#AEB8C6]">
                Kairos ships an MCP server. Connect it and your assistant gets tools for tiny-step breakdowns, planning a focus block around your energy, reframing shame-y self-talk, picking a break from a dopamine menu, and calibrating time guesses — plus a prompt that explains how to talk to someone with ADHD without making it worse.
              </p>
              <p className="mt-4 text-sm text-[#8A97AA]">Stateless. Never sees your local data. Works with any client that speaks Streamable HTTP, or over stdio via <code className="font-mono">mcp-remote</code>.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-white/5 p-5 font-mono text-sm leading-relaxed text-[#EBE9E1]">
              <div className="mb-3 text-xs text-[#8A97AA]">{"// ChatGPT → Settings → Connectors, or Cursor mcp.json"}</div>
              <pre className="whitespace-pre-wrap">{`{
  "kairos": {
    "url": "https://your-host/api/mcp"
  }
}`}</pre>
              <div className="mt-4 text-xs text-[#8A97AA]">{"// tools"}</div>
              <pre className="whitespace-pre-wrap text-[#A8C0B9]">{`break_down_task · plan_focus_block
reframe_self_talk · pick_break
estimate_time · parking_lot_triage
study_plan_from_material`}</pre>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-20 md:px-8">
          <p className="eyebrow mb-4">questions</p>
          <h2 className="font-display text-4xl lowercase text-ink">fair questions.</h2>
          <div className="mt-8 divide-y divide-border border-y border-border">
            {FAQ.map((f) => (
              <details key={f.q} className="group py-4">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg text-ink">
                  {f.q}
                  <span className="text-ink-faint transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="mt-3 leading-relaxed text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        {/* Final CTA */}
        <section className="mx-auto max-w-6xl px-5 pb-24 md:px-8">
          <div className="relative flex flex-col items-start gap-6 overflow-hidden rounded-[2rem] border border-border bg-surface-raised p-10 shadow-soft md:flex-row md:items-center md:justify-between">
            <div aria-hidden="true" className="pointer-events-none absolute -right-16 -top-24 size-64 rounded-full bg-accent/20 blur-3xl" />
            <div aria-hidden="true" className="pointer-events-none absolute -bottom-20 left-1/3 size-48 rounded-full bg-clay-100/60 blur-3xl" />
            <div>
              <h2 className="font-display text-3xl lowercase text-ink">five minutes. <span className="italic text-ink-muted">that&apos;s the whole ask.</span></h2>
              <p className="mt-2 text-ink-muted">The timer is already set. The companion is already waiting.</p>
            </div>
            <LandingCta />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 py-8 text-sm text-ink-faint md:px-8">
          <Logo stacked />
          <p className="inline-flex items-center gap-2"><Brain className="size-4" /> Not a medical device. Informed by CBT for ADHD and executive-function research.</p>
          <div className="flex gap-4">
            <Link href="/app" className="hover:text-ink">App</Link>
            <Link href="/app/settings" className="hover:text-ink">Connect an AI</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
