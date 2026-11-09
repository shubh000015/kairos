"use client";

import { LogOut, Pencil, Users } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useHydrated } from "@/hooks/useHydrated";
import { useNow } from "@/hooks/useNow";
import type { MemberStatus, PodSnapshot } from "@/lib/pods/server";
import { formatClock } from "@/lib/time";
import { useFocusStore } from "@/store/useFocusStore";
import { usePodStore } from "@/store/usePodStore";
import { Button } from "@/components/ui/Button";
import { Card, CardBody, CardHeader } from "@/components/ui/Card";
import { toast } from "@/components/ui/Toast";

const POLL_IDLE_MS = 20_000;
const HEARTBEAT_MS = 12_000;
const CALM_SWATCH = ["#84A59D", "#6B7A8F", "#E27D60"] as const;
function calmSwatch(hue: number) {
  return CALM_SWATCH[Math.abs(Math.round(hue)) % CALM_SWATCH.length];
}

async function callPods(body: Record<string, unknown>): Promise<PodSnapshot | null> {
  try {
    const res = await fetch("/api/pods", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) return null;
    return (await res.json()) as PodSnapshot;
  } catch {
    return null;
  }
}

/**
 * Virtual body doubling. Join a pod of up to four strangers for one shared
 * 25-minute sprint. No chat, no camera, no names you didn't choose — only the
 * quiet fact that other people are working right now, which is the whole point.
 */
export function FocusPods() {
  const hydrated = useHydrated();
  const memberId = usePodStore((s) => s.memberId);
  const name = usePodStore((s) => s.name);
  const hue = usePodStore((s) => s.hue);
  const podId = usePodStore((s) => s.podId);
  const snapshot = usePodStore((s) => s.snapshot);
  const sprintsTogether = usePodStore((s) => s.sprintsTogether);
  const setName = usePodStore((s) => s.setName);
  const setSnapshot = usePodStore((s) => s.setSnapshot);
  const setPodId = usePodStore((s) => s.setPodId);
  const recordSprint = usePodStore((s) => s.recordSprint);

  const focusStatus = useFocusStore((s) => s.status);
  const startFor = useFocusStore((s) => s.startFor);

  const [joining, setJoining] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const now = useNow(1000);
  const recorded = useRef<string | null>(null);

  const myStatus: MemberStatus = focusStatus === "running" ? "focusing" : focusStatus === "paused" ? "paused" : "done";

  // Not in a pod: poll the global count so the "N focusing right now" line stays live.
  useEffect(() => {
    if (!hydrated || podId) return;
    let alive = true;
    const tick = async () => {
      try {
        const res = await fetch("/api/pods", { cache: "no-store" });
        if (res.ok && alive) setSnapshot((await res.json()) as PodSnapshot);
      } catch {
        // offline: keep whatever we had
      }
    };
    void tick();
    const id = window.setInterval(tick, POLL_IDLE_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [hydrated, podId, setSnapshot]);

  // In a pod: heartbeat with status; leave if the pod has dissolved.
  useEffect(() => {
    if (!hydrated || !podId) return;
    let alive = true;
    const beat = async () => {
      const snap = await callPods({ action: "heartbeat", memberId, podId, status: myStatus, name });
      if (!alive || !snap) return;
      setSnapshot(snap);
      if (!snap.pod) setPodId(null);
    };
    void beat();
    const id = window.setInterval(beat, HEARTBEAT_MS);
    return () => {
      alive = false;
      window.clearInterval(id);
    };
  }, [hydrated, podId, memberId, myStatus, name, setSnapshot, setPodId]);

  const leave = useCallback(async () => {
    if (!podId) return;
    const id = podId;
    setPodId(null);
    const snap = await callPods({ action: "leave", memberId, podId: id });
    if (snap) setSnapshot(snap);
  }, [podId, memberId, setPodId, setSnapshot]);

  const join = async () => {
    setJoining(true);
    try {
      const snap = await callPods({ action: "join", memberId, name, hue });
      if (!snap?.pod) {
        toast("Couldn't reach the pods right now. Solo still counts.");
        return;
      }
      setSnapshot(snap);
      setPodId(snap.pod.id);
      const remaining = snap.pod.endsAt - snap.serverNow;
      if (focusStatus === "idle" || focusStatus === "complete") startFor(remaining);
      const others = snap.pod.members.length - 1;
      toast(others > 0 ? `You're in. ${others} other${others === 1 ? "" : "s"} focusing with you.` : "You're in. Others can join for the next while.");
    } finally {
      setJoining(false);
    }
  };

  const pod = podId ? snapshot?.pod : null;
  const remaining = pod && now ? Math.max(0, pod.endsAt - now) : null;
  const over = pod && remaining !== null && remaining === 0;
  const others = pod ? pod.members.filter((m) => m.id !== memberId) : [];

  // Count a finished sprint once, and only if someone else was actually there.
  useEffect(() => {
    if (!pod || !over || recorded.current === pod.id) return;
    recorded.current = pod.id;
    if (others.length > 0) recordSprint();
  }, [pod, over, others.length, recordSprint]);

  if (!hydrated) return null;

  const focusingNow = snapshot?.focusingNow ?? 0;
  const presentNow = snapshot?.presentNow ?? 0;
  const othersFocusing = pod ? others.filter((m) => m.status === "focusing").length : focusingNow;

  return (
    <Card>
      <CardHeader
        icon={<Users className="size-5" />}
        title="Focus pod"
        description={pod ? "A quiet room. Nobody talks; everyone's working." : "Silent co-working. Up to four people, one 25-minute sprint."}
        action={
          pod ? (
            <Button variant="ghost" size="sm" onClick={() => void leave()}>
              <LogOut className="size-4" /> Leave
            </Button>
          ) : null
        }
      />
      <CardBody className="flex flex-col gap-4 pt-3">
        {/* Live presence line */}
        <p className="flex items-center gap-2 text-sm text-ink">
          <span className={`inline-block size-2 rounded-full ${othersFocusing > 0 ? "bg-accent pulse-dot" : "bg-border"}`} aria-hidden="true" />
          {othersFocusing > 0 ? (
            <>
              <span className="font-medium">
                {othersFocusing} other{othersFocusing === 1 ? "" : "s"}
              </span>{" "}
              focusing right now{!pod && presentNow > focusingNow ? `, ${presentNow - focusingNow} on a break` : ""}
            </>
          ) : pod ? (
            "You're first in. Someone may drift in — either way, the sprint is on."
          ) : snapshot ? (
            "Nobody in a pod this minute. Start one and be the person others find."
          ) : (
            "Checking who's around…"
          )}
        </p>

        {pod ? (
          <div className="flex flex-col gap-3 rounded-xl border border-border bg-surface px-4 py-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="eyebrow">{over ? "Sprint finished" : "Shared sprint"}</div>
                <div className="font-mono text-2xl tabular-nums text-ink">{remaining === null ? "--:--" : formatClock(remaining)}</div>
              </div>
              <ul className="flex -space-x-2" aria-label="People in this pod">
                {pod.members.map((m) => (
                  <li key={m.id} title={`${m.name}${m.id === memberId ? " (you)" : ""} · ${m.status}`}>
                    <span
                      className={`inline-flex size-9 items-center justify-center rounded-full border-2 border-surface-raised text-xs font-medium text-[#F7F5F0] ${m.status === "focusing" ? "" : "opacity-50"}`}
                      style={{ background: calmSwatch(m.hue) }}
                    >
                      {m.name.slice(0, 1).toUpperCase()}
                    </span>
                  </li>
                ))}
                {Array.from({ length: Math.max(0, 4 - pod.members.length) }).map((_, i) => (
                  <li key={`empty-${i}`} aria-hidden="true">
                    <span className="inline-flex size-9 rounded-full border-2 border-dashed border-border bg-surface-raised" />
                  </li>
                ))}
              </ul>
            </div>
            <ul className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink-muted">
              {pod.members.map((m) => (
                <li key={m.id} className="inline-flex items-center gap-1.5">
                  <span className="inline-block size-1.5 rounded-full" style={{ background: calmSwatch(m.hue) }} aria-hidden="true" />
                  {m.name}
                  {m.id === memberId ? " (you)" : ""}
                  <span className="text-ink-faint">· {m.status === "focusing" ? "focusing" : m.status === "paused" ? "paused" : "done"}</span>
                </li>
              ))}
            </ul>
            {over ? (
              <p className="text-sm text-ink">
                {others.length > 0 ? `${others.length + 1} of you made it to the end. ` : ""}
                Leave when you like — or stay for the next one by joining again.
              </p>
            ) : null}
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary" onClick={() => void join()} disabled={joining}>
              <Users className="size-4" /> {joining ? "Finding a pod…" : "Join a pod (25 min)"}
            </Button>
            <span className="text-xs text-ink-faint">Camera off, mic off, nothing shared but a first initial.</span>
          </div>
        )}

        {/* Identity */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-ink-faint">
          <span className="inline-block size-3 rounded-full" style={{ background: calmSwatch(hue) }} aria-hidden="true" />
          {editing ? (
            <form
              onSubmit={(e) => {
                e.preventDefault();
                setName(draft);
                setEditing(false);
              }}
              className="inline-flex items-center gap-1"
            >
              <input value={draft} onChange={(e) => setDraft(e.target.value)} maxLength={24} aria-label="Your pod name" autoFocus className="rounded-md border border-border bg-surface-raised px-2 py-0.5 text-xs text-ink" />
              <Button type="submit" size="sm" variant="soft" className="px-2 py-0.5 text-xs">
                Save
              </Button>
            </form>
          ) : (
            <button
              type="button"
              onClick={() => {
                setDraft(name);
                setEditing(true);
              }}
              className="inline-flex items-center gap-1 hover:text-ink"
            >
              you appear as <span className="text-ink-muted">{name}</span> <Pencil className="size-3" />
            </button>
          )}
          {sprintsTogether > 0 ? <span className="ml-auto">{sprintsTogether} sprint{sprintsTogether === 1 ? "" : "s"} with company</span> : null}
        </div>
      </CardBody>
    </Card>
  );
}
