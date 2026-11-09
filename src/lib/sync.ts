import { getDb } from "./db";

/**
 * Optional background sync. Off unless NEXT_PUBLIC_SYNC_URL is set.
 *
 * The device is the source of truth. When online, dirty stores in the outbox are
 * POSTed as one batch: { deviceId, stores: { [key]: { value, updatedAt } } }.
 * Any endpoint works (a Supabase Edge Function, a Firebase Function, your own API);
 * a 2xx response clears the rows that were sent. Failures just wait for the next try.
 */

const SYNC_URL = process.env.NEXT_PUBLIC_SYNC_URL?.trim() || null;
const SYNC_KEY = process.env.NEXT_PUBLIC_SYNC_KEY?.trim() || null;
const DEVICE_KEY = "qf-device-id";
const INTERVAL_MS = 60_000;
const DEBOUNCE_MS = 4_000;

export type SyncStatus = "off" | "idle" | "pending" | "syncing" | "offline" | "error";

let status: SyncStatus = SYNC_URL ? "idle" : "off";
let lastSyncedAt: number | null = null;
const listeners = new Set<() => void>();
let debounce: ReturnType<typeof setTimeout> | null = null;
let started = false;
let inFlight = false;

function setStatus(s: SyncStatus) {
  if (status === s) return;
  status = s;
  listeners.forEach((l) => l());
}

export const syncEnabled = () => SYNC_URL !== null;
export const getSyncStatus = () => status;
export const getLastSyncedAt = () => lastSyncedAt;
export function subscribeSync(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

function deviceId(): string {
  let id = localStorage.getItem(DEVICE_KEY);
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem(DEVICE_KEY, id);
  }
  return id;
}

/** Called by the storage layer after every local write. */
export function notifyLocalChange() {
  if (!SYNC_URL || typeof window === "undefined") return;
  if (status !== "syncing") setStatus(navigator.onLine ? "pending" : "offline");
  if (debounce) clearTimeout(debounce);
  debounce = setTimeout(() => void flush(), DEBOUNCE_MS);
}

export async function flush(): Promise<void> {
  if (!SYNC_URL || inFlight) return;
  if (!navigator.onLine) return setStatus("offline");
  const db = getDb();
  if (!db) return;
  const dirty = await db.outbox.toArray();
  if (!dirty.length) return setStatus("idle");

  inFlight = true;
  setStatus("syncing");
  try {
    const rows = await db.kv.bulkGet(dirty.map((d) => d.key));
    const stores: Record<string, { value: unknown; updatedAt: number }> = {};
    rows.forEach((r) => {
      if (r) stores[r.key] = { value: JSON.parse(r.value), updatedAt: r.updatedAt };
    });
    const res = await fetch(SYNC_URL, {
      method: "POST",
      headers: { "content-type": "application/json", ...(SYNC_KEY ? { authorization: `Bearer ${SYNC_KEY}` } : {}) },
      body: JSON.stringify({ app: "kairos", deviceId: deviceId(), stores }),
      keepalive: true,
    });
    if (!res.ok) throw new Error(String(res.status));
    // Only clear rows that haven't changed again while we were sending.
    await db.transaction("rw", db.outbox, async () => {
      for (const d of dirty) {
        const cur = await db.outbox.get(d.key);
        if (cur && cur.updatedAt === d.updatedAt) await db.outbox.delete(d.key);
      }
    });
    lastSyncedAt = Date.now();
    setStatus((await db.outbox.count()) ? "pending" : "idle");
  } catch {
    setStatus("error");
  } finally {
    inFlight = false;
  }
}

/** Starts the background loop once per page. Safe to call repeatedly. */
export function startBackgroundSync() {
  if (!SYNC_URL || started || typeof window === "undefined") return;
  started = true;
  window.addEventListener("online", () => void flush());
  window.addEventListener("offline", () => setStatus("offline"));
  document.addEventListener("visibilitychange", () => {
    if (document.visibilityState === "hidden") void flush();
  });
  setInterval(() => void flush(), INTERVAL_MS);
  void flush();
}
