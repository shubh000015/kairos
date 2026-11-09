"use client";

import { Loader2 } from "lucide-react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { completeSpotifyAuth, SpotifyError } from "@/lib/spotifyApi";
import { toast } from "@/components/ui/Toast";

/** Finishes the PKCE exchange, then bounces back to the dashboard. */
export function SpotifyCallback() {
  const params = useSearchParams();
  const router = useRouter();
  const [exchangeError, setExchangeError] = useState<string | null>(null);
  const ran = useRef(false);

  const code = params.get("code");
  const state = params.get("state");
  const denied = params.get("error");
  const immediateError = denied
    ? denied === "access_denied"
      ? "You cancelled the Spotify sign-in. No problem."
      : `Spotify said: ${denied}`
    : !code
      ? "No authorisation code in the URL."
      : null;
  const error = immediateError ?? exchangeError;

  useEffect(() => {
    if (ran.current || !code || denied) return;
    ran.current = true;
    completeSpotifyAuth(code, state)
      .then(() => {
        toast("Spotify connected.");
        router.replace("/app");
      })
      .catch((e: unknown) => setExchangeError(e instanceof SpotifyError ? e.hint : "Couldn't finish connecting."));
  }, [code, state, denied, router]);

  return (
    <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-24 text-center">
      {error ? (
        <>
          <p className="font-display text-xl text-ink">Didn&apos;t connect</p>
          <p className="text-sm text-ink-muted">{error}</p>
          <Link href="/app" className="text-sm text-accent underline-offset-4 hover:underline">
            Back to the dashboard
          </Link>
        </>
      ) : (
        <>
          <Loader2 className="size-6 animate-spin text-ink-faint" />
          <p className="text-sm text-ink-muted">Connecting Spotify…</p>
        </>
      )}
    </div>
  );
}
