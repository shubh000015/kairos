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
      <div role="tablist" aria-label="Study tools" className="study-tabs flex shrink-0 flex-wrap gap-0 border-b border-border">
        {TABS.map((t, i) => {
          const active = t.id === tab;
          return (
            <button
              key={t.id}
              role="tab"
              type="button"
              aria-selected={active}
              title={t.blurb}
              onClick={() => onTab(t.id)}
              className={`-mb-px inline-flex items-center gap-2 border-b-2 px-3 py-2.5 text-sm transition-colors sm:px-4 ${
                active ? "border-accent text-ink" : "border-transparent text-ink-muted hover:text-ink"
              }`}
            >
              <span className="hidden font-mono text-[10px] text-ink-faint sm:inline">{String(i + 1).padStart(2, "0")}</span>
              {t.icon}
              {t.label}
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
