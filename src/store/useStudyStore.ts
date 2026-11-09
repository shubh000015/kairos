import { create } from "zustand";
import { persist } from "zustand/middleware";
import { localFirstStorage } from "./storage";
import { makeId } from "@/lib/id";

/** A note pinned to a moment in a video or a page in a document. */
export interface StudyNote {
  id: string;
  text: string;
  /** Video: seconds. PDF: page number. */
  at: number;
  createdAt: number;
}

export interface VideoSession {
  videoId: string;
  url: string;
  title: string;
  /** Chunk length in minutes the user chose for this video. */
  chunkMin: number;
  lastPositionSec: number;
  notes: StudyNote[];
  updatedAt: number;
}

export interface PdfSession {
  /** Stable key derived from file name + size, since files live on the user's disk. */
  key: string;
  name: string;
  pageCount: number;
  lastPage: number;
  /** Pages the user has marked as read this sitting. */
  pageGoal: number;
  notes: StudyNote[];
  updatedAt: number;
}

export interface StudyState {
  videos: Record<string, VideoSession>;
  pdfs: Record<string, PdfSession>;
  /** Scratch text for the Reader tab. */
  readerText: string;
  readerFontSize: number;
  /** Kinetic Reading (blur-below + speedbumps) for pasted text in Reader. PDFs never use this. */
  kinetic: boolean;
  /** How far the reader got through the current pasted text, in unlocked sections. */
  readerKineticUnlocked: number;
  /** Speedbumps cleared, ever. Only goes up. */
  speedbumpsCleared: number;

  upsertVideo: (v: Pick<VideoSession, "videoId" | "url"> & Partial<VideoSession>) => void;
  setVideoPosition: (videoId: string, sec: number) => void;
  addVideoNote: (videoId: string, text: string, atSec: number) => void;
  removeVideoNote: (videoId: string, noteId: string) => void;
  removeVideo: (videoId: string) => void;

  upsertPdf: (p: Pick<PdfSession, "key" | "name" | "pageCount"> & Partial<PdfSession>) => void;
  setPdfPage: (key: string, page: number) => void;
  setPdfGoal: (key: string, goal: number) => void;
  addPdfNote: (key: string, text: string, page: number) => void;
  removePdfNote: (key: string, noteId: string) => void;

  setReaderText: (text: string) => void;
  setReaderFontSize: (px: number) => void;
  setKinetic: (on: boolean) => void;
  setReaderKineticUnlocked: (n: number) => void;
  recordSpeedbump: () => void;
}

export const useStudyStore = create<StudyState>()(
  persist(
    (set) => ({
      videos: {},
      pdfs: {},
      readerText: "",
      readerFontSize: 20,
      kinetic: false,
      readerKineticUnlocked: 0,
      speedbumpsCleared: 0,

      upsertVideo: (v) =>
        set((s) => {
          const prev = s.videos[v.videoId];
          const next: VideoSession = {
            videoId: v.videoId,
            url: v.url,
            title: v.title ?? prev?.title ?? "",
            chunkMin: v.chunkMin ?? prev?.chunkMin ?? 10,
            lastPositionSec: v.lastPositionSec ?? prev?.lastPositionSec ?? 0,
            notes: prev?.notes ?? [],
            updatedAt: Date.now(),
          };
          return { videos: { ...s.videos, [v.videoId]: next } };
        }),
      setVideoPosition: (videoId, sec) =>
        set((s) => {
          const prev = s.videos[videoId];
          if (!prev) return s;
          return { videos: { ...s.videos, [videoId]: { ...prev, lastPositionSec: Math.max(0, Math.floor(sec)) } } };
        }),
      addVideoNote: (videoId, text, atSec) =>
        set((s) => {
          const prev = s.videos[videoId];
          if (!prev || !text.trim()) return s;
          const note: StudyNote = { id: makeId(), text: text.trim(), at: Math.floor(atSec), createdAt: Date.now() };
          return { videos: { ...s.videos, [videoId]: { ...prev, notes: [...prev.notes, note].sort((a, b) => a.at - b.at), updatedAt: Date.now() } } };
        }),
      removeVideoNote: (videoId, noteId) =>
        set((s) => {
          const prev = s.videos[videoId];
          if (!prev) return s;
          return { videos: { ...s.videos, [videoId]: { ...prev, notes: prev.notes.filter((n) => n.id !== noteId) } } };
        }),
      removeVideo: (videoId) =>
        set((s) => {
          const videos = { ...s.videos };
          delete videos[videoId];
          return { videos };
        }),

      upsertPdf: (p) =>
        set((s) => {
          const prev = s.pdfs[p.key];
          const next: PdfSession = {
            key: p.key,
            name: p.name,
            pageCount: p.pageCount,
            lastPage: p.lastPage ?? prev?.lastPage ?? 1,
            pageGoal: p.pageGoal ?? prev?.pageGoal ?? 3,
            notes: prev?.notes ?? [],
            updatedAt: Date.now(),
          };
          return { pdfs: { ...s.pdfs, [p.key]: next } };
        }),
      setPdfPage: (key, page) =>
        set((s) => {
          const prev = s.pdfs[key];
          if (!prev) return s;
          return { pdfs: { ...s.pdfs, [key]: { ...prev, lastPage: page, updatedAt: Date.now() } } };
        }),
      setPdfGoal: (key, goal) =>
        set((s) => {
          const prev = s.pdfs[key];
          if (!prev) return s;
          return { pdfs: { ...s.pdfs, [key]: { ...prev, pageGoal: Math.max(1, goal) } } };
        }),
      addPdfNote: (key, text, page) =>
        set((s) => {
          const prev = s.pdfs[key];
          if (!prev || !text.trim()) return s;
          const note: StudyNote = { id: makeId(), text: text.trim(), at: page, createdAt: Date.now() };
          return { pdfs: { ...s.pdfs, [key]: { ...prev, notes: [...prev.notes, note].sort((a, b) => a.at - b.at), updatedAt: Date.now() } } };
        }),
      removePdfNote: (key, noteId) =>
        set((s) => {
          const prev = s.pdfs[key];
          if (!prev) return s;
          return { pdfs: { ...s.pdfs, [key]: { ...prev, notes: prev.notes.filter((n) => n.id !== noteId) } } };
        }),

      setReaderText: (text) =>
        set((s) => {
          const next = text.slice(0, 200_000);
          // New material starts from the top; the same text keeps its place.
          return { readerText: next, readerKineticUnlocked: next === s.readerText ? s.readerKineticUnlocked : 0 };
        }),
      setReaderFontSize: (px) => set({ readerFontSize: Math.min(32, Math.max(14, px)) }),
      setKinetic: (on) => set({ kinetic: on }),
      setReaderKineticUnlocked: (n) => set({ readerKineticUnlocked: Math.max(0, n) }),
      recordSpeedbump: () => set((s) => ({ speedbumpsCleared: s.speedbumpsCleared + 1 })),
    }),
    {
      name: "study-store",
      storage: localFirstStorage(),
      skipHydration: true,
    },
  ),
);
