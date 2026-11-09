"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useHydrated } from "./useHydrated";

export interface SpeechState {
  speaking: boolean;
  /** Index of the sentence currently being read, or -1. */
  currentIndex: number;
  rate: number;
}

/** Split into speakable sentences; keeps the original order for highlighting. */
export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, " ")
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"“(])/)
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Sentence-by-sentence text-to-speech via the Web Speech API. Reading one
 * sentence per utterance makes highlighting reliable across browsers.
 */
export function useSpeech() {
  const [state, setState] = useState<SpeechState>({ speaking: false, currentIndex: -1, rate: 1 });
  const queue = useRef<string[]>([]);
  const cancelled = useRef(false);
  const hydrated = useHydrated();
  const supported = hydrated && "speechSynthesis" in window;

  // Stop speaking when the component using the hook unmounts.
  useEffect(
    () => () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) window.speechSynthesis.cancel();
    },
    [],
  );

  const stop = useCallback(() => {
    cancelled.current = true;
    queue.current = [];
    window.speechSynthesis?.cancel();
    setState((s) => ({ ...s, speaking: false, currentIndex: -1 }));
  }, []);

  const speakFrom = useCallback(
    (sentences: string[], startIndex: number, rate: number) => {
      if (!("speechSynthesis" in window)) return;
      window.speechSynthesis.cancel();
      cancelled.current = false;
      queue.current = sentences;
      setState((s) => ({ ...s, speaking: true, currentIndex: startIndex, rate }));

      const speakIndex = (i: number) => {
        if (cancelled.current || i >= queue.current.length) {
          setState((s) => ({ ...s, speaking: false, currentIndex: -1 }));
          return;
        }
        const u = new SpeechSynthesisUtterance(queue.current[i]);
        u.rate = rate;
        u.onstart = () => setState((s) => ({ ...s, currentIndex: i }));
        u.onend = () => speakIndex(i + 1);
        u.onerror = () => speakIndex(i + 1);
        window.speechSynthesis.speak(u);
      };
      speakIndex(startIndex);
    },
    [],
  );

  return { ...state, supported, speakFrom, stop };
}
