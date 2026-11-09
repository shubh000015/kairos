import Link from "next/link";
import { LogoMark } from "@/components/brand/Logo";

export default function NotFound() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-24 text-center">
      <LogoMark className="size-12" />
      <h1 className="font-display text-3xl text-ink">That page wandered off.</h1>
      <p className="max-w-md text-ink-muted">Happens to the best of us. Here&apos;s the way back.</p>
      <Link href="/app" className="btn-tactile inline-flex items-center rounded-xl bg-accent px-5 py-2.5 text-accent-ink shadow-soft hover:opacity-90">
        Back to Focus
      </Link>
    </main>
  );
}
