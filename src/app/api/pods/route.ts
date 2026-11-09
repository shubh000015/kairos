import { connection, NextResponse } from "next/server";
import { heartbeat, joinPod, leavePod, podStats, type MemberStatus } from "@/lib/pods/server";

/** GET /api/pods → global presence (how many are focusing right now). */
export async function GET() {
  // Presence is live data: opt out of prerendering (Cache Components mode).
  await connection();
  return NextResponse.json(await podStats(), { headers: { "cache-control": "no-store" } });
}

/**
 * POST /api/pods
 *   { action: "join",      memberId, name, hue }
 *   { action: "heartbeat", memberId, podId, status, name? }
 *   { action: "leave",     memberId, podId }
 * → PodSnapshot
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = (await req.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }
  const memberId = typeof body.memberId === "string" ? body.memberId.slice(0, 40) : "";
  if (!/^[\w-]{6,40}$/.test(memberId)) return NextResponse.json({ error: "memberId required" }, { status: 400 });

  const name = typeof body.name === "string" ? body.name.trim().slice(0, 24) : undefined;
  const podId = typeof body.podId === "string" ? body.podId.slice(0, 20) : "";
  const status: MemberStatus = body.status === "paused" || body.status === "done" ? body.status : "focusing";

  switch (body.action) {
    case "join": {
      const hue = typeof body.hue === "number" && Number.isFinite(body.hue) ? ((body.hue % 360) + 360) % 360 : 140;
      return NextResponse.json(await joinPod({ id: memberId, name: name || "Someone", hue }));
    }
    case "heartbeat":
      if (!podId) return NextResponse.json({ error: "podId required" }, { status: 400 });
      return NextResponse.json(await heartbeat(podId, memberId, status, name));
    case "leave":
      if (!podId) return NextResponse.json({ error: "podId required" }, { status: 400 });
      return NextResponse.json(await leavePod(podId, memberId));
    default:
      return NextResponse.json({ error: "unknown action" }, { status: 400 });
  }
}
