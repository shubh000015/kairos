/**
 * Focus Pods — silent co-working presence.
 *
 * Two to four people are matched into a pod for one 25-minute sprint. Nobody
 * talks, nobody is on camera; each just sees the others are there. The server
 * holds nothing personal: a random id, a chosen display name, a colour, a heartbeat.
 *
 * Storage: in-memory by default (fine for `next start` on one machine). Set
 * UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN to share presence across
 * serverless instances. The whole state is small and stored as one JSON blob.
 */

export const POD_MINUTES = 25;
export const POD_SIZE = 4;
const HEARTBEAT_TTL_MS = 60_000;
const MIN_JOIN_REMAINING_MS = 8 * 60_000;
const POD_GRACE_MS = 5 * 60_000;

export type MemberStatus = "focusing" | "paused" | "done";

export interface Member {
  id: string;
  name: string;
  hue: number;
  status: MemberStatus;
  joinedAt: number;
  lastSeen: number;
}

export interface Pod {
  id: string;
  startedAt: number;
  endsAt: number;
  members: Member[];
}

interface State {
  pods: Pod[];
}

export interface PodSnapshot {
  pod: Pod | null;
  /** People focusing in any pod right now (fresh heartbeat, status focusing). */
  focusingNow: number;
  /** People present in any pod, any status. */
  presentNow: number;
  podsOpen: number;
  serverNow: number;
}

/* ---------- backends ---------- */

interface Backend {
  load(): Promise<State>;
  save(s: State): Promise<void>;
}

const g = globalThis as unknown as { __quietFocusPods?: State };

const memoryBackend: Backend = {
  async load() {
    if (!g.__quietFocusPods) g.__quietFocusPods = { pods: [] };
    return g.__quietFocusPods;
  },
  async save(s) {
    g.__quietFocusPods = s;
  },
};

function redisBackend(url: string, token: string): Backend {
  const headers = { authorization: `Bearer ${token}` };
  const key = "kairos:pods";
  return {
    async load() {
      try {
        const res = await fetch(`${url}/get/${key}`, { headers, cache: "no-store" });
        const data = (await res.json()) as { result?: string | null };
        return data.result ? (JSON.parse(data.result) as State) : { pods: [] };
      } catch {
        return { pods: [] };
      }
    },
    async save(s) {
      try {
        await fetch(`${url}/set/${key}`, { method: "POST", headers, body: JSON.stringify(s) });
      } catch {
        // presence is best-effort
      }
    },
  };
}

function backend(): Backend {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? redisBackend(url.replace(/\/$/, ""), token) : memoryBackend;
}

/* ---------- operations ---------- */

function prune(state: State, now: number): State {
  const pods = state.pods
    .map((p) => ({ ...p, members: p.members.filter((m) => now - m.lastSeen < HEARTBEAT_TTL_MS) }))
    .filter((p) => p.members.length > 0 && now < p.endsAt + POD_GRACE_MS);
  return { pods };
}

function snapshot(state: State, pod: Pod | null, now: number): PodSnapshot {
  const members = state.pods.flatMap((p) => p.members);
  return {
    pod,
    focusingNow: members.filter((m) => m.status === "focusing").length,
    presentNow: members.length,
    podsOpen: state.pods.filter((p) => now < p.endsAt).length,
    serverNow: now,
  };
}

function id() {
  return Math.random().toString(36).slice(2, 10);
}

export async function podStats(): Promise<PodSnapshot> {
  const now = Date.now();
  const state = prune(await backend().load(), now);
  return snapshot(state, null, now);
}

export async function joinPod(member: Pick<Member, "id" | "name" | "hue">): Promise<PodSnapshot> {
  const b = backend();
  const now = Date.now();
  const state = prune(await b.load(), now);

  // Already in a pod? Just refresh.
  const existing = state.pods.find((p) => p.members.some((m) => m.id === member.id));
  if (existing) return heartbeatIn(state, existing, member.id, "focusing", now, b);

  // Prefer the fullest pod that still has room and meaningful time left.
  const open = state.pods
    .filter((p) => p.members.length < POD_SIZE && p.endsAt - now >= MIN_JOIN_REMAINING_MS)
    .sort((a, b2) => b2.members.length - a.members.length);
  let pod = open[0];
  if (!pod) {
    pod = { id: id(), startedAt: now, endsAt: now + POD_MINUTES * 60_000, members: [] };
    state.pods.push(pod);
  }
  pod.members.push({ ...member, name: member.name.slice(0, 24) || "Someone", status: "focusing", joinedAt: now, lastSeen: now });
  await b.save(state);
  return snapshot(state, pod, now);
}

async function heartbeatIn(state: State, pod: Pod, memberId: string, status: MemberStatus, now: number, b: Backend) {
  const m = pod.members.find((x) => x.id === memberId);
  if (m) {
    m.lastSeen = now;
    m.status = status;
  }
  await b.save(state);
  return snapshot(state, pod, now);
}

export async function heartbeat(podId: string, memberId: string, status: MemberStatus, name?: string): Promise<PodSnapshot> {
  const b = backend();
  const now = Date.now();
  const state = prune(await b.load(), now);
  const pod = state.pods.find((p) => p.id === podId);
  if (!pod) return snapshot(state, null, now);
  const m = pod.members.find((x) => x.id === memberId);
  if (m && name) m.name = name.slice(0, 24);
  return heartbeatIn(state, pod, memberId, status, now, b);
}

export async function leavePod(podId: string, memberId: string): Promise<PodSnapshot> {
  const b = backend();
  const now = Date.now();
  const state = prune(await b.load(), now);
  const pod = state.pods.find((p) => p.id === podId);
  if (pod) {
    pod.members = pod.members.filter((m) => m.id !== memberId);
    if (!pod.members.length) state.pods = state.pods.filter((p) => p.id !== podId);
  }
  await b.save(state);
  return snapshot(state, null, now);
}
