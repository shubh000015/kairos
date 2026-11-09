"use client";

import { Brain, Gauge, Headphones, Loader2, Music2, Pause, Play, Unplug } from "lucide-react";
import { useCallback, useEffect, useState, useSyncExternalStore } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import {
  beginSpotifyAuth,
  disconnectSpotify,
  getPlaybackState,
  isSpotifyConnected,
  pause as spotifyPause,
  play as spotifyPlay,
  shiftAudioGear,
  spotifyClientId,
  SpotifyError,
  subscribeSpotifyConnection,
  type MentalLoad,
  type PlaybackState,
} from "@/lib/spotifyApi";
import { useAudioEngineStore, type GearMode } from "@/store/useAudioEngineStore";
import { selectActiveTask, useTaskStore } from "@/store/useTaskStore";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { toast } from "@/components/ui/Toast";

const POLL_MS = 6000;

/**
 * Cognitive Audio Engine. Matches Spotify playback to the *mental load* of the
 * current task: boring work gets energy, dense work gets stillness. Auto mode
 * reads the active task's energy tag; the toggle overrides it any time.
 */
export function AudioEngine({ variant = "card" }: { variant?: "card" | "dock" }) {
  const hydrated = useHydrated();
  const clientId = spotifyClientId();
  const enabled = useAudioEngineStore((s) => s.enabled);
  const mode = useAudioEngineStore((s) => s.mode);
  const highEnergyUri = useAudioEngineStore((s) => s.highEnergyUri);
  const lowStimUri = useAudioEngineStore((s) => s.lowStimUri);
  const crossfade = useAudioEngineStore((s) => s.crossfade);
  const set = useAudioEngineStore((s) => s.set);

  const activeTask = useTaskStore(selectActiveTask);

  const connected = useSyncExternalStore(subscribeSpotifyConnection, isSpotifyConnected, () => false);
  const [state, setState] = useState<PlaybackState | null>(null);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  // Auto gear: low-energy (boring) task → low-load → high energy music; needs-focus → high-load → low stim.
  const autoLoad: MentalLoad | null = activeTask?.energy === "low" ? "low-load" : activeTask?.energy === "high" ? "high-load" : null;
  const effective: MentalLoad | null = mode === "auto" ? autoLoad : mode;

  const refresh = useCallback(async () => {
    if (!isSpotifyConnected()) return;
    try {
      setState(await getPlaybackState());
      setHint(null);
    } catch (e) {
      if (e instanceof SpotifyError && e.status === 401) setHint(e.hint);
    }
  }, []);

  // Poll the current track while the tab is visible.
  useEffect(() => {
    if (!connected || !enabled) return;
    const first = window.setTimeout(() => void refresh(), 0);
    const id = window.setInterval(() => {
      if (document.visibilityState === "visible") void refresh();
    }, POLL_MS);
    return () => {
      window.clearTimeout(first);
      window.clearInterval(id);
    };
  }, [connected, enabled, refresh]);

  const shift = useCallback(
    async (load: MentalLoad, announce = true) => {
      setBusy(true);
      try {
        const uri = await shiftAudioGear(load, { highEnergyUri, lowStimUri, crossfade });
        if (uri && announce) toast(load === "low-load" ? "Shifted up: energy for the boring bit." : "Shifted down: low stimulation for the dense bit.");
        setHint(null);
        window.setTimeout(() => void refresh(), 900);
      } catch (e) {
        setHint(e instanceof SpotifyError ? e.hint : "Couldn't reach Spotify.");
      } finally {
        setBusy(false);
      }
    },
    [highEnergyUri, lowStimUri, crossfade, refresh],
  );

  if (!hydrated || !enabled) return null;

  if (!clientId) {
    if (variant === "dock") return null;
    return (
      <Card>
        <CardHeader icon={<Headphones className="size-5" />} title="Cognitive audio" description="Spotify that shifts with the task — energy for boring work, stillness for dense work." />
        <CardBody className="pt-2 text-xs text-ink-faint">
          Add <code className="rounded bg-surface-sunken px-1 py-0.5 font-mono">NEXT_PUBLIC_SPOTIFY_CLIENT_ID</code> to <code className="font-mono">.env.local</code> to enable. Setup steps are in the README under “Spotify Cognitive Audio Engine”.
        </CardBody>
      </Card>
    );
  }

  const isLocalhost = window.location.hostname === "localhost";
  const track = state?.item;
  const art = track?.album.images.slice().sort((a, b) => a.width - b.width)[0]?.url;
  const dock = variant === "dock";

  const body = (
    <>
        {!connected ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" size="sm" onClick={() => void beginSpotifyAuth().catch((e: unknown) => setHint(e instanceof SpotifyError ? e.hint : "Couldn't start sign-in."))}>
              <Music2 className="size-4" /> Connect Spotify
            </Button>
            {dock ? null : <span className="text-xs text-ink-faint">Premium needed for playback control. Nothing is stored server-side.</span>}
            {isLocalhost && !dock ? (
              <span className="basis-full text-xs text-urgent">
                Spotify rejects <code className="font-mono">localhost</code> redirects — open this app at <code className="font-mono">{`http://127.0.0.1:${window.location.port || "3000"}`}</code> to connect while developing.
              </span>
            ) : null}
          </div>
        ) : (
          <>
            <div className={`flex items-center gap-3 ${dock ? "" : "rounded-xl border border-border bg-surface px-3 py-2"}`}>
              {art ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={art} alt="" width={40} height={40} className="size-10 rounded-md object-cover" />
              ) : (
                <span className="inline-flex size-10 items-center justify-center rounded-md bg-surface-sunken text-ink-faint">
                  <Music2 className="size-4" />
                </span>
              )}
              <div className="min-w-0 flex-1">
                {track ? (
                  <>
                    <div className="truncate text-sm text-ink">{track.name}</div>
                    <div className="truncate text-xs text-ink-muted">{track.artists.map((a) => a.name).join(", ")}</div>
                  </>
                ) : (
                  <div className="text-sm text-ink-muted">Nothing playing</div>
                )}
              </div>
              <button
                type="button"
                aria-label={state?.is_playing ? "Pause" : "Play"}
                disabled={busy}
                onClick={() => void (state?.is_playing ? spotifyPause() : spotifyPlay()).then(() => window.setTimeout(() => void refresh(), 500)).catch((e: unknown) => setHint(e instanceof SpotifyError ? e.hint : "Couldn't reach Spotify."))}
                className="text-ink-muted hover:text-ink disabled:opacity-50"
              >
                {busy ? <Loader2 className="size-4 animate-spin" /> : state?.is_playing ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-ink-faint">
                <Gauge className="size-3.5" /> Gear
              </span>
              <div role="radiogroup" aria-label="Audio gear" className="inline-flex rounded-lg border border-border bg-surface-sunken p-0.5">
                {(
                  [
                    { v: "auto", label: "Auto" },
                    { v: "low-load", label: "Brain-dead" },
                    { v: "high-load", label: "Deep work" },
                  ] as Array<{ v: GearMode; label: string }>
                ).map((o) => (
                  <button
                    key={o.v}
                    type="button"
                    role="radio"
                    aria-checked={mode === o.v}
                    title={o.v === "auto" ? "Follow the active task's energy tag" : o.v === "low-load" ? "Boring task → upbeat music" : "Dense task → low stimulation"}
                    onClick={() => {
                      set("mode", o.v);
                      const load: MentalLoad | null = o.v === "auto" ? autoLoad : o.v;
                      if (load) void shift(load);
                    }}
                    className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${mode === o.v ? "bg-surface-raised text-ink shadow-soft" : "text-ink-muted hover:text-ink"}`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
              {dock ? null : (
                <span className="inline-flex items-center gap-1 text-xs text-ink-faint">
                  <Brain className="size-3.5" />
                  {effective === "low-load" ? "high energy" : effective === "high-load" ? "low stimulation" : mode === "auto" ? "tag the task's energy to auto-shift" : ""}
                </span>
              )}
            </div>
          </>
        )}
        {hint ? <p className="text-xs text-urgent">{hint}</p> : null}
    </>
  );

  if (dock) {
    return <div className="flex min-w-0 flex-col gap-2">{body}</div>;
  }

  return (
    <Card>
      <CardHeader
        icon={<Headphones className="size-5" />}
        title="Cognitive audio"
        description={connected ? "Spotify shifts gear with the task." : "Spotify that shifts with the task."}
        action={
          connected ? (
            <button
              type="button"
              onClick={() => {
                disconnectSpotify();
                setState(null);
              }}
              className="inline-flex items-center gap-1 text-xs text-ink-faint hover:text-ink"
            >
              <Unplug className="size-3.5" /> disconnect
            </button>
          ) : null
        }
      />
      <CardBody className="flex flex-col gap-3 pt-3">
        {body}
      </CardBody>
    </Card>
  );
}
