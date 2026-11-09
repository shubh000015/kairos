import { readRaw, writeRaw } from "./storage";
import { useAudioEngineStore } from "./useAudioEngineStore";
import { useCompanionStore } from "./useCompanionStore";
import { useFocusStore } from "./useFocusStore";
import { useParkingLotStore } from "./useParkingLotStore";
import { usePodStore } from "./usePodStore";
import { useRewardStore } from "./useRewardStore";
import { useRoutineStore } from "./useRoutineStore";
import { useSettingsStore } from "./useSettingsStore";
import { useStudyStore } from "./useStudyStore";
import { useTaskStore } from "./useTaskStore";
import { useYouTubeAudioStore } from "./useYouTubeAudioStore";

/** Every persisted store. Used for hydration, export, import and reset. */
export const ALL_STORES = [
  useSettingsStore,
  useFocusStore,
  useParkingLotStore,
  useTaskStore,
  useCompanionStore,
  useRoutineStore,
  useStudyStore,
  useRewardStore,
  usePodStore,
  useAudioEngineStore,
  useYouTubeAudioStore,
] as const;

export const EXPORT_VERSION = 1;

export interface ExportFile {
  app: "kairos" | "quiet-focus";
  version: number;
  exportedAt: string;
  stores: Record<string, unknown>;
}

/** Snapshot of every store's persisted slice, as stored on this device. */
export async function exportAllData(): Promise<ExportFile> {
  const stores: Record<string, unknown> = {};
  for (const store of ALL_STORES) {
    const name = store.persist.getOptions().name;
    if (!name) continue;
    const raw = await readRaw(name);
    if (raw) {
      try {
        stores[name] = JSON.parse(raw);
      } catch {
        // skip corrupt entry
      }
    }
  }
  return { app: "kairos", version: EXPORT_VERSION, exportedAt: new Date().toISOString(), stores };
}

/** Writes an export file back into local storage and rehydrates. Throws on invalid input. */
export async function importAllData(input: unknown): Promise<number> {
  if (!input || typeof input !== "object") throw new Error("Not a Kairos export file.");
  const file = input as Partial<ExportFile>;
  if ((file.app !== "kairos" && file.app !== "quiet-focus") || !file.stores || typeof file.stores !== "object") {
    throw new Error("Not a Kairos export file.");
  }
  let count = 0;
  for (const store of ALL_STORES) {
    const name = store.persist.getOptions().name;
    if (!name) continue;
    const slice = file.stores[name];
    if (slice === undefined) continue;
    await writeRaw(name, JSON.stringify(slice));
    await store.persist.rehydrate();
    count++;
  }
  return count;
}

/** Wipes every store and reloads defaults. */
export async function resetAllData(): Promise<void> {
  await Promise.all(ALL_STORES.map((store) => store.persist.clearStorage()));
  // Simplest reliable way to drop in-memory state everywhere.
  window.location.reload();
}
