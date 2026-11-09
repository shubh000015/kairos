/** Extracts an 11-char YouTube video id from the common URL shapes, or null. */
export function parseYouTubeId(input: string): string | null {
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const url = new URL(s);
    const host = url.hostname.replace(/^www\.|^m\./, "");
    if (host === "youtu.be") return url.pathname.slice(1, 12) || null;
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      const v = url.searchParams.get("v");
      if (v && /^[\w-]{11}$/.test(v)) return v;
      const m = url.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/);
      if (m) return m[1];
    }
  } catch {
    // not a URL
  }
  return null;
}

/* Minimal typings for the IFrame Player API — only what we call. */
export interface YTPlayer {
  playVideo(): void;
  pauseVideo(): void;
  seekTo(seconds: number, allowSeekAhead: boolean): void;
  getCurrentTime(): number;
  getDuration(): number;
  getPlayerState(): number;
  setPlaybackRate(rate: number): void;
  getPlaybackRate(): number;
  setVolume?(n: number): void;
  loadVideoById?(id: string | { videoId: string; startSeconds?: number }): void;
  cueVideoById?(id: string | { videoId: string; startSeconds?: number }): void;
  getVideoData?: () => { title?: string };
  destroy(): void;
}

export type YtSearchHit = {
  id: string;
  title: string;
  channel: string;
  thumb: string;
};

/** Curated study radios. Played via the IFrame API; search uses Data API when a key is set. */
export const YOUTUBE_STATIONS: Array<{ id: string; label: string; hint: string }> = [
  { id: "jfKfPfyJRdk", label: "Lofi", hint: "Beats to read to" },
  { id: "4xDzrJKXOOY", label: "Synthwave", hint: "Night drive" },
  { id: "Dx5qFachd3A", label: "Jazz cafe", hint: "Soft instruments" },
  { id: "4Tr0otuiQuU", label: "Piano", hint: "Quiet classical" },
  { id: "mPZkdNFkNPo", label: "Rain film", hint: "Long rain video" },
];

export async function searchYouTube(q: string): Promise<{ configured: boolean; results: YtSearchHit[]; error?: string }> {
  const query = q.trim().slice(0, 80);
  if (query.length < 2) return { configured: true, results: [] };
  try {
    const res = await fetch(`/api/youtube/search?q=${encodeURIComponent(query)}`);
    const data = (await res.json()) as { configured?: boolean; results?: YtSearchHit[]; error?: string };
    return {
      configured: data.configured !== false,
      results: Array.isArray(data.results) ? data.results : [],
      error: typeof data.error === "string" ? data.error : undefined,
    };
  } catch {
    return { configured: false, results: [], error: "Couldn't reach YouTube search." };
  }
}

interface YTNamespace {
  Player: new (
    el: HTMLElement | string,
    opts: {
      videoId: string;
      host?: string;
      playerVars?: Record<string, string | number>;
      events?: {
        onReady?: (e: { target: YTPlayer }) => void;
        onStateChange?: (e: { data: number; target: YTPlayer }) => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { PLAYING: number; PAUSED: number; ENDED: number };
}

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let apiPromise: Promise<YTNamespace> | null = null;

/** Loads the IFrame API once and resolves with the global `YT` namespace. */
export function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") return Promise.reject(new Error("no window"));
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (apiPromise) return apiPromise;

  apiPromise = new Promise((resolve, reject) => {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      prev?.();
      if (window.YT) resolve(window.YT);
      else reject(new Error("YT missing"));
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    tag.async = true;
    tag.onerror = () => reject(new Error("Could not load the YouTube player. Check your connection."));
    document.head.appendChild(tag);
  });
  return apiPromise;
}
