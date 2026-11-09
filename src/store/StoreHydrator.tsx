"use client";

import { useEffect } from "react";
import { startBackgroundSync } from "@/lib/sync";
import { ALL_STORES } from "./registry";

/**
 * Rehydrates every persisted store after mount.
 * Stores are created with `skipHydration: true` so the server render and the first
 * client render use identical defaults, then IndexedDB state is applied.
 */
export function StoreHydrator() {
  useEffect(() => {
    void Promise.all(ALL_STORES.map((store) => store.persist.rehydrate())).then(startBackgroundSync);
  }, []);
  return null;
}
