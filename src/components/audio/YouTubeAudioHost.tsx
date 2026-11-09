"use client";

import { Pause, Play, X } from "lucide-react";
import { useEffect, useRef } from "react";
import { loadYouTubeApi, type YTPlayer } from "@/lib/youtube";
import { useYouTubeAudioStore } from "@/store/useYouTubeAudioStore";

/**
 * Persistent YouTube IFrame player. Lives in the app shell so closing the music
 * popover does not stop the track. Kept visibly small (YouTube's rules).
 */
export function YouTubeAudioHost() {
  const videoId = useYouTubeAudioStore((s) => s.videoId);
  const title = useYouTubeAudioStore((s) => s.title);
  const playing = useYouTubeAudioStore((s) => s.playing);
  const volume = useYouTubeAudioStore((s) => s.volume);
  const pause = useYouTubeAudioStore((s) => s.pause);
  const resume = useYouTubeAudioStore((s) => s.resume);
  const stop = useYouTubeAudioStore((s) => s.stop);
  const mountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const videoIdRef = useRef(videoId);

  useEffect(() => {
    videoIdRef.current = videoId;
  }, [videoId]);

  useEffect(() => {
    if (!videoId || !mountRef.current) {
      try {
        playerRef.current?.destroy();
      } catch {
        // already gone
      }
      playerRef.current = null;
      return;
    }

    const existing = playerRef.current;
    if (existing?.loadVideoById) {
      existing.loadVideoById(videoId);
      return;
    }

    const mount = mountRef.current;
    mount.innerHTML = "";
    const holder = document.createElement("div");
    mount.appendChild(holder);
    let cancelled = false;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !videoIdRef.current) return;
        try {
          playerRef.current?.destroy();
        } catch {
          // none yet
        }
        playerRef.current = new YT.Player(holder, {
          videoId: videoIdRef.current,
          host: "https://www.youtube-nocookie.com",
          playerVars: { rel: 0, modestbranding: 1, playsinline: 1, disablekb: 1 },
          events: {
            onReady: (e) => {
              e.target.setVolume?.(Math.round(useYouTubeAudioStore.getState().volume * 100));
              if (useYouTubeAudioStore.getState().playing) e.target.playVideo();
              else e.target.pauseVideo();
              const t = e.target.getVideoData?.()?.title;
              if (t) useYouTubeAudioStore.setState({ title: t });
            },
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.ENDED) useYouTubeAudioStore.getState().pause();
              if (e.data === YT.PlayerState.PLAYING) useYouTubeAudioStore.setState({ playing: true });
              if (e.data === YT.PlayerState.PAUSED) useYouTubeAudioStore.setState({ playing: false });
            },
          },
        });
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, [videoId]);

  useEffect(() => {
    const p = playerRef.current;
    if (!p) return;
    if (playing) p.playVideo();
    else p.pauseVideo();
  }, [playing]);

  useEffect(() => {
    playerRef.current?.setVolume?.(Math.round(volume * 100));
  }, [volume]);

  useEffect(
    () => () => {
      try {
        playerRef.current?.destroy();
      } catch {
        // already gone
      }
    },
    [],
  );

  if (!videoId) return null;

  return (
    <div className="pointer-events-auto fixed bottom-24 right-4 z-40 w-[16.5rem] overflow-hidden rounded-xl border border-border bg-surface-raised shadow-soft md:bottom-8">
      <div className="flex items-center gap-1 border-b border-border px-2 py-1">
        <span className="min-w-0 flex-1 truncate text-[11px] text-ink-muted">{title || "YouTube"}</span>
        <button type="button" aria-label={playing ? "Pause YouTube" : "Play YouTube"} onClick={() => (playing ? pause() : resume())} className="text-ink-faint hover:text-ink">
          {playing ? <Pause className="size-3.5" /> : <Play className="size-3.5" />}
        </button>
        <button type="button" aria-label="Stop YouTube" onClick={stop} className="text-ink-faint hover:text-ink">
          <X className="size-3.5" />
        </button>
      </div>
      <div ref={mountRef} className="aspect-video bg-ink [&_iframe]:h-full [&_iframe]:w-full" />
    </div>
  );
}
