"use client";

import { Loader2, MonitorPlay, Search } from "lucide-react";
import { useState, type FormEvent } from "react";
import { parseYouTubeId, searchYouTube, YOUTUBE_STATIONS, type YtSearchHit } from "@/lib/youtube";
import { useYouTubeAudioStore } from "@/store/useYouTubeAudioStore";
import { Input } from "@/components/ui/Input";

/** Stations, paste-a-link, and Data API search — all play through YouTubeAudioHost. */
export function YouTubeMusic() {
  const videoId = useYouTubeAudioStore((s) => s.videoId);
  const play = useYouTubeAudioStore((s) => s.play);
  const volume = useYouTubeAudioStore((s) => s.volume);
  const setVolume = useYouTubeAudioStore((s) => s.setVolume);
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<YtSearchHit[]>([]);
  const [busy, setBusy] = useState(false);
  const [hint, setHint] = useState<string | null>(null);

  const onSearch = async (e: FormEvent) => {
    e.preventDefault();
    const pasted = parseYouTubeId(q);
    if (pasted) {
      play(pasted, "YouTube");
      setQ("");
      setHits([]);
      setHint(null);
      return;
    }
    setBusy(true);
    setHint(null);
    const res = await searchYouTube(q);
    setBusy(false);
    if (!res.configured) {
      setHits([]);
      setHint("Paste a YouTube link to play. Add YOUTUBE_API_KEY to search.");
      return;
    }
    if (res.error) setHint(res.error);
    setHits(res.results);
    if (res.configured && !res.results.length && !res.error) setHint("Nothing matched. Try another phrase.");
  };

  return (
    <div className="mt-3 border-t border-border pt-3">
      <div className="mb-2 flex items-center gap-1.5 text-xs font-medium lowercase text-ink-muted">
        <MonitorPlay className="size-3.5" /> YouTube
      </div>
      <div className="mb-2 flex flex-wrap gap-1">
        {YOUTUBE_STATIONS.map((s) => (
          <button
            key={s.id}
            type="button"
            title={s.hint}
            onClick={() => play(s.id, s.label)}
            aria-pressed={videoId === s.id}
            className={`rounded-full border px-2 py-0.5 text-[11px] ${videoId === s.id ? "border-accent bg-accent-soft text-ink" : "border-border text-ink-muted hover:text-ink"}`}
          >
            {s.label}
          </button>
        ))}
      </div>
      <form onSubmit={onSearch} className="flex items-center gap-2">
        <Input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search or paste a link" aria-label="YouTube search" />
        <button type="submit" disabled={busy || !q.trim()} aria-label="Search YouTube" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-soft text-ink disabled:opacity-50">
          {busy ? <Loader2 className="size-4 animate-spin" /> : <Search className="size-4" />}
        </button>
      </form>
      {videoId ? (
        <input
          type="range"
          min={0}
          max={1}
          step={0.05}
          value={volume}
          onChange={(e) => setVolume(Number(e.target.value))}
          aria-label="YouTube volume"
          className="mt-2 h-1.5 w-full accent-accent"
        />
      ) : null}
      {hint ? <p className="mt-1 text-[11px] text-ink-faint">{hint}</p> : null}
      {hits.length > 0 ? (
        <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto">
          {hits.map((h) => (
            <li key={h.id}>
              <button type="button" onClick={() => play(h.id, h.title)} className="flex w-full items-center gap-2 rounded-lg px-1 py-1 text-left hover:bg-surface-sunken">
                {h.thumb ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={h.thumb} alt="" width={48} height={36} className="size-9 shrink-0 rounded object-cover" />
                ) : null}
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-xs text-ink">{h.title}</span>
                  <span className="block truncate text-[10px] text-ink-faint">{h.channel}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
