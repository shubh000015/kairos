"use client";

import { Clock3, ListVideo, Loader2, Maximize2, MessageSquarePlus, Minimize2, MonitorPlay, ParkingSquare, Play, Search, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type FormEvent } from "react";
import { formatTimestamp } from "@/lib/time";
import { loadYouTubeApi, parseYouTubeId, searchYouTube, type YTPlayer, type YtSearchHit } from "@/lib/youtube";
import { useParkingLotStore } from "@/store/useParkingLotStore";
import { useStudyStore } from "@/store/useStudyStore";
import { useTaskStore } from "@/store/useTaskStore";
import { useYouTubeAudioStore } from "@/store/useYouTubeAudioStore";
import { Button, IconButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { EmptyState } from "@/components/ui/Misc";
import { toast } from "@/components/ui/Toast";
import { useStudyStudio } from "./StudyStudio";

const CHUNKS = [5, 10, 15] as const;
const SPEEDS = [0.75, 1, 1.25, 1.5, 1.75, 2] as const;

type FsDoc = Document & { webkitFullscreenElement?: Element | null; webkitExitFullscreen?: () => Promise<void> | void };

function fullscreenElement(): Element | null {
  const doc = document as FsDoc;
  return document.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
}

function subscribeFullscreen(onStoreChange: () => void) {
  document.addEventListener("fullscreenchange", onStoreChange);
  document.addEventListener("webkitfullscreenchange", onStoreChange);
  return () => {
    document.removeEventListener("fullscreenchange", onStoreChange);
    document.removeEventListener("webkitfullscreenchange", onStoreChange);
  };
}

function lectureStageIsFullscreen() {
  const el = fullscreenElement();
  return Boolean(el && el.hasAttribute("data-lecture-stage"));
}

/**
 * Lecture mode: a long video becomes a series of short chunks. At each chunk
 * boundary the player pauses and asks for one line — active recall, not passive watching.
 */
export function VideoStudy() {
  const videos = useStudyStore((s) => s.videos);
  const upsertVideo = useStudyStore((s) => s.upsertVideo);
  const setVideoPosition = useStudyStore((s) => s.setVideoPosition);
  const addVideoNote = useStudyStore((s) => s.addVideoNote);
  const removeVideoNote = useStudyStore((s) => s.removeVideoNote);
  const removeVideo = useStudyStore((s) => s.removeVideo);
  const addTask = useTaskStore((s) => s.add);

  const [url, setUrl] = useState("");
  const [videoId, setVideoId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ready, setReady] = useState(false);
  const [position, setPosition] = useState(0);
  const [duration, setDuration] = useState(0);
  const [speed, setSpeed] = useState<number>(1);
  const [chunkPrompt, setChunkPrompt] = useState<number | null>(null); // chunk index just finished
  const [note, setNote] = useState("");
  const [hits, setHits] = useState<YtSearchHit[]>([]);
  const [searching, setSearching] = useState(false);

  const playerRef = useRef<YTPlayer | null>(null);
  const mountRef = useRef<HTMLDivElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const lastChunkRef = useRef(-1);
  const swappingFs = useRef(false);
  const parkThought = useParkingLotStore((s) => s.park);
  const [parkText, setParkText] = useState("");
  const studio = useStudyStudio();
  const lectureFs = useSyncExternalStore(subscribeFullscreen, lectureStageIsFullscreen, () => false);
  const inStudioFs = Boolean(studio?.fullscreen);
  const showHud = lectureFs || inStudioFs;

  const session = videoId ? videos[videoId] : undefined;
  const chunkMin = session?.chunkMin ?? 10;
  const chunkSec = chunkMin * 60;
  const chunkIndex = Math.floor(position / chunkSec);
  const totalChunks = duration > 0 ? Math.ceil(duration / chunkSec) : 0;
  const chunkProgress = ((position % chunkSec) / chunkSec) * 100;

  const open = useCallback(
    (id: string, sourceUrl: string) => {
      setError(null);
      setVideoId(id);
      setReady(false);
      lastChunkRef.current = -1;
      useYouTubeAudioStore.getState().pause();
      upsertVideo({ videoId: id, url: sourceUrl });
    },
    [upsertVideo],
  );

  const submitUrl = (e: FormEvent) => {
    e.preventDefault();
    const id = parseYouTubeId(url);
    if (id) {
      open(id, url.trim());
      setUrl("");
      setHits([]);
      return;
    }
    if (url.trim().length < 2) {
      setError("Paste a YouTube link, or type a search.");
      return;
    }
    setError(null);
    setSearching(true);
    void searchYouTube(url).then((res) => {
      setSearching(false);
      if (res.results.length) {
        setHits(res.results);
        return;
      }
      setHits([]);
      setError(
        res.configured
          ? (res.error ?? "No videos found. Paste a full YouTube link.")
          : "Paste a full YouTube link, or add YOUTUBE_API_KEY to search.",
      );
    });
  };

  // Create / replace the player when the video changes.
  useEffect(() => {
    if (!videoId || !mountRef.current) return;
    let cancelled = false;
    const mount = mountRef.current;
    mount.innerHTML = "";
    const holder = document.createElement("div");
    mount.appendChild(holder);

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled) return;
        const startAt = useStudyStore.getState().videos[videoId]?.lastPositionSec ?? 0;
        playerRef.current = new YT.Player(holder, {
          videoId,
          host: "https://www.youtube-nocookie.com",
          playerVars: { rel: 0, modestbranding: 1, fs: 0, start: Math.max(0, startAt - 3), playsinline: 1 },
          events: {
            onReady: (e) => {
              if (cancelled) return;
              setReady(true);
              setDuration(e.target.getDuration());
              const title = e.target.getVideoData?.()?.title;
              if (title) upsertVideo({ videoId, url: useStudyStore.getState().videos[videoId]?.url ?? "", title });
              e.target.setPlaybackRate(speed);
            },
          },
        });
      })
      .catch((err: Error) => !cancelled && setError(err.message));

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        // player already gone
      }
      playerRef.current = null;
    };
    // speed is applied on ready only; later changes go through the handler below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoId, upsertVideo]);

  // Poll position; persist every ~5s; pause at chunk boundaries.
  useEffect(() => {
    if (!ready || !videoId) return;
    let ticks = 0;
    const id = window.setInterval(() => {
      const p = playerRef.current;
      if (!p) return;
      const t = p.getCurrentTime();
      setPosition(t);
      if (duration === 0) setDuration(p.getDuration());
      if (++ticks % 5 === 0) setVideoPosition(videoId, t);

      const idx = Math.floor(t / chunkSec);
      if (lastChunkRef.current === -1) lastChunkRef.current = idx;
      if (idx > lastChunkRef.current && p.getPlayerState() === window.YT?.PlayerState.PLAYING) {
        p.pauseVideo();
        setChunkPrompt(lastChunkRef.current);
        lastChunkRef.current = idx;
      }
    }, 1000);
    return () => window.clearInterval(id);
  }, [ready, videoId, chunkSec, duration, setVideoPosition]);

  const changeSpeed = (r: number) => {
    setSpeed(r);
    playerRef.current?.setPlaybackRate(r);
  };

  const seek = (sec: number) => {
    playerRef.current?.seekTo(sec, true);
    setPosition(sec);
  };

  const saveNote = (e: FormEvent) => {
    e.preventDefault();
    if (!videoId || !note.trim()) return;
    const at = chunkPrompt !== null ? Math.min(position, (chunkPrompt + 1) * chunkSec) : position;
    addVideoNote(videoId, note, at);
    setNote("");
    toast("Noted at " + formatTimestamp(at));
    if (chunkPrompt !== null) continueAfterChunk();
  };

  const continueAfterChunk = () => {
    setChunkPrompt(null);
    playerRef.current?.playVideo();
  };

  const makeTask = () => {
    if (!session) return;
    addTask(`Watch: ${session.title || "lecture"}`, { source: "study", link: session.url, energy: "medium" });
    toast("Added to Tasks with the link.");
  };

  const recents = Object.values(videos).sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 6);

  // If YouTube still takes native iframe fullscreen, bounce it onto our stage
  // so chunk prompts, notes and parking stay visible.
  useEffect(() => {
    const onChange = () => {
      const stage = stageRef.current;
      const el = fullscreenElement();
      if (!stage || !el || el === stage || swappingFs.current) return;
      if (!stage.contains(el)) return;
      swappingFs.current = true;
      const exit = document.exitFullscreen?.bind(document) ?? (document as FsDoc).webkitExitFullscreen?.bind(document);
      Promise.resolve(exit?.())
        .catch(() => undefined)
        .then(() => {
          const req = stage.requestFullscreen?.bind(stage) ?? (stage as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen?.bind(stage);
          return req?.();
        })
        .catch(() => undefined)
        .finally(() => {
          swappingFs.current = false;
        });
    };
    document.addEventListener("fullscreenchange", onChange);
    document.addEventListener("webkitfullscreenchange", onChange);
    return () => {
      document.removeEventListener("fullscreenchange", onChange);
      document.removeEventListener("webkitfullscreenchange", onChange);
    };
  }, []);

  const toggleLectureFullscreen = () => {
    if (studio) {
      studio.toggle();
      return;
    }
    const stage = stageRef.current;
    if (!stage) return;
    if (lectureFs) {
      const exit = document.exitFullscreen?.bind(document) ?? (document as FsDoc).webkitExitFullscreen?.bind(document);
      void Promise.resolve(exit?.()).catch(() => undefined);
      return;
    }
    const req = stage.requestFullscreen?.bind(stage) ?? (stage as HTMLElement & { webkitRequestFullscreen?: () => void }).webkitRequestFullscreen?.bind(stage);
    void Promise.resolve(req?.()).catch(() => undefined);
  };

  const savePark = (e: FormEvent) => {
    e.preventDefault();
    if (!parkText.trim()) return;
    parkThought(parkText);
    setParkText("");
    toast("Parked. It'll be there later.");
  };

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={submitUrl} className="flex flex-col gap-2 sm:flex-row">
        <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="Paste a YouTube link, or search" aria-label="YouTube URL or search" />
        <Button type="submit" variant="primary" disabled={!url.trim() || searching}>
          {searching ? <Loader2 className="size-4 animate-spin" /> : parseYouTubeId(url) ? <MonitorPlay className="size-4" /> : <Search className="size-4" />}
          {parseYouTubeId(url) ? "Open in lecture mode" : "Search YouTube"}
        </Button>
      </form>
      {error ? <p className="text-sm text-urgent">{error}</p> : null}
      {hits.length > 0 ? (
        <ul className="grid gap-2 sm:grid-cols-2">
          {hits.map((h) => (
            <li key={h.id}>
              <button
                type="button"
                onClick={() => {
                  open(h.id, `https://www.youtube.com/watch?v=${h.id}`);
                  setHits([]);
                  setUrl("");
                }}
                className="flex w-full items-center gap-3 rounded-xl border border-border bg-surface-raised p-2 text-left hover:border-ink-faint"
              >
                {h.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={h.thumb} alt="" width={96} height={54} className="h-12 w-[5.4rem] shrink-0 rounded-md object-cover" />
                ) : null}
                <span className="min-w-0">
                  <span className="block truncate text-sm text-ink">{h.title}</span>
                  <span className="block truncate text-xs text-ink-faint">{h.channel}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}

      {videoId ? (
        <div className="grid gap-5 lg:grid-cols-[1fr_20rem]">
          <div className="flex flex-col gap-3">
            <div
              ref={stageRef}
              data-lecture-stage
              className="lecture-stage overflow-hidden rounded-2xl border border-border bg-ink shadow-soft"
            >
              <div className="lecture-player relative aspect-video">
                <div ref={mountRef} className="absolute inset-0 [&_iframe]:h-full [&_iframe]:w-full" />
                {chunkPrompt !== null ? (
                  <div className="absolute inset-0 z-30 flex items-center justify-center bg-surface/95 p-6 backdrop-blur-sm">
                    <form onSubmit={saveNote} className="rise-in w-full max-w-md rounded-2xl border border-border bg-surface-raised p-5 shadow-soft">
                      <p className="text-lg text-ink">Chunk {chunkPrompt + 1} done.</p>
                      <p className="mb-3 text-sm text-ink-muted">One line: what was that about? Anything. Then carry on.</p>
                      <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder="It covered…" autoFocus aria-label="Chunk summary" />
                      <div className="mt-3 flex justify-end gap-2">
                        <Button variant="ghost" size="sm" onClick={continueAfterChunk}>
                          Skip
                        </Button>
                        <Button type="submit" variant="primary" size="sm" disabled={!note.trim()}>
                          Save &amp; continue
                        </Button>
                      </div>
                    </form>
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={toggleLectureFullscreen}
                  className="absolute right-3 top-3 z-20 inline-flex size-9 items-center justify-center rounded-lg bg-surface-raised/90 text-ink shadow-soft backdrop-blur hover:bg-surface-raised"
                  aria-label={showHud ? "Exit lecture fullscreen" : "Lecture fullscreen"}
                  title={showHud ? "Exit fullscreen" : "Fullscreen with notes, parking lot and music"}
                >
                  {showHud ? <Minimize2 className="size-4" /> : <Maximize2 className="size-4" />}
                </button>
                <div className={`lecture-hud absolute inset-x-0 bottom-0 z-20 flex flex-col gap-2 bg-gradient-to-t from-ink/90 via-ink/70 to-transparent p-3 pt-8 ${showHud ? "lecture-hud-on" : ""}`}>
                  <div className="h-1.5 overflow-hidden rounded-full bg-white/15" role="progressbar" aria-valuenow={Math.round(chunkProgress)} aria-valuemin={0} aria-valuemax={100} aria-label="Current chunk progress">
                    <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${chunkProgress}%` }} />
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <form onSubmit={savePark} className="flex min-w-[12rem] flex-1 items-center gap-2 rounded-xl border border-white/15 bg-surface-raised/95 px-2 py-1">
                      <ParkingSquare className="size-4 shrink-0 text-mist-500" aria-hidden="true" />
                      <input
                        value={parkText}
                        onChange={(e) => setParkText(e.target.value)}
                        placeholder="Park a thought…"
                        aria-label="Park a distracting thought"
                        className="min-w-0 flex-1 bg-transparent py-1 text-sm text-ink outline-none placeholder:text-ink-faint"
                      />
                    </form>
                    <form onSubmit={saveNote} className="flex min-w-[12rem] flex-1 items-center gap-2 rounded-xl border border-white/15 bg-surface-raised/95 px-2 py-1">
                      <input
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder={`Note at ${formatTimestamp(position)}`}
                        aria-label="Timestamped note"
                        className="min-w-0 flex-1 bg-transparent py-1 text-sm text-ink outline-none placeholder:text-ink-faint"
                      />
                      <button type="submit" className="rounded-lg px-2 py-1 text-xs font-medium text-ink-muted hover:text-ink" disabled={!note.trim()}>
                        Save
                      </button>
                    </form>
                    <span className="shrink-0 font-mono text-xs tabular-nums text-[#EBE9E1]">
                      {formatTimestamp(position)}
                      {duration ? ` / ${formatTimestamp(duration)}` : ""}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Chunk progress: the only progress bar, and it's for this 10 minutes, not the whole 2 hours. */}
            <div>
              <div className="mb-1 flex items-center justify-between text-xs text-ink-faint">
                <span>
                  Chunk {Math.min(chunkIndex + 1, Math.max(totalChunks, 1))}
                  {totalChunks ? ` of ${totalChunks}` : ""} · {chunkMin} min each
                </span>
                <span className="tabular-nums">
                  {formatTimestamp(position)}
                  {duration ? ` / ${formatTimestamp(duration)}` : ""}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-surface-sunken" role="progressbar" aria-valuenow={Math.round(chunkProgress)} aria-valuemin={0} aria-valuemax={100} aria-label="Current chunk progress">
                <div className="h-full bg-accent transition-[width] duration-500" style={{ width: `${chunkProgress}%` }} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3 text-sm">
              <span className="inline-flex items-center gap-1 text-ink-faint">
                <Clock3 className="size-4" /> Chunk
              </span>
              <div role="radiogroup" aria-label="Chunk length" className="inline-flex rounded-lg border border-border bg-surface-sunken p-0.5">
                {CHUNKS.map((c) => (
                  <button key={c} type="button" role="radio" aria-checked={chunkMin === c} onClick={() => upsertVideo({ videoId, url: session?.url ?? "", chunkMin: c })} className={`rounded-md px-2.5 py-1 text-xs font-medium ${chunkMin === c ? "bg-surface-raised text-ink shadow-soft" : "text-ink-muted hover:text-ink"}`}>
                    {c}m
                  </button>
                ))}
              </div>
              <span className="text-ink-faint">Speed</span>
              <div role="radiogroup" aria-label="Playback speed" className="inline-flex rounded-lg border border-border bg-surface-sunken p-0.5">
                {SPEEDS.map((r) => (
                  <button key={r} type="button" role="radio" aria-checked={speed === r} onClick={() => changeSpeed(r)} className={`rounded-md px-2 py-1 text-xs font-medium tabular-nums ${speed === r ? "bg-surface-raised text-ink shadow-soft" : "text-ink-muted hover:text-ink"}`}>
                    {r}×
                  </button>
                ))}
              </div>
              <Button variant="ghost" size="sm" className="ml-auto" onClick={makeTask}>
                + Add as task
              </Button>
            </div>
          </div>

          <aside className="flex flex-col gap-3">
            <form onSubmit={saveNote} className="flex items-center gap-2">
              <Input value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Note at ${formatTimestamp(position)}`} aria-label="Timestamped note" />
              <IconButton label="Save note" type="submit" className="shrink-0 bg-accent-soft text-ink">
                <MessageSquarePlus className="size-4" />
              </IconButton>
            </form>
            {session && session.notes.length > 0 ? (
              <ul className="flex max-h-[28rem] flex-col gap-1.5 overflow-y-auto pr-1">
                {session.notes.map((n) => (
                  <li key={n.id} className="group flex items-start gap-2 rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm">
                    <button type="button" onClick={() => seek(n.at)} className="shrink-0 font-mono text-xs text-mist-600 hover:underline dark:text-mist-300">
                      {formatTimestamp(n.at)}
                    </button>
                    <span className="flex-1 text-ink">{n.text}</span>
                    <button type="button" onClick={() => removeVideoNote(videoId, n.id)} aria-label="Delete note" className="text-ink-faint opacity-0 group-hover:opacity-100 focus:opacity-100">
                      <Trash2 className="size-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="rounded-xl border border-dashed border-border px-3 py-4 text-center text-sm text-ink-faint">
                Notes you add land here, pinned to the timestamp. Click one to jump back.
              </p>
            )}
          </aside>
        </div>
      ) : (
        <EmptyState
          icon={<ListVideo className="size-8" />}
          title="Long lectures, short chunks."
          body="Paste a link above. The video pauses every few minutes and asks for one line — that's the whole trick to actually remembering it."
        />
      )}

      {recents.length > 0 ? (
        <section>
          <h3 className="mb-2 text-sm font-medium text-ink-muted">Recent</h3>
          <ul className="grid gap-2 sm:grid-cols-2">
            {recents.map((v) => (
              <li key={v.videoId} className="group flex items-center gap-3 rounded-xl border border-border bg-surface-raised px-3 py-2 text-sm">
                <button type="button" onClick={() => open(v.videoId, v.url)} className="flex min-w-0 flex-1 items-center gap-2 text-left">
                  <Play className="size-4 shrink-0 text-ink-faint" />
                  <span className="truncate text-ink">{v.title || v.url}</span>
                  <span className="ml-auto shrink-0 font-mono text-xs text-ink-faint">{formatTimestamp(v.lastPositionSec)}</span>
                </button>
                <button type="button" onClick={() => removeVideo(v.videoId)} aria-label="Forget this video" className="text-ink-faint opacity-0 group-hover:opacity-100 focus:opacity-100">
                  <Trash2 className="size-3.5" />
                </button>
              </li>
            ))}
          </ul>
        </section>
      ) : null}
    </div>
  );
}
