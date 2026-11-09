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
  { n: "01", icon: CircleDot, title: "Just Start (5 mins)", body: "A five-minute block with a timer you can see shrinking. Starting is the hard part; this makes starting small." },
  { n: "02", icon: ParkingSquare, title: "Distraction parking lot", body: "A thought barges in mid-focus. Type it, hit Enter, it's saved for later. You're back in the work before the thought finishes forming." },
  { n: "03", icon: Zap, title: "Kinetic Reading", body: "Everything below the section you're on is blurred. To unblur the next one, type or drag the missing word from what you just read." },
  { n: "04", icon: Gift, title: "Loot-drop breaks", body: "Finish a sprint and roll for the break: three minutes, seven, 15 push-ups, or a short clip that ends on its own." },
  { n: "05", icon: Users, title: "Focus pods", body: "Silent body doubling. Join two to four strangers on one 25-minute clock — no camera, no chat, just “3 others are focusing right now”." },
  { n: "06", icon: LifeBuoy, title: "Stuck detection", body: "Ten minutes on the same page, or a burst of aimless clicking, and a small card asks: summary, analogy, or smaller pieces?" },
  { n: "07", icon: Activity, title: "Final-stretch audio", body: "A lo-fi groove that quietly picks up 14 BPM and gains a bassline in the last three minutes." },
  { n: "08", icon: Hand, title: "Swipe to complete", body: "Finishing takes a full drag, then a deep thud and a burst of particles." },
  { n: "09", icon: Headphones, title: "Cognitive audio", body: "Spotify that shifts with the task: energy for boring work, stillness for dense work." },
  { n: "10", icon: Puzzle, title: "YouTube extension", body: "On youtube.com, every ten watched minutes the video pauses until you summarise it." },
  { n: "11", icon: ListTree, title: "Magic Breakdown", body: "“Study for the midterm” becomes five physical steps. The first one is always trivially easy." },
  { n: "12", icon: MonitorPlay, title: "Lecture mode", body: "Paste a YouTube link. It plays in 10-minute chunks and pauses to ask for one line." },
  { n: "13", icon: FileText, title: "PDF, one page at a time", body: "The original file. A goal of three pages, not a chapter. Ruler, notes, read-aloud." },
  { n: "14", icon: Sprout, title: "A companion that can't die", body: "It grows from your focus minutes. When you're away it rests. It never wilts." },
  { n: "15", icon: Waves, title: "Soundscapes", body: "Brown, pink, white noise, rain, fan, cafe, ocean, fire — synthesised on the spot." },
  { n: "16", icon: Dices, title: "Dopamine menu", body: "Pre-decided breaks in three sizes, plus a dice so a break doesn't become a two-hour scroll." },
  { n: "17", icon: Hourglass, title: "Time-guess calibration", body: "Guess how long, then see how long. Over a few tasks it tells you your multiplier." },
  { n: "18", icon: Sunrise, title: "Fresh Start", body: "One button archives everything open. Nothing deleted, nothing overdue, nothing red." },
  { n: "19", icon: Anchor, title: "Daily anchors", body: "Water, meds, food, movement. Resets at midnight and keeps no history." },
  { n: "20", icon: Leaf, title: "Hyperfocus nudge", body: "After 50 minutes a quiet line suggests water and a stretch. Never an alarm." },
  { n: "21", icon: Type, title: "Reader", body: "Paste anything. Bigger type, a ruler, bionic emphasis, sentence-by-sentence read-aloud." },
  { n: "22", icon: Plug, title: "Your AI, ADHD-aware", body: "An MCP server so ChatGPT, Claude or Cursor can help the way this app does." },
];

const HIGHLIGHTS = FEATURES.slice(0, 6);
const CATALOG = FEATURES.slice(6);

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
  { q: "Will my PDFs or videos be uploaded?", a: "No. PDFs stay on your device. Videos play through YouTube's privacy-enhanced embed; only the link and your notes are stored locally." },
  { q: "Is this medical advice?", a: "No. Kairos is a study tool informed by CBT-for-ADHD techniques and executive-function research. It doesn't diagnose or treat anything." },
];

export default function LandingPage() {
  return (
    <div className="flex flex-1 flex-col">
      <header className="sticky top-0 z-30 border-b border-border/80 bg-surface/80 backdrop-blur-md">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5 md:px-8">
          <Link href="/" aria-label="Kairos home"><Logo /></Link>
          <nav aria-label="Landing" className="hidden items-center gap-8 text-[13px] text-ink-muted md:flex">
            <a href="#principles" className="hover:text-ink">Why it works</a>
            <a href="#features" className="hover:text-ink">Inside</a>
            <a href="#ai" className="hover:text-ink">For your AI</a>
            <a href="#faq" className="hover:text-ink">FAQ</a>
          </nav>
          <LandingCta size="sm" />
        </div>
      </header>

      <main className="flex-1">
        <section className="relative overflow-hidden">
          <div aria-hidden="true" className="hero-grid pointer-events-none absolute inset-0" />
          <div className="relative mx-auto grid max-w-6xl items-center gap-16 px-5 pb-24 pt-16 md:grid-cols-[1.05fr_0.95fr] md:px-8 md:pb-28 md:pt-24">
            <div>
              <p className="eyebrow mb-6">A study space for ADHD brains</p>
              <h1 className="font-display text-[2.85rem] leading-[1.06] text-ink sm:text-6xl lg:text-[4.4rem]">
                Start small.
                <br />
                Finish <span className="marker italic">anyway.</span>
              </h1>
              <p className="mt-7 max-w-md text-[1.05rem] leading-relaxed text-ink-muted">
                A timer you can feel, a parking lot for runaway thoughts, tasks chopped into steps so small they&apos;re hard to avoid — and a companion that has never once been disappointed in anyone.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-5">
                <LandingCta />
                <a href="#features" className="text-sm text-ink-muted underline-offset-4 hover:text-ink hover:underline">
                  See what&apos;s inside
                </a>
              </div>
              <p className="mt-6 font-mono text-[11px] tracking-wide text-ink-faint">No account · No streaks · Nothing leaves this browser</p>
            </div>
            <div className="pb-10 md:pb-4">
              <HeroPreview />
            </div>
          </div>
        </section>

        <section className="border-y border-border">
          <div className="mx-auto grid max-w-6xl md:grid-cols-3">
            {[
              ["01", "Time is invisible", "“Five minutes” becomes forty-five. Not laziness — the clock in an ADHD brain runs on feel, and feel is unreliable."],
              ["02", "Starting is the hard part", "The task isn't too big. The first step is just invisible. Once it's visible and tiny, the body moves."],
              ["03", "Shame doesn't work", "Red overdue labels, broken streaks and nagging notifications lower follow-through. Most productivity apps are built out of them."],
            ].map(([n, t, b], i) => (
              <div key={n} className={`px-5 py-12 md:px-8 ${i > 0 ? "border-t border-border md:border-l md:border-t-0" : ""}`}>
                <div className="font-mono text-xs text-accent">{n}</div>
                <h2 className="mt-4 font-display text-[1.65rem] leading-tight text-ink">{t}</h2>
                <p className="mt-3 max-w-sm leading-relaxed text-ink-muted">{b}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="principles" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-24 md:px-8">
          <div className="max-w-2xl">
            <p className="eyebrow mb-5">Why it works</p>
            <h2 className="font-display text-4xl leading-[1.12] text-ink sm:text-5xl">Built from CBT for ADHD, not from a to-do list template.</h2>
          </div>
          <ol className="mt-16 grid gap-x-16 gap-y-12 md:grid-cols-2">
            {PRINCIPLES.map((p, i) => (
              <li key={p.title} className="border-t border-border pt-6">
                <span className="font-mono text-xs text-accent">{String(i + 1).padStart(2, "0")}</span>
                <h3 className="mt-3 font-display text-2xl text-ink">{p.title}</h3>
                <p className="mt-2 leading-relaxed text-ink-muted">{p.body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section id="features" className="scroll-mt-20 border-t border-border">
          <div className="mx-auto max-w-6xl px-5 py-24 md:px-8">
            <div className="flex max-w-2xl flex-col gap-4">
              <p className="eyebrow">What&apos;s inside</p>
              <h2 className="font-display text-4xl leading-[1.12] text-ink sm:text-5xl">Small tools. One quiet place.</h2>
              <p className="text-ink-muted">Each one solves a specific ADHD friction. None of them keep score against you.</p>
            </div>

            <ul className="mt-16 grid gap-px overflow-hidden rounded-xl border border-border bg-border sm:grid-cols-2">
              {HIGHLIGHTS.map((f) => {
                const Icon = f.icon;
                return (
                  <li key={f.n} className="bg-surface p-7 md:p-8">
                    <div className="mb-8 flex items-center justify-between">
                      <span className="font-mono text-xs text-ink-faint">{f.n}</span>
                      <Icon className="size-4 text-accent" aria-hidden="true" />
                    </div>
                    <h3 className="font-display text-2xl text-ink">{f.title}</h3>
                    <p className="mt-2 max-w-md text-sm leading-relaxed text-ink-muted">{f.body}</p>
                  </li>
                );
              })}
            </ul>

            <ul className="mt-4 border-t border-border">
              {CATALOG.map((f) => (
                <li key={f.n} className="grid grid-cols-[2.25rem_1fr] items-baseline gap-3 border-b border-border py-3.5 text-sm sm:grid-cols-[3rem_16rem_1fr] sm:gap-4">
                  <span className="font-mono text-xs text-ink-faint">{f.n}</span>
                  <span className="text-ink">{f.title}</span>
                  <span className="hidden text-ink-muted sm:block">{f.body}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>

        <section className="border-t border-border">
          <div className="mx-auto grid max-w-6xl items-start gap-16 px-5 py-24 md:grid-cols-2 md:px-8">
            <div>
              <p className="eyebrow mb-5">Studying from anything</p>
              <h2 className="font-display text-4xl leading-[1.12] text-ink">Lectures, PDFs, pasted text — made chewable.</h2>
              <p className="mt-4 max-w-md leading-relaxed text-ink-muted">
                A two-hour lecture is twelve ten-minute chunks with a one-line note after each. A 40-page chapter is a goal of three pages and the original file on screen. The content is the same; the shape is different.
              </p>
              <Link href="/app/study" className="mt-8 inline-flex items-center gap-2 text-sm text-ink underline-offset-4 hover:underline">
                <BookOpenText className="size-4" /> Open Study
              </Link>
            </div>
            <ol className="border-t border-border">
              {(
                [
                  { icon: MonitorPlay, title: "Lecture", meta: "Chunk 3 of 12 · pauses at 30:00" },
                  { icon: FileText, title: "PDF", meta: "Page 14 of 212 · original file · goal 3 pages" },
                  { icon: Type, title: "Reader", meta: "1,240 words · bionic on · 1.2× aloud" },
                ] as const
              ).map((row, i) => {
                const Icon = row.icon;
                return (
                  <li key={row.title} className="flex items-start gap-4 border-b border-border py-5">
                    <span className="font-mono text-xs text-ink-faint">{String(i + 1).padStart(2, "0")}</span>
                    <Icon className="mt-0.5 size-4 shrink-0 text-accent" aria-hidden="true" />
                    <div>
                      <div className="text-ink">{row.title}</div>
                      <div className="mt-0.5 font-mono text-[11px] text-ink-faint">{row.meta}</div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        </section>

        <section id="ai" className="scroll-mt-20 bg-[#2C363F]">
          <div className="mx-auto grid max-w-6xl gap-14 px-5 py-24 md:grid-cols-2 md:px-8">
            <div>
              <p className="mb-5 font-mono text-[11px] uppercase tracking-[0.14em] text-[#84A59D]">For your AI assistant</p>
              <h2 className="font-display text-4xl leading-[1.12] text-[#F7F5F0]">Teach ChatGPT, Claude or Cursor to help the ADHD way.</h2>
              <p className="mt-5 max-w-md leading-relaxed text-[#AEB8C6]">
                Kairos ships an MCP server. Connect it and your assistant gets tools for tiny-step breakdowns, planning a block around your energy, reframing self-talk, picking a break, and calibrating time guesses.
              </p>
              <p className="mt-4 text-sm text-[#8A97AA]">Stateless. Never sees your local data.</p>
            </div>
            <div className="border border-white/10 bg-white/[0.04] p-6 font-mono text-[13px] leading-relaxed text-[#EBE9E1]">
              <div className="mb-3 text-[11px] text-[#8A97AA]">{"// ChatGPT → Settings → Connectors"}</div>
              <pre className="whitespace-pre-wrap">{`{
  "kairos": {
    "url": "https://your-host/api/mcp"
  }
}`}</pre>
              <div className="mt-5 text-[11px] text-[#8A97AA]">{"// tools"}</div>
              <pre className="whitespace-pre-wrap text-[#A8C0B9]">{`break_down_task · plan_focus_block
reframe_self_talk · pick_break
estimate_time · parking_lot_triage
study_plan_from_material`}</pre>
            </div>
          </div>
        </section>

        <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-24 md:px-8">
          <p className="eyebrow mb-5">Questions</p>
          <h2 className="font-display text-4xl text-ink">Fair questions.</h2>
          <div className="mt-10 border-t border-border">
            {FAQ.map((f) => (
              <details key={f.q} className="group border-b border-border">
                <summary className="flex cursor-pointer list-none items-center justify-between gap-4 py-5 text-[1.05rem] text-ink">
                  {f.q}
                  <span className="font-mono text-ink-faint transition-transform group-open:rotate-45" aria-hidden="true">+</span>
                </summary>
                <p className="pb-5 leading-relaxed text-ink-muted">{f.a}</p>
              </details>
            ))}
          </div>
        </section>

        <section className="border-t border-border bg-accent-soft/50">
          <div className="mx-auto flex max-w-6xl flex-col items-start justify-between gap-8 px-5 py-16 md:flex-row md:items-center md:px-8">
            <div>
              <h2 className="font-display text-3xl text-ink sm:text-4xl">Five minutes. <span className="italic text-ink-muted">That&apos;s the whole ask.</span></h2>
              <p className="mt-2 text-ink-muted">The timer is already set. The companion is already waiting.</p>
            </div>
            <LandingCta />
          </div>
        </section>
      </main>

      <footer className="border-t border-border">
        <div className="mx-auto flex max-w-6xl flex-wrap items-end justify-between gap-6 px-5 py-10 text-sm text-ink-faint md:px-8">
          <div>
            <Logo />
            <p className="mt-3 max-w-xs text-xs leading-relaxed">Not a medical device. Informed by CBT for ADHD and executive-function research.</p>
          </div>
          <p className="inline-flex items-center gap-2 text-xs"><Brain className="size-3.5" /> Since 2026</p>
          <div className="flex gap-5 text-xs">
            <Link href="/app" className="hover:text-ink">App</Link>
            <Link href="/app/settings" className="hover:text-ink">Connect an AI</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
