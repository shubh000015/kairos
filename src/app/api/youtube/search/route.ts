import { NextResponse } from "next/server";

/**
 * GET /api/youtube/search?q=lofi
 * Proxies YouTube Data API v3 so the key stays on the server.
 * Without YOUTUBE_API_KEY the client still plays pasted links and stations.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2) {
    return NextResponse.json({ error: "Type at least two characters." }, { status: 400 });
  }

  const key = process.env.YOUTUBE_API_KEY;
  if (!key) {
    return NextResponse.json({ configured: false, results: [] });
  }

  const url = new URL("https://www.googleapis.com/youtube/v3/search");
  url.searchParams.set("part", "snippet");
  url.searchParams.set("type", "video");
  url.searchParams.set("videoEmbeddable", "true");
  url.searchParams.set("maxResults", "8");
  url.searchParams.set("safeSearch", "moderate");
  url.searchParams.set("q", q);
  url.searchParams.set("key", key);

  try {
    const res = await fetch(url, { next: { revalidate: 300 } });
    if (!res.ok) {
      return NextResponse.json({ configured: true, results: [], error: "YouTube search is busy. Try a pasted link." });
    }
    const data = (await res.json()) as {
      items?: Array<{
        id?: { videoId?: string };
        snippet?: {
          title?: string;
          channelTitle?: string;
          thumbnails?: { medium?: { url?: string }; default?: { url?: string } };
        };
      }>;
    };
    const results = (data.items ?? [])
      .map((it) => {
        const id = it.id?.videoId;
        const title = it.snippet?.title?.trim();
        if (!id || !title) return null;
        return {
          id,
          title: decodeHtml(title),
          channel: it.snippet?.channelTitle ?? "",
          thumb: it.snippet?.thumbnails?.medium?.url ?? it.snippet?.thumbnails?.default?.url ?? "",
        };
      })
      .filter((x): x is { id: string; title: string; channel: string; thumb: string } => x !== null);
    return NextResponse.json({ configured: true, results });
  } catch {
    return NextResponse.json({ configured: true, results: [], error: "Couldn't reach YouTube." });
  }
}

function decodeHtml(s: string) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}
