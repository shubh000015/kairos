"use client";

import { Cpu, Loader2 } from "lucide-react";
import { useSyncExternalStore } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { useOnDeviceModel } from "@/hooks/useOnDeviceModel";
import { isDbAvailable } from "@/lib/db";
import { loadModel, MODEL_SIZE_LABEL } from "@/lib/ondevice";
import { getLastSyncedAt, getSyncStatus, subscribeSync, syncEnabled, type SyncStatus } from "@/lib/sync";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { Toggle } from "@/components/ui/Toggle";

const SYNC_LABEL: Record<SyncStatus, string> = {
  off: "Off — nothing leaves this device",
  idle: "Up to date",
  pending: "Changes waiting to sync",
  syncing: "Syncing…",
  offline: "Offline — will sync when you're back",
  error: "Couldn't reach the sync server; retrying quietly",
};

export function LocalFirstCard() {
  const hydrated = useHydrated();
  const cloudAI = useSettingsStore((s) => s.cloudAI);
  const onDeviceML = useSettingsStore((s) => s.onDeviceML);
  const set = useSettingsStore((s) => s.set);
  const model = useOnDeviceModel();
  const sync = useSyncExternalStore(subscribeSync, getSyncStatus, () => "off" as SyncStatus);
  const lastSynced = useSyncExternalStore(subscribeSync, getLastSyncedAt, () => null);

  return (
    <Card>
      <CardHeader
        icon={<Cpu className="size-5" />}
        title="On-device AI & data"
        description="Puzzles, task breakdowns and Stuck help run on this device by default. Instant, offline, free."
      />
      <CardBody className="divide-y divide-border pt-2">
        <div className="py-3">
          <Toggle
            id="ondevice-ml"
            label={`On-device model (${MODEL_SIZE_LABEL})`}
            description="A small sentence-embedding model, downloaded once and cached. Powers smarter Stuck summaries and searching your notes by meaning. Runs on WebGPU when available."
            checked={onDeviceML}
            onChange={(v) => {
              set("onDeviceML", v);
              if (v) void loadModel().catch(() => {});
            }}
          />
          {onDeviceML ? (
            <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-ink-faint">
              {model.status === "ready" ? (
                <span>Ready · running on {model.device === "webgpu" ? "WebGPU" : "WASM (CPU)"}</span>
              ) : model.status === "loading" ? (
                <span className="inline-flex items-center gap-1.5">
                  <Loader2 className="size-3.5 animate-spin" /> Downloading… {Math.round(model.progress * 100)}%
                </span>
              ) : model.status === "error" ? (
                <>
                  <span className="text-urgent">Didn&apos;t load: {model.error}</span>
                  <Button size="sm" variant="ghost" onClick={() => void loadModel().catch(() => {})}>Try again</Button>
                </>
              ) : (
                <>
                  <span>Loads the first time it&apos;s needed.</span>
                  <Button size="sm" variant="ghost" onClick={() => void loadModel().catch(() => {})}>Download now</Button>
                </>
              )}
            </div>
          ) : null}
        </div>
        <Toggle
          id="cloud-ai"
          label="Cloud AI fallback"
          description="Off by default. When on, a task that matches none of the built-in templates — and Stuck explanations — may be sent to this app's server LLM (only if the host has configured a key)."
          checked={cloudAI}
          onChange={(v) => set("cloudAI", v)}
        />
        <div className="grid gap-1 py-3 text-sm">
          <div className="flex justify-between gap-3">
            <span className="text-ink">Storage</span>
            <span className="text-right text-ink-muted">{hydrated ? (isDbAvailable() ? "IndexedDB on this device" : "localStorage (IndexedDB unavailable)") : "…"}</span>
          </div>
          <div className="flex justify-between gap-3">
            <span className="text-ink">Background sync</span>
            <span className="text-right text-ink-muted">
              {SYNC_LABEL[sync]}
              {lastSynced && hydrated ? ` · last ${new Date(lastSynced).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : ""}
            </span>
          </div>
          {!syncEnabled() ? <p className="text-xs text-ink-faint">Self-hosting? Set <code className="font-mono">NEXT_PUBLIC_SYNC_URL</code> to sync silently to your own backend when online.</p> : null}
        </div>
      </CardBody>
    </Card>
  );
}
