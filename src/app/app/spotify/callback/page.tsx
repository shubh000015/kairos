import type { Metadata } from "next";
import { Suspense } from "react";
import { SpotifyCallback } from "@/components/audio/SpotifyCallback";

export const metadata: Metadata = { title: "Connecting Spotify" };

export default function SpotifyCallbackPage() {
  return (
    <Suspense fallback={null}>
      <SpotifyCallback />
    </Suspense>
  );
}
