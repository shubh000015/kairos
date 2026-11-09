export const MINUTE_MS = 60_000;
export const HOUR_MS = 60 * MINUTE_MS;
export const DAY_MS = 24 * HOUR_MS;

export function minutesToMs(minutes: number): number {
  return Math.round(minutes * MINUTE_MS);
}

/** "mm:ss" for the big timer readout. */
export function formatClock(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

/** "h:mm:ss" or "m:ss" for video timestamps. */
export function formatTimestamp(seconds: number): string {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  const mm = h > 0 ? m.toString().padStart(2, "0") : m.toString();
  return `${h > 0 ? `${h}:` : ""}${mm}:${sec.toString().padStart(2, "0")}`;
}

/** "1h 20m" / "35m" / "under a minute". */
export function formatDuration(ms: number): string {
  const min = Math.round(ms / MINUTE_MS);
  if (min < 1) return "under a minute";
  const h = Math.floor(min / 60);
  const m = min % 60;
  if (h === 0) return `${m}m`;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

/** Coarse, human phrasing for screen readers — avoids announcing every second. */
export function formatSpoken(ms: number): string {
  const totalSec = Math.max(0, Math.ceil(ms / 1000));
  if (totalSec === 0) return "Time is up";
  if (totalSec < 60) return "Less than a minute remaining";
  const m = Math.round(totalSec / 60);
  return `About ${m} minute${m === 1 ? "" : "s"} remaining`;
}

export function clamp01(n: number): number {
  return Math.min(1, Math.max(0, n));
}

/** Local-date key "YYYY-MM-DD" — the unit for daily tallies and daily resets. */
export function dayKey(d: Date = new Date()): string {
  const y = d.getFullYear();
  const m = (d.getMonth() + 1).toString().padStart(2, "0");
  const day = d.getDate().toString().padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Last `n` day keys, oldest first, ending today. */
export function recentDayKeys(n: number, now: Date = new Date()): string[] {
  const keys: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    keys.push(dayKey(new Date(now.getTime() - i * DAY_MS)));
  }
  return keys;
}

/** Short weekday label for a day key, e.g. "Mon". */
export function weekdayLabel(key: string): string {
  const [y, m, d] = key.split("-").map(Number);
  return new Date(y, m - 1, d).toLocaleDateString(undefined, { weekday: "short" });
}

/** Gentle greeting by hour. */
export function greeting(d: Date = new Date()): string {
  const h = d.getHours();
  if (h < 5) return "Still up";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}
