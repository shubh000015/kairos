# Architecture

Kairos is a client-first Next.js app. Almost everything runs in the browser; the server routes are optional helpers (AI upgrades, pod presence, MCP).

```
src/
├── app/                      Routes (App Router)
│   ├── page.tsx              Landing page (server component + small client islands)
│   ├── layout.tsx            Fonts, theme script, store hydration, toaster
│   ├── app/                  The application shell
│   │   ├── layout.tsx        Nav rail + parking lot (present on every app screen)
│   │   ├── page.tsx          Focus dashboard
│   │   ├── tasks/ study/ routines/ insights/ settings/
│   │   └── spotify/callback/ Finishes the Spotify PKCE exchange, then returns to /app
│   ├── api/breakdown/        POST — Magic Breakdown (heuristic, LLM-upgradable)
│   ├── api/puzzle/           POST — Kinetic Reading speedbump (heuristic, LLM-upgradable)
│   ├── api/explain/          POST — "Stuck?" summary / analogy / smaller pieces (heuristic, LLM-upgradable)
│   ├── api/pods/             GET stats · POST join / heartbeat / leave (memory or Upstash Redis)
│   ├── api/mcp/              MCP server (Streamable HTTP, stateless)
│   ├── error.tsx not-found.tsx manifest.ts icon.svg
├── components/
│   ├── timer/                VisualTimer, FocusControls, FocusSession, RewardDrop, SoundscapePlayer, HyperfocusGuard
│   ├── parking-lot/          DistractionParkingLot (capture), ParkedThoughts (review)
│   ├── tasks/                TaskCapture, TaskItem, TaskList, FreshStart, SwipeToComplete
│   ├── study/                StudyHub, VideoStudy, PdfReader, TextReader, KineticReader, StuckNudge, BionicText, ReadingRuler
│   ├── pods/                 FocusPods (silent body doubling)
│   ├── audio/                AudioEngine (Spotify controller), SpotifyCallback
│   ├── companion/            CompanionSprite (SVG), CompanionCard
│   ├── routines/             DailyAnchors, DopamineMenu
│   ├── insights/             Insights, DayBar
│   ├── settings/ landing/ app-shell/ brand/ theme/ ui/ (incl. CompletionBurst)
├── store/                    Zustand stores, one per domain, all persisted
│   ├── registry.ts           ALL_STORES + export / import / reset
│   └── StoreHydrator.tsx     Rehydrates after mount (see "Hydration" below)
├── hooks/                    useNow, useHydrated, useSpeech, useStuckDetector
├── lib/                      Pure helpers: time, id, sound, soundscape, lofi, kinetic, rewards, explain, spotifyApi, youtube, magicBreakdown
│   └── pods/server.ts        Pod matching + presence store (server only)
└── mcp/                      MCP tool/prompt/resource definitions + knowledge text
extension/                    Standalone Chrome extension (MV3) for youtube.com — see extension/README.md
```

## State

Each domain has its own Zustand store with the `persist` middleware (`localStorage`):

| Store | Holds |
|-------|-------|
| `useFocusStore` | timer status, `endsAt`, block id, per-day focus history (v2, migrated from v1); `startFor(ms)` for pod-synchronised blocks |
| `useParkingLotStore` | parked thoughts with status parked / done / promoted |
| `useTaskStore` | tasks with steps, energy, estimate, actual time, archive flag; `replaceStep` for "shrink this step" |
| `useCompanionStore` | name, hue, total fed ms, last fed |
| `useRoutineStore` | anchors, today's checks (only today is kept), dopamine menu |
| `useStudyStore` | video sessions + notes, PDF sessions + notes, reader text, kinetic preference + progress, speedbumps cleared |
| `useRewardStore` | loot-drop settings, current reward, break `endsAt`, custom/hidden videos, drops claimed |
| `usePodStore` | random member id, nickname, hue, current pod id, sprints-together count (snapshot is not persisted) |
| `useAudioEngineStore` | engine on/off, gear mode (auto / low-load / high-load), playlist URIs, crossfade, shift-on-start |
| `useSettingsStore` | theme, text size, spacing, motion, hyperfocus guard, soundscape, final-stretch pacing |

Cross-store effects flow one way: `useFocusStore` credits finished time to the active task and to the companion. Nothing imports the focus store back. `FocusPods` and `AudioEngine` *read* the focus store (status, block id) and only ever call `startFor`.

### Local-first storage

`store/storage.ts` exposes `localFirstStorage()`, a drop-in for `createJSONStorage(() => localStorage)` backed by IndexedDB through Dexie (`lib/db.ts`: database name still `quiet-focus` so existing local data survives the Kairos rebrand, tables `kv` and `outbox`). On first read of a key it migrates any legacy localStorage value into IndexedDB and removes the old copy. `settings-store` is also mirrored to localStorage because `ThemeScript` must read the theme synchronously before first paint. If IndexedDB is unavailable (some private modes) every call falls back to localStorage.

Async storage has one hazard: a `set()` before that store's first read would persist defaults over real data. The adapter drops writes for a key until it has been read once; hydration then merges as usual. `exportAllData`/`importAllData` go through the same `readRaw`/`writeRaw`.

Every write also upserts the key into `outbox`. `lib/sync.ts` (only active when `NEXT_PUBLIC_SYNC_URL` is set) debounces 4 s, flushes on `online`, on tab hide and every 60 s, POSTs the dirty stores in one batch, and deletes outbox rows only if they haven't changed again in flight.

### Hydration

Every store is created with `skipHydration: true`. The server render and the first client render therefore use identical defaults; `StoreHydrator` calls `persist.rehydrate()` after mount. This avoids React hydration mismatches without `suppressHydrationWarning` hacks. Array-returning selectors go through `useShallow`. Components that need browser-only values (pods, audio engine) render `null` until `useHydrated()` is true.

### Time

Next 16 prerendering rejects `Date.now()` during render. All clock reads happen in effects or via `useNow()` (a `useSyncExternalStore` whose server snapshot is `null`). The timer stores an absolute `endsAt` and derives remaining time, so it survives background tabs and reloads.

## Theming

Tailwind v4 with a `@theme` palette (sage / mist / clay / stone) and semantic CSS variables (`--surface`, `--ink`, `--accent`…) that flip on `html[data-theme]`. `ThemeScript` sets the attribute before first paint from `localStorage`; `ThemeApplier` keeps it in sync afterwards. `dark:` is a custom variant bound to `[data-theme="dark"]`. Readability toggles are also `data-*` attributes on `<html>`.

## Study modes

- **Video**: loads the YouTube IFrame API once, embeds via `youtube-nocookie.com`, polls `getCurrentTime()` every second, and pauses at chunk boundaries to prompt for a one-line note.
- **PDF**: `pdfjs-dist` is dynamically imported on the client; the worker is copied to `/public` by `scripts/copy-pdf-worker.mjs` on `postinstall`. One page is rendered at a time; text is extracted with `getTextContent()` for the text view and TTS.
- **Reader / TTS**: `useSpeech` speaks sentence-by-sentence so the current sentence can be highlighted reliably across browsers.
- **Kinetic Reading** (`lib/kinetic.ts`, `KineticReader`): `chunkText` cuts text at paragraph/sentence boundaries into ~110-word sections. `makePuzzle` is deterministic per chunk (seeded by a text hash): it scores content words by length, in-chunk frequency and mid-sentence capitalisation, removes the best one from a mid-length sentence, and draws distractors from the same chunk. Sections below the current one get `.kinetic-locked` (blur + mask + `pointer-events: none`); only two locked sections are rendered as a teaser. `requestPuzzle` tries `/api/puzzle` for an LLM-made gap but the heuristic renders first, so the loop never waits on the network. Reader progress is persisted per text hash.

## On-device intelligence

`lib/aiPolicy.ts` is the single switch: `cloudAllowed()` is true only when the user has turned on Cloud AI fallback; `onDeviceMLEnabled()` gates the embedding model.

- **Puzzles** — `makePuzzle` runs `compromise` over the chunk: nouns +0.7, proper nouns/people/places/organisations/acronyms +0.4, verbs/adjectives/adverbs −0.6, on top of the length/frequency/capitalisation score. Distractors prefer the answer's part of speech. `requestPuzzle` returns the local puzzle and only asks `/api/puzzle` when cloud is allowed.
- **Breakdown** — `TEMPLATES` in `lib/magicBreakdown.ts` are compiled to one whole-word regex each; `matchTemplate` takes the template whose keyword appears *earliest* in the title. `requestBreakdown` returns a template hit immediately (`source: "template"`); unmatched titles go to `/api/breakdown` only with cloud allowed, otherwise generic starter steps.
- **Embeddings** — `lib/ondevice.ts` dynamic-imports `@huggingface/transformers` (so it ships only when used), loads `Xenova/all-MiniLM-L6-v2` at `q8` on WebGPU if an adapter exists (falling back to WASM), reports download progress through a `useSyncExternalStore` subscription, and caches vectors per string. `summarizeOnDevice` picks sentences by cosine to the passage centroid with maximal-marginal-relevance (λ = 0.7) de-duplication; `semanticSearch` ranks notes by cosine. `requestExplanation` tries this before the extractive heuristic.

## Open flow and Listen

`ZenFlowTracker` reads `flowStartedAt` from `useFocusStore` (absolute, so a reload resumes), ticks once a second with `setInterval` (cleared on unmount), and computes milestones from elapsed time; the milestone counter is seeded on mount so a reload doesn't replay old celebrations. `canvas-confetti` is dynamic-imported and respects reduced motion. `captureFlow()` credits the active task, companion and history exactly like a finished block. The dashboard's Countdown / Open flow switch is a setting; a running session always wins the view.

`TactileReader` queues one `SpeechSynthesisUtterance` per sentence through a module-level `speakChain`; a token counter invalidates stale `onend` callbacks after cancel, jump or rate change (rate can't change mid-utterance, so the current sentence restarts). The keydown listener is attached once and reads the latest handler from a ref; it ignores typing targets and modified keys.

## Stuck detection

`useStuckDetector({ target, contextKey, idleMs, thrashClicks, thrashWindowMs })` watches a region (or the document) and fires `onStuck(reason)` once per `contextKey` when either (a) no scroll/key/pointer activity reaches the target for `idleMs` (default 10 min) while the context — current chunk, PDF page, or step — hasn't changed, or (b) `thrashClicks` (9) non-interactive clicks land within `thrashWindowMs` (4 s). Clicks on buttons, links and inputs are ignored so normal use never counts as thrashing. Changing the context resets the timer and re-arms.

`StuckNudge` is a fixed, dismissible card (framer-motion) — never a blocking modal. Reading variants call `requestExplanation(text, mode)` → `POST /api/explain` with a 9 s timeout and `explainHeuristic` (extractive ranking: lead sentence + highest-scoring sentences, analogy template, or sentence-per-piece) as fallback. The task variant offers "Shrink this step", which runs Magic Breakdown on the step text and `replaceStep`s it in place.

## Tactile completion

`SwipeToComplete` wraps a task row in a `motion.div` with horizontal drag (locked direction, no momentum; negative travel clamped to 0). Release past `max(150px, 55 % of width)` animates to 70 % and calls `celebrate()`: `playCompletionThud` (sub-bass drop 130→38 Hz, noise mallet, C5/G5 confirmation) if sound is on, `CompletionBurst` (ring + 14 deterministic particles, seeded so render is pure) unless reduced motion, then `onComplete` after the animation. The checkbox routes through the same `celebrate()`, so keyboard users get the same payoff. Finishing a step or block in `FocusSession` uses the same `tactile()` wrapper.

## Focus pods

`lib/pods/server.ts` keeps a list of pods `{ id, startedAt, endsAt, members[] }`. `joinPod` puts a member into the fullest open pod (≤ 4 members, ≥ 8 minutes left) or opens a new 25-minute one, so strangers end up sharing the same countdown. `heartbeat` refreshes `lastSeen` and a `focusing | idle` flag; members not seen for 60 s are pruned, and pods are deleted 5 minutes after they end. `podStats()` returns `focusingNow`, `presentNow`, `podsOpen` and `serverNow` so clients can compute remaining time against server time.

The backend is chosen at runtime: Upstash Redis REST if `UPSTASH_REDIS_REST_URL`/`_TOKEN` are set (single JSON document, short TTL), otherwise a `globalThis` map. `FocusPods` polls `GET /api/pods` every 20 s while idle, heartbeats every 12 s while in a pod, and on join calls `startFor(remaining)` if the local timer isn't already running, so the visual disc matches the pod. Leaving the pod never stops a running block — the sprint belongs to the person, not the room.

## Cognitive audio engine

`lib/spotifyApi.ts` implements Authorization Code + PKCE in the browser (`beginSpotifyAuth` → Spotify → `/app/spotify/callback` → `completeSpotifyAuth`). Tokens persist in `localStorage` (`spotify-auth`), refresh automatically when < 60 s remain, and connection state is exposed through `subscribeSpotifyConnection` for `useSyncExternalStore`. Scopes: `user-modify-playback-state user-read-playback-state user-read-currently-playing`.

`shiftAudioGear(mentalLoad, { highEnergyUri, lowStimUri, crossfade })`: `low-load` (boring work) → high-energy playlist; `high-load` (dense work) → low-stimulation playlist. If already playing the target context it does nothing; otherwise it dips `/me/player/volume` in three steps, `PUT /me/player/play` with `context_uri`, and ramps back. Spotify has no crossfade endpoint, so this is the honest approximation. Errors map to actionable hints (Premium needed, no active device, rate limit).

`AudioEngine` polls `/me/player` every 6 s while visible, shows track + artist + art, a play/pause control and a three-way gear (Auto · Brain-dead · Deep work). Auto derives the load from the active task's energy tag (`low` → `low-load`, `high` → `high-load`; `medium`/untagged → no automatic shift). It shifts once per focus block (`blockId:load` key) and again if the effective gear changes mid-block. The component renders a setup hint instead when `NEXT_PUBLIC_SPOTIFY_CLIENT_ID` is missing.

## Focus audio (procedural)

`lib/soundscape.ts` owns one `AudioContext`. Noise kinds loop a generated 6-second buffer through an optional tremolo stage; `lofi` runs `LofiEngine` (`lib/lofi.ts`), a look-ahead scheduler (50 ms timer, 250 ms horizon, 1.6 s when the tab is hidden) that synthesises a chord pad, Rhodes-like plucks, kick/snare/hats with swing, vinyl crackle and a bass bus. `setTension(0..1)` is computed by `tensionFor(remainingMs, durationMs)` — 0 until the last three minutes (or 40 % of a short block), then rising to 1 — and maps to BPM (72→86), filter cutoff, hat density and bass-bus gain. `SoundscapePlayer` quantises tension to 1/40 so the effect runs a few times a minute rather than every tick.

## Rewards

`useRewardStore` + `lib/rewards.ts`. `roll()` flags a transient `rolling` state; after ~1.2 s `reveal()` draws from a weighted table (short break, longer break, movement, dopamine-menu item, rare wander, rare video). The reward and break `endsAt` are persisted so a reload mid-break resumes. Videos embed via `youtube-nocookie.com` with `rel=0`; a "won't play" escape hatch hides that id and swaps in a 3-minute break. `FocusSession` swaps `FocusControls` for `RewardDrop` while a drop or break is active and dismisses it if a block starts from anywhere else.

## Server routes

- `POST /api/breakdown` — returns `{ steps, source }`. Uses an OpenAI-compatible endpoint if `OPENAI_API_KEY` is set; otherwise, or on any error, returns the offline heuristic. The client also falls back locally if the route is unreachable.
- `POST /api/puzzle` — returns `{ before, after, answer, options, kind, source }` for a Kinetic Reading speedbump. Same key, same fallback policy, 5 s timeout.
- `POST /api/explain` — `{ text, mode: summary | analogy | pieces }` → `{ mode, lead, lines, source }`. Same key, same fallback policy.
- `GET/POST /api/pods` — presence (see above). `force-dynamic`; member ids are validated (`^[\w-]{6,40}$`), names trimmed to 24 chars.
- `/api/mcp` — `mcp-handler` + `@modelcontextprotocol/server` v2. Stateless; no sessions or storage. Tool logic lives in `src/mcp/server.ts` and shares `breakdownHeuristic` with the app.

## Chrome extension

`extension/` is independent of the Next app (no build step). `content.js` attaches to `video.html5-main-video`, accumulates active watch time from `timeupdate` deltas (ignoring seeks and > 2.5× jumps), and at the configured interval pauses, adds `.qf-blur` to `#movie_player` and injects a `.qf-overlay` dialog. Enter with ≥ `minChars` characters saves the summary to `chrome.storage.local` and resumes. A `.qf-fab` opens a parking-lot input that writes to the same storage. SPA navigation (`yt-navigate-finish`) resets the counter. The popup lists and clears entries and edits settings.

## Error handling

`app/error.tsx` and `app/not-found.tsx` use gentle copy. Every browser-API feature checks for support (`speechSynthesis`, `AudioContext`, `crypto.randomUUID`, `crypto.subtle`) and degrades quietly. Network-dependent cards (pods, Spotify) show a one-line hint rather than an error state.

## Testing approach

The project is verified with `tsc`, ESLint, `next build`, a headless-Chrome walk-through of every route (CDP), and a JSON-RPC probe of the MCP endpoint. These scripts live outside the repo; the production build must be clean before shipping.
