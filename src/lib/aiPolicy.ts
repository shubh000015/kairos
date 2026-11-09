import { useSettingsStore } from "@/store/useSettingsStore";

/**
 * One switch for every cloud LLM call. Off by default: puzzles, breakdowns and
 * explanations are computed on the device, and the server routes are only
 * contacted when the user explicitly opts in (and the server has a key).
 */
export function cloudAllowed(): boolean {
  return typeof window !== "undefined" && useSettingsStore.getState().cloudAI;
}

export function onDeviceMLEnabled(): boolean {
  return typeof window !== "undefined" && useSettingsStore.getState().onDeviceML;
}
