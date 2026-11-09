"use client";

import { FileText, Headphones, MonitorPlay, Search, Type } from "lucide-react";
import { useSearchParams, useRouter } from "next/navigation";
import { useStudyStore } from "@/store/useStudyStore";
import { NoteSearch } from "./NoteSearch";
import { PdfReader } from "./PdfReader";
import { StudyStudio, useStudyStudio } from "./StudyStudio";
import { TactileReader } from "./TactileReader";
import { TextReader } from "./TextReader";
import { VideoStudy } from "./VideoStudy";

type Tab = "lecture" | "pdf" | "read" | "listen" | "search";

const TABS: Array<{ id: Tab; label: string; blurb: string; icon: React.ReactNode }> = [
  { id: "lecture", label: "Lecture", blurb: "YouTube, in chunks", icon: <MonitorPlay className="size-4" /> },
  { id: "pdf", label: "PDF", blurb: "The original file", icon: <FileText className="size-4" /> },
  { id: "read", label: "Reader", blurb: "Paste anything", icon: <Type className="size-4" /> },
  { id: "listen", label: "Listen", blurb: "Read-aloud on hotkeys", icon: <Headphones className="size-4" /> },
  { id: "search", label: "Search", blurb: "Your notes, by meaning", icon: <Search className="size-4" /> },
];

const isTab = (v: string | null): v is Tab => TABS.some((t) => t.id === v);

function ListenPanel() {
  const text = useStudyStore((s) => s.readerText);
  return <TactileReader text={text} />;
}

export function StudyHub() {
  const params = useSearchParams();
  const router = useRouter();
  const raw = params.get("tab");
  const tab: Tab = isTab(raw) ? raw : "lecture";

  return (
    <StudyStudio>
    <StudyHubInner tab={tab} onTab={(id) => router.replace(`/app/study?tab=${id}`, { scroll: false })} />
    </StudyStudio>
  );
}

function StudyHubInner({ tab, onTab }: { tab: Tab; onTab: (id: Tab) => void }) {
  const studio = useStudyStudio();
  const compact = Boolean(studio?.fullscreen) || tab === "pdf";

  return (
    <div className={`flex min-h-0 flex-col ${tab === "pdf" ? "flex-1 gap-3" : "gap-6"}`}>
      <div role="tablist" aria-label="Study tools" className={compact ? "study-tabs flex shrink-0 flex-wrap gap-1" : "study-tabs grid shrink-0 grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-5"}>
        {TABS.map((t) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => onTab(t.id)}
              className={`flex flex-col items-start gap-1 rounded-2xl border text-left transition-colors ${
                compact ? "px-3 py-2" : "px-4 py-3"
              } ${active ? "border-accent bg-accent-soft/60" : "border-border bg-surface-raised hover:border-ink-faint"}`}
            >
              <span className="inline-flex items-center gap-2 text-sm font-medium text-ink">
                {t.icon}
                {t.label}
              </span>
              {compact ? null : <span className="text-xs text-ink-muted">{t.blurb}</span>}
            </button>
          );
        })}
      </div>

      <div role="tabpanel" className={`rise-in ${tab === "pdf" ? "flex min-h-0 flex-1 flex-col" : ""}`} key={tab}>
        {tab === "lecture" ? (
          <VideoStudy />
        ) : tab === "pdf" ? (
          <PdfReader />
        ) : tab === "read" ? (
          <TextReader />
        ) : tab === "listen" ? (
          <ListenPanel />
        ) : (
          <NoteSearch />
        )}
      </div>
    </div>
  );
}
