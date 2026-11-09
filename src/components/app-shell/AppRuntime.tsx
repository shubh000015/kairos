"use client";

import { AudioEngineEffects } from "@/components/audio/AudioEngineEffects";
import { SoundscapeHost } from "@/components/audio/SoundscapeHost";
import { YouTubeAudioHost } from "@/components/audio/YouTubeAudioHost";

/** Client hosts that must live for the whole app session (audio, Spotify shift). */
export function AppRuntime() {
  return (
    <>
      <SoundscapeHost />
      <YouTubeAudioHost />
      <AudioEngineEffects />
    </>
  );
}
