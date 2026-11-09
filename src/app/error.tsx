"use client";

import Link from "next/link";
import { useEffect } from "react";
import { LogoMark } from "@/components/brand/Logo";
import { Button } from "@/components/ui/Button";

export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-24 text-center">
      <LogoMark className="size-12" />
      <h1 className="font-display text-3xl text-ink">Something hiccuped.</h1>
      <p className="max-w-md text-ink-muted">Not your fault, and your data is safe in this browser. Try again, or head back to the focus screen.</p>
      <div className="flex gap-2">
        <Button variant="primary" onClick={reset}>Try again</Button>
        <Link href="/app" className="inline-flex items-center rounded-xl border border-border px-4 py-2.5 text-ink hover:bg-surface-sunken">Back to Focus</Link>
      </div>
      {error.digest ? <p className="text-xs text-ink-faint">ref {error.digest}</p> : null}
    </main>
  );
}
