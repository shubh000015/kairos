"use client";

import { useSyncExternalStore } from "react";
import { getModelState, getServerModelState, subscribeModel } from "@/lib/ondevice";

/** Live status of the in-browser embedding model (idle / loading with progress / ready / error). */
export function useOnDeviceModel() {
  return useSyncExternalStore(subscribeModel, getModelState, getServerModelState);
}
