# Kairos

**A calm, shame-free study and productivity space designed around how ADHD brains actually work.**

Visual timers you can feel, a parking lot for runaway thoughts, tasks chopped into steps so small they're hard to avoid, lecture and PDF study modes, a companion that has never once been disappointed in anyone — and a built-in MCP server so your AI assistant can help the same way.

No account. No streaks. Nothing leaves your browser.

---

## What's inside

| # | Feature | The ADHD friction it addresses |
|---|---------|-------------------------------|
| 01 | **Just Start (5 mins)** + 10/15/25 flow blocks, drawn as a shrinking disc | Time blindness, task paralysis |
| 02 | **Distraction Parking Lot** — floating capture bar during focus (`/` hotkey) | Distractibility (CBT "distractibility delay") |
| 03 | **Kinetic Reading** — text/PDF is cut into ~90-second sections; everything below is blurred until you type or drag the missing keyword from the section you just read | Passive reading, zoning out |
| 04 | **Loot-drop breaks** — "Claim reward" after a sprint rolls a 3-min breather, 7-min break, 15 push-ups, your own menu item, or a short embedded clip that ends on its own | Boring, predictable breaks; anticipation-driven dopamine |
| 05 | **Final-stretch audio** — procedural lo-fi that rises 72→86 BPM and gains a bassline in the last 3 minutes; noise soundscapes get a slow pulse | Lack of urgency until the deadline |
| 06 | **Magic Breakdown** — 3–5 verb-first micro-steps, first one trivially easy; shows only the *next* step | Task initiation, working memory |
| 07 | **Lecture mode** — YouTube in 5/10/15-min chunks; pauses for a one-line recall note; timestamped notes | Passive watching, attention drift |
| 08 | **PDF reader** — original page stays on screen; text and figures are parsed beside it (OCR for scans); page goal, ruler, notes, kinetic/bionic, read-aloud | Reading overwhelm |
| 09 | **Reader** — paste any text; bigger type, relaxed spacing, bionic emphasis, sentence-level TTS | Reading fatigue |
| 10 | **Companion** — a plant that grows from focus minutes; rests when you're away, never wilts | Motivation without guilt |
| 11 | **Soundscapes** — brown / pink / white noise and rain, synthesised in WebAudio (offline, no files) | Sensory regulation |
| 12 | **Dopamine menu** — pre-decided breaks in three sizes, with a quick-pick dice | Break paralysis / doom-scrolling |
| 13 | **Time-guess calibration** — guess vs. actual across tasks → your personal multiplier | Time blindness (CBT) |
| 14 | **Fresh Start** — archive everything open; nothing deleted, nothing "overdue" | Shame spiral |
| 15 | **Daily anchors** — water / meds / food / movement; resets at midnight, keeps no history | Basic self-care under hyperfocus |
| 16 | **Hyperfocus nudge** — quiet line after N minutes; never pauses or alarms | Hyperfocus |
| 17 | **Energy filter** — tag tasks low / medium / high and filter by how you feel | Variable energy |
| 18 | **Brain dump** — one thought per line → tasks | Working-memory overload |
| 19 | **Day bar** — where you are in the waking day, as a dot on a bar | Time blindness |
| 20 | **Insights** — totals that only go up; gaps are gaps, not failures | Anti-shame metrics |
| 21 | **MCP server** — 8 tools, 3 prompts, 2 resources for ChatGPT / Claude / Cursor | Making *any* assistant ADHD-aware |
| 22 | **Focus pods** — silent body doubling: join a 2–4 person 25-minute sprint; live "N others focusing right now"; no camera, no chat | Accountability without social load |
| 23 | **Stuck detection** — same page/step for 10 minutes or a burst of random clicking → a quiet "Stuck?" card offering a summary, an analogy, smaller pieces, or a smaller step | Frustration spirals, silent quitting |
| 24 | **Swipe-to-complete** — a full drag across the task, a deep sub-bass thud and a particle burst; the checkbox fires the same celebration | Dopamine at the moment of completion |
| 25 | **Cognitive audio (Spotify)** — matches music to the task's *load*: boring task → high-energy playlist, dense task → low-stimulation; Auto from the energy tag, or Brain-dead / Deep work override | Under- and over-stimulation |
| 26 | **YouTube extension** — MV3 content script: every 10 watched minutes the video pauses until you summarise; parking-lot button on youtube.com itself | Passive watching outside the app |
| 27 | **Open flow (ZenFlowTracker)** — a count-up stopwatch with no finish line; Numbers or Zen view (a slowly breathing, slowly shifting circle); a quiet burst every 10 minutes; "Capture session" banks any amount | Countdown anxiety, all-or-nothing thinking |
| 28 | **Listen (TactileReader)** — read-aloud steered from the keyboard: Space play/pause, ←/→ sentence, `[`/`]` speed 0.5–2.5×, keycaps flash on press | Passive listening, pacing control |
| 29 | **Find anything you wrote** — lecture notes, page notes, parked thoughts and tasks searched by meaning with an on-device model | Notes you can never find again |
| 30 | Theme, text size, relaxed spacing, reduced motion; JSON export/import; PWA installable | Accessibility & ownership |

### On-device by default

Nothing in the core loop needs a cloud model:

- **Speedbumps** use [compromise](https://github.com/spencermountain/compromise) part-of-speech tagging in the browser to blank the most important noun or entity, with noun distractors. ~1.5 ms per puzzle, deterministic, offline.
- **Magic Breakdown** is a keyword router over 15 hand-written templates (read, write, exam, flashcards, presentation, problem sets, research, code, admin, calls, cleaning, errands, exercise, planning…). The earliest keyword wins, so the leading verb decides. Only a task that matches nothing can go to the LLM — and only if you switch on **Cloud AI fallback**.
- **Stuck summaries and note search** can use a ~23 MB quantised MiniLM embedding model via [Transformers.js](https://huggingface.co/docs/transformers.js), downloaded once and run on WebGPU (or WASM). Opt-in from Settings → On-device AI & data.
- **Storage** is IndexedDB via [Dexie](https://dexie.org) behind every Zustand store — writes are instant and never wait on a network. Existing localStorage data migrates automatically on first load.

See [`docs/DESIGN_PRINCIPLES.md`](docs/DESIGN_PRINCIPLES.md) for the reasoning behind each decision.

## Quick start

```bash
npm install          # also copies the pdf.js worker into /public
npm run dev          # http://localhost:3000
```

Open `/` for the landing page, `/app` for the app.

### Optional: cloud LLM fallback

Breakdowns, Kinetic Reading puzzles and "Stuck?" explanations are computed on the device. If you host the app and want an LLM for the leftovers (tasks no template matches, richer explanations), copy `.env.example` to `.env.local` and set `OPENAI_API_KEY` (any OpenAI-compatible endpoint works via `OPENAI_BASE_URL`). Users still have to turn on **Cloud AI fallback** in Settings before anything is sent. The routes fall back to local results on any failure, so the UI never breaks.

### Optional: background sync

Set `NEXT_PUBLIC_SYNC_URL` (and optionally `NEXT_PUBLIC_SYNC_KEY`, sent as a bearer token) to have changed stores POSTed quietly when online, as `{ app, deviceId, stores: { [name]: { value, updatedAt } } }`. A Supabase Edge Function, Firebase Function or any small API can receive it. The device stays the source of truth; offline changes queue in an IndexedDB outbox.

### Optional: Spotify Cognitive Audio Engine

1. Create an app at the [Spotify developer dashboard](https://developer.spotify.com/dashboard).
2. Add the redirect URI `http://127.0.0.1:3000/app/spotify/callback` (Spotify no longer accepts `localhost`; open the dev server at `127.0.0.1` too) plus `https://<your-domain>/app/spotify/callback` for production.
3. Put the Client ID in `.env.local` as `NEXT_PUBLIC_SPOTIFY_CLIENT_ID`. The flow is Authorization Code + PKCE, so there is no client secret and no server session — tokens live in the browser.
4. Press **Connect Spotify** on the dashboard. Playback control needs Spotify Premium and an active device (open Spotify anywhere and press play once).

`shiftAudioGear("low-load" | "high-load")` in `src/lib/spotifyApi.ts` dips the volume, switches to the matching playlist and ramps back up. Playlists are editable in Settings → Cognitive audio.

### Optional: Focus Pods across instances

Pods presence is in-memory by default (perfect for local use or a single server). On serverless hosting set `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` so every instance sees the same pods. Members are identified by a random ID and a nickname only; nothing else is sent.

### Optional: YouTube extension

`extension/` is a standalone Manifest V3 Chrome extension. Load it unpacked from `chrome://extensions` — see [`extension/README.md`](extension/README.md).

### Scripts

| Command | What it does |
|---------|--------------|
| `npm run dev` | Dev server (Turbopack) |
| `npm run build` / `npm start` | Production build / serve |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |

## Connect your AI assistant (MCP)

The app serves a stateless Model Context Protocol server at **`/api/mcp`** (Streamable HTTP). Point ChatGPT (Connectors), Claude, Cursor or any MCP client at it and the assistant gains:

- **Tools:** `break_down_task`, `plan_focus_block`, `reframe_self_talk`, `pick_break`, `estimate_time`, `parking_lot_triage`, `study_plan_from_material`, `make_speedbump`
- **Prompts:** `adhd_aware_assistant`, `body_double_session`, `unstick_me`
- **Resources:** `kairos://guide/communication`, `kairos://guide/principles`

Setup for each client is in [`docs/MCP.md`](docs/MCP.md).

## Tech stack

Next.js 16 (App Router, Turbopack, Cache Components) · React 19 · TypeScript · Tailwind CSS v4 · Zustand (persisted to IndexedDB via Dexie) · compromise (NLP) · Transformers.js (on-device embeddings) · framer-motion · canvas-confetti · Lucide icons · pdf.js · YouTube IFrame API · Web Audio · Web Speech · Spotify Web API (PKCE) · `mcp-handler` + MCP SDK v2 · optional Upstash Redis for pods.

Architecture notes: [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Privacy

Everything — tasks, notes, focus history, companion — lives in your browser's IndexedDB. The on-device model runs locally; note search never uploads anything. Cloud AI is off unless you turn it on. PDFs are rendered client-side and never uploaded. Videos play through YouTube's privacy-enhanced embed. The MCP server is stateless and has no access to your data. Focus Pods send only a random member ID, a nickname and a focusing/idle flag, kept for 60 seconds. Spotify tokens stay in the browser. The "Stuck?" helper sends the current page text to `/api/explain` only when you press a button on the card. **Export JSON** in Settings gives you a file you own.

## Launch on Vercel

Kairos can ship with **zero keys**. The browser is the backend for tasks, notes, timers and the companion. Server routes are optional upgrades.

### What you need to go live

1. A [Vercel](https://vercel.com) account (Hobby is enough).
2. A GitHub (or GitLab) repo for this project, connected to Vercel. Push to `main` deploys production; pull requests get preview URLs.
3. Node 22+ locally. CI uses Node 22.

Then: import the repo in the Vercel dashboard (Framework Preset: Next.js) or run `npx vercel` in this folder. After the first production URL exists, add it as a Spotify redirect if you use Cognitive Audio.

### API keys — all optional

| Variable | Required to launch? | What it unlocks | How to get it |
|---|---|---|---|
| *(none)* | **No** | Core app, lecture mode, PDF, parking lot, pods on a single instance | — |
| `OPENAI_API_KEY` | No | Cloud fallback for Magic Breakdown leftovers, richer Stuck explanations, LLM puzzles. Users still flip **Cloud AI fallback** in Settings. | [OpenAI](https://platform.openai.com/api-keys) or any compatible host |
| `OPENAI_BASE_URL` | No | Point the same routes at Groq, OpenRouter, Azure, Ollama, LM Studio… | Your provider's `/v1` URL |
| `OPENAI_MODEL` | No | Override the default `gpt-4o-mini` | Model id from that provider |
| `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` | No | Cognitive Audio Engine (PKCE, no secret) | [Spotify Developer Dashboard](https://developer.spotify.com/dashboard). Redirect URIs: `https://<your-domain>/app/spotify/callback` and `http://127.0.0.1:3000/app/spotify/callback`. Playback needs Spotify Premium. |
| `UPSTASH_REDIS_REST_URL` + `UPSTASH_REDIS_REST_TOKEN` | No | Focus Pods shared across Vercel serverless instances. Without them, pods work in one process (fine for local / a single long-lived server). | [Upstash Redis](https://upstash.com) REST credentials |
| `NEXT_PUBLIC_SYNC_URL` (+ optional `NEXT_PUBLIC_SYNC_KEY`) | No | Background POST of local store snapshots to *your* API | Any HTTPS endpoint you run (Supabase Edge Function, Firebase, etc.) |

Copy `.env.example` to `.env.local` for development. On Vercel, set the same keys in **Project → Settings → Environment Variables** (Production / Preview / Development as needed). Never put secrets in `NEXT_PUBLIC_*` except the Spotify Client ID, which is public by design (PKCE).

### What is *not* required

- No database of your own for the core product (IndexedDB in the browser).
- No auth provider, no user accounts.
- No blob/file storage (PDFs never leave the device).
- No email, analytics, or payments to launch.

### CI/CD

`.github/workflows/ci.yml` runs typecheck, lint and production build on every push and pull request. Connect the GitHub repo to Vercel so:

- **PR / branch push** → Vercel Preview + GitHub check from this workflow
- **push to `main`** → production deploy (after CI is green, if you mark the workflow as a required status check)

GitHub Actions secrets are **not** needed for Vercel Git deploys. They are only needed if you later switch to CLI deploys (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`).

## Not medical advice

Kairos is a study tool informed by CBT-for-ADHD techniques and executive-function research. It does not diagnose or treat anything. If you're struggling, a clinician or ADHD coach can help in ways software can't.

## License

MIT
