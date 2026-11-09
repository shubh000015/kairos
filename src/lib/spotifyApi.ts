/**
 * Cognitive Audio Engine — Spotify Web API utilities.
 *
 * Auth is Authorization Code + PKCE, entirely in the browser: no client secret,
 * no server session. Tokens live in localStorage under `spotify-auth`.
 *
 * Playback control (play / pause / volume) requires Spotify Premium and an
 * active device (the Spotify app open somewhere). Errors are surfaced as
 * `SpotifyError` with a human-readable `hint`.
 */

export type MentalLoad = "high-load" | "low-load";

const ACCOUNTS = "https://accounts.spotify.com";
const API = "https://api.spotify.com/v1";
const STORAGE_KEY = "spotify-auth";
const VERIFIER_KEY = "spotify-pkce-verifier";
const STATE_KEY = "spotify-pkce-state";

export const SPOTIFY_SCOPES = ["user-modify-playback-state", "user-read-playback-state", "user-read-currently-playing"];

export interface SpotifyTokens {
  accessToken: string;
  refreshToken: string | null;
  /** Epoch ms. */
  expiresAt: number;
}

export class SpotifyError extends Error {
  status: number;
  hint: string;
  constructor(status: number, message: string, hint: string) {
    super(message);
    this.status = status;
    this.hint = hint;
  }
}

/* ---------- config ---------- */

export function spotifyClientId(): string | null {
  return process.env.NEXT_PUBLIC_SPOTIFY_CLIENT_ID?.trim() || null;
}

export function spotifyRedirectUri(): string {
  if (typeof window === "undefined") return "";
  return `${window.location.origin}/app/spotify/callback`;
}

/* ---------- PKCE ---------- */

function randomString(len: number): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~";
  const bytes = crypto.getRandomValues(new Uint8Array(len));
  return Array.from(bytes, (b) => chars[b % chars.length]).join("");
}

async function sha256Base64Url(input: string): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/** Redirects to Spotify's consent screen. Call from a click handler. */
export async function beginSpotifyAuth(): Promise<void> {
  const clientId = spotifyClientId();
  if (!clientId) throw new SpotifyError(0, "Missing client id", "Set NEXT_PUBLIC_SPOTIFY_CLIENT_ID in .env.local.");
  const verifier = randomString(64);
  const state = randomString(16);
  sessionStorage.setItem(VERIFIER_KEY, verifier);
  sessionStorage.setItem(STATE_KEY, state);
  const params = new URLSearchParams({
    client_id: clientId,
    response_type: "code",
    redirect_uri: spotifyRedirectUri(),
    scope: SPOTIFY_SCOPES.join(" "),
    code_challenge_method: "S256",
    code_challenge: await sha256Base64Url(verifier),
    state,
  });
  // External origin (accounts.spotify.com) — a full navigation is the only option.
  // eslint-disable-next-line @next/next/no-location-assign-relative-destination
  window.location.href = `${ACCOUNTS}/authorize?${params}`;
}

/** Exchanges the `code` on the callback page for tokens. */
export async function completeSpotifyAuth(code: string, state: string | null): Promise<SpotifyTokens> {
  const clientId = spotifyClientId();
  const verifier = sessionStorage.getItem(VERIFIER_KEY);
  const expectedState = sessionStorage.getItem(STATE_KEY);
  sessionStorage.removeItem(VERIFIER_KEY);
  sessionStorage.removeItem(STATE_KEY);
  if (!clientId || !verifier) throw new SpotifyError(0, "Auth session lost", "Start the connection again from the app.");
  if (expectedState && state !== expectedState) throw new SpotifyError(0, "State mismatch", "The sign-in didn't come from this tab. Try again.");

  const res = await fetch(`${ACCOUNTS}/api/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      grant_type: "authorization_code",
      code,
      redirect_uri: spotifyRedirectUri(),
      code_verifier: verifier,
    }),
  });
  if (!res.ok) throw new SpotifyError(res.status, "Token exchange failed", "Check the redirect URI matches your Spotify app settings exactly.");
  const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  const tokens: SpotifyTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  saveTokens(tokens);
  return tokens;
}

/* ---------- token storage ---------- */

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

/** Subscribe to connect/disconnect changes (for useSyncExternalStore). */
export function subscribeSpotifyConnection(cb: () => void): () => void {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) cb();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function loadTokens(): SpotifyTokens | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as SpotifyTokens) : null;
  } catch {
    return null;
  }
}

function saveTokens(t: SpotifyTokens) {
  const wasConnected = isSpotifyConnected();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(t));
  if (!wasConnected) notify();
}

export function disconnectSpotify() {
  localStorage.removeItem(STORAGE_KEY);
  notify();
}

export function isSpotifyConnected(): boolean {
  return loadTokens() !== null;
}

async function refreshTokens(t: SpotifyTokens): Promise<SpotifyTokens> {
  const clientId = spotifyClientId();
  if (!clientId || !t.refreshToken) throw new SpotifyError(401, "Session expired", "Connect Spotify again.");
  const res = await fetch(`${ACCOUNTS}/api/token`, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ client_id: clientId, grant_type: "refresh_token", refresh_token: t.refreshToken }),
  });
  if (!res.ok) {
    disconnectSpotify();
    throw new SpotifyError(res.status, "Session expired", "Connect Spotify again.");
  }
  const data = (await res.json()) as { access_token: string; refresh_token?: string; expires_in: number };
  const next: SpotifyTokens = {
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? t.refreshToken,
    expiresAt: Date.now() + data.expires_in * 1000,
  };
  saveTokens(next);
  return next;
}

/** Valid access token, refreshing if it expires within a minute. */
export async function getAccessToken(): Promise<string> {
  const t = loadTokens();
  if (!t) throw new SpotifyError(401, "Not connected", "Connect Spotify first.");
  if (t.expiresAt - Date.now() < 60_000) return (await refreshTokens(t)).accessToken;
  return t.accessToken;
}

/* ---------- API ---------- */

async function api<T>(path: string, init: RequestInit = {}): Promise<T | null> {
  const token = await getAccessToken();
  const res = await fetch(`${API}${path}`, {
    ...init,
    headers: { authorization: `Bearer ${token}`, "content-type": "application/json", ...(init.headers ?? {}) },
  });
  if (res.status === 204 || res.status === 202) return null;
  if (!res.ok) {
    let reason = "";
    try {
      const j = (await res.json()) as { error?: { message?: string; reason?: string } };
      reason = j.error?.reason ?? j.error?.message ?? "";
    } catch {
      // no body
    }
    throw new SpotifyError(
      res.status,
      reason || res.statusText,
      res.status === 403 && /PREMIUM/i.test(reason)
        ? "Playback control needs Spotify Premium."
        : res.status === 404
          ? "No active device. Open Spotify on your phone or computer and press play once."
          : res.status === 429
            ? "Spotify is rate-limiting; try again in a moment."
            : reason || "Spotify returned an error.",
    );
  }
  const text = await res.text();
  return text ? (JSON.parse(text) as T) : null;
}

export interface PlaybackState {
  is_playing: boolean;
  progress_ms: number;
  context: { uri: string; type: string } | null;
  device: { id: string; name: string; volume_percent: number | null; is_active: boolean } | null;
  item: {
    name: string;
    duration_ms: number;
    artists: Array<{ name: string }>;
    album: { name: string; images: Array<{ url: string; width: number }> };
    external_urls: { spotify: string };
  } | null;
}

export const getPlaybackState = () => api<PlaybackState>("/me/player");

export const play = (contextUri?: string) =>
  api<null>("/me/player/play", { method: "PUT", body: contextUri ? JSON.stringify({ context_uri: contextUri }) : undefined });

export const pause = () => api<null>("/me/player/pause", { method: "PUT" });

export const setVolume = (percent: number) =>
  api<null>(`/me/player/volume?volume_percent=${Math.round(Math.min(100, Math.max(0, percent)))}`, { method: "PUT" });

export const setShuffle = (on: boolean) => api<null>(`/me/player/shuffle?state=${on}`, { method: "PUT" });

/* ---------- the gear shift ---------- */

export interface GearConfig {
  /** Upbeat: video-game OSTs, synthwave, drum & bass — for boring, low-load tasks. */
  highEnergyUri: string;
  /** Low stimulation: ambient, film scores, brown noise — for dense, high-load tasks. */
  lowStimUri: string;
  /** Fade volume out/in around the switch. Needs a device that allows volume control. */
  crossfade?: boolean;
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Match the sound to the mental load of the task, not the mood of the person.
 * low-load (boring) → high-energy playlist. high-load (complex) → low-stimulation playlist.
 * Returns the URI now playing, or null if nothing changed.
 */
export async function shiftAudioGear(mentalLoad: MentalLoad, config: GearConfig): Promise<string | null> {
  const target = mentalLoad === "low-load" ? config.highEnergyUri : config.lowStimUri;
  if (!target) return null;

  const state = await getPlaybackState().catch(() => null);
  if (state?.is_playing && state.context?.uri === target) return null; // already there

  const canFade = config.crossfade !== false && state?.device?.volume_percent != null && state.is_playing;
  const startVol = state?.device?.volume_percent ?? null;

  if (canFade && startVol !== null) {
    // Spotify has no crossfade endpoint; approximate with a quick volume dip.
    for (const f of [0.6, 0.3, 0.1]) {
      await setVolume(startVol * f).catch(() => {});
      await sleep(180);
    }
  }

  await setShuffle(true).catch(() => {});
  await play(target);

  if (canFade && startVol !== null) {
    await sleep(250);
    for (const f of [0.3, 0.6, 1]) {
      await setVolume(startVol * f).catch(() => {});
      await sleep(180);
    }
  }
  return target;
}
