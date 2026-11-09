import { createJSONStorage, type StateStorage } from "zustand/middleware";
import { getDb, markDbUnavailable } from "@/lib/db";
import { notifyLocalChange } from "@/lib/sync";

/**
 * Keys that are also mirrored to localStorage, because something must read them
 * synchronously before first paint (ThemeScript reads the theme).
 */
const MIRRORED = new Set(["settings-store"]);

/**
 * Keys that have been read (hydrated) at least once. With async storage, a store
 * `set()` that fires before its first read would write defaults over saved data,
 * so writes are dropped until the read has happened — hydration merges anyway.
 */
const readKeys = new Set<string>();

const ls = (): Storage | null => {
  try {
    return typeof localStorage === "undefined" ? null : localStorage;
  } catch {
    return null;
  }
};

/** Raw serialised value. Migrates a legacy localStorage entry into IndexedDB on first read. */
export async function readRaw(name: string): Promise<string | null> {
  const db = getDb();
  if (!db) return ls()?.getItem(name) ?? null;
  try {
    const row = await db.kv.get(name);
    if (row) return row.value;
    const legacy = ls()?.getItem(name) ?? null;
    if (legacy !== null) {
      await db.kv.put({ key: name, value: legacy, updatedAt: Date.now() });
      if (!MIRRORED.has(name)) ls()?.removeItem(name);
    }
    return legacy;
  } catch {
    markDbUnavailable();
    return ls()?.getItem(name) ?? null;
  }
}

/** Writes regardless of hydration state (used by import) and marks the key dirty for sync. */
export async function writeRaw(name: string, value: string): Promise<void> {
  readKeys.add(name);
  if (MIRRORED.has(name)) ls()?.setItem(name, value);
  const db = getDb();
  if (!db) {
    ls()?.setItem(name, value);
    return;
  }
  try {
    const now = Date.now();
    await db.transaction("rw", db.kv, db.outbox, async () => {
      await db.kv.put({ key: name, value, updatedAt: now });
      await db.outbox.put({ key: name, updatedAt: now });
    });
    notifyLocalChange();
  } catch {
    markDbUnavailable();
    ls()?.setItem(name, value);
  }
}

/**
 * IndexedDB-backed StateStorage for zustand `persist`. If IndexedDB is unavailable
 * (some private modes), everything transparently uses localStorage instead.
 */
const idbStateStorage: StateStorage = {
  async getItem(name) {
    try {
      return await readRaw(name);
    } finally {
      readKeys.add(name);
    }
  },
  async setItem(name, value) {
    if (!readKeys.has(name)) return;
    await writeRaw(name, value);
  },
  async removeItem(name) {
    ls()?.removeItem(name);
    const db = getDb();
    if (!db) return;
    try {
      await db.kv.delete(name);
      await db.outbox.delete(name);
    } catch {
      markDbUnavailable();
    }
  },
};

/** Drop-in replacement for `createJSONStorage(() => localStorage)`. */
export const localFirstStorage = <S>() => createJSONStorage<S>(() => idbStateStorage);
