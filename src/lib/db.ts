import Dexie, { type EntityTable } from "dexie";

/**
 * Local-first database (IndexedDB via Dexie). Every Zustand store persists here,
 * so writes are instant and the UI never waits on a network.
 *
 *  kv      one row per store: the serialised `{ state, version }` blob
 *  outbox  one row per store that changed since the last successful sync
 */

export interface KvRow {
  key: string;
  value: string;
  updatedAt: number;
}

export interface OutboxRow {
  key: string;
  updatedAt: number;
}

type KairosDb = Dexie & {
  kv: EntityTable<KvRow, "key">;
  outbox: EntityTable<OutboxRow, "key">;
};

let db: KairosDb | null = null;
let unavailable = false;

/** Lazily opened so importing this module on the server is harmless. Null if IndexedDB is unavailable. */
export function getDb(): KairosDb | null {
  if (unavailable || typeof indexedDB === "undefined") return null;
  if (!db) {
    try {
      // Keep the original IndexedDB name so existing local data survives the Kairos rebrand.
      const d = new Dexie("quiet-focus") as KairosDb;
      d.version(1).stores({ kv: "key, updatedAt", outbox: "key, updatedAt" });
      db = d;
    } catch {
      unavailable = true;
      return null;
    }
  }
  return db;
}

/** Called when an operation fails (e.g. private mode blocks IndexedDB). Falls back to localStorage. */
export function markDbUnavailable() {
  unavailable = true;
  db = null;
}

export function isDbAvailable(): boolean {
  return getDb() !== null;
}
