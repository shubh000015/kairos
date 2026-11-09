import type { Metadata } from "next";
import { Suspense } from "react";
import { StudyHub } from "@/components/study/StudyHub";
import { PageHeader } from "@/components/ui/Misc";

export const metadata: Metadata = { title: "Study" };

export default function StudyPage() {
  return (
    <>
      <PageHeader title="Study" description="Lectures in chunks, PDFs with the original page kept in view. Full studio puts music, parking and tools in the same frame." />
      {/* useSearchParams needs a Suspense boundary so the static shell can prerender. */}
      <Suspense fallback={<div className="h-40" aria-hidden="true" />}>
        <StudyHub />
      </Suspense>
    </>
  );
}
