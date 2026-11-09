import type { Metadata } from "next";
import { Suspense } from "react";
import { StudyHub } from "@/components/study/StudyHub";
import { PageHeader } from "@/components/ui/Misc";

export const metadata: Metadata = { title: "Study" };

export default function StudyPage() {
  return (
    <>
      <PageHeader title="Study" description="Lectures from YouTube. PDFs as the original file, one page at a time. Music in the thin bar." />
      {/* useSearchParams needs a Suspense boundary so the static shell can prerender. */}
      <Suspense fallback={<div className="h-40" aria-hidden="true" />}>
        <StudyHub />
      </Suspense>
    </>
  );
}
