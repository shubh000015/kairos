"use client";

import { Coffee, Dices, ExternalLink, Footprints, Gift, MonitorPlay, Play, Plus, TreePine, UtensilsCrossed, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useNow } from "@/hooks/useNow";
import { RARITY_LABEL, type Reward, type RewardKind } from "@/lib/rewards";
import { playRewardChime, playSoftChime } from "@/lib/sound";
import { formatClock } from "@/lib/time";
import { useFocusStore, type FocusPreset } from "@/store/useFocusStore";
import { useRewardStore } from "@/store/useRewardStore";
import { useSettingsStore } from "@/store/useSettingsStore";
import { Button } from "@/components/ui/Button";
import { Pill } from "@/components/ui/Misc";

const KIND_ICON: Record<RewardKind, React.ReactNode> = {
  break: <Coffee className="size-5" aria-hidden="true" />,
  move: <Footprints className="size-5" aria-hidden="true" />,
  video: <MonitorPlay className="size-5" aria-hidden="true" />,
  menu: <UtensilsCrossed className="size-5" aria-hidden="true" />,
  wander: <TreePine className="size-5" aria-hidden="true" />,
};

const SHUFFLE_CARDS = ["3-min breather", "7-min break", "Move", "Short video", "Your menu", "Rare drop"];

/**
 * The loot drop. Rolls for ~1.2 s, reveals one bounded reward, then runs the
 * break timer for it. Owns nothing about the focus block itself.
 */
export function RewardDrop() {
  const rolling = useRewardStore((s) => s.rolling);
  const current = useRewardStore((s) => s.current);
  const breakEndsAt = useRewardStore((s) => s.breakEndsAt);
  const reveal = useRewardStore((s) => s.reveal);
  const startBreak = useRewardStore((s) => s.startBreak);
  const extendBreak = useRewardStore((s) => s.extendBreak);
  const dismiss = useRewardStore((s) => s.dismiss);
  const removeVideo = useRewardStore((s) => s.removeVideo);

  const soundEnabled = useFocusStore((s) => s.soundEnabled);
  const flowPreset = useFocusStore((s) => s.flowPreset);
  const focusStatus = useFocusStore((s) => s.status);
  const startFocus = useFocusStore((s) => s.start);
  const extendFocus = useFocusStore((s) => s.extend);
  const stopFocus = useFocusStore((s) => s.stop);
  const reduceMotion = useSettingsStore((s) => s.reduceMotion);

  // Roll → reveal after a short, deliberately uncertain beat.
  useEffect(() => {
    if (!rolling) return;
    const id = window.setTimeout(
      () => {
        const r = reveal();
        if (soundEnabled) playRewardChime();
        // Videos start their break immediately: the clip *is* the break.
        if (r.kind === "video") useRewardStore.getState().startBreak(r.minutes);
      },
      reduceMotion ? 250 : 1250,
    );
    return () => window.clearTimeout(id);
  }, [rolling, reveal, soundEnabled, reduceMotion]);

  const [shuffleIdx, setShuffleIdx] = useState(0);
  useEffect(() => {
    if (!rolling || reduceMotion) return;
    const id = window.setInterval(() => setShuffleIdx((i) => (i + 1) % SHUFFLE_CARDS.length), 140);
    return () => window.clearInterval(id);
  }, [rolling, reduceMotion]);

  const now = useNow(1000);
  const remaining = breakEndsAt && now ? Math.max(0, breakEndsAt - now) : null;
  const breakOver = breakEndsAt !== null && remaining === 0;

  // One quiet chime when the break ends.
  const chimed = useRef(false);
  useEffect(() => {
    if (breakOver && !chimed.current) {
      chimed.current = true;
      if (soundEnabled) playSoftChime();
    }
    if (!breakOver) chimed.current = false;
  }, [breakOver, soundEnabled]);

  const begin = (r: Reward) => {
    startBreak(r.minutes);
    // The finished block was already credited; this just returns the timer to idle.
    if (focusStatus === "complete") stopFocus();
  };

  const skipAndContinue = () => {
    dismiss();
    if (focusStatus === "complete") extendFocus(5);
  };

  const backToFocus = (minutes?: FocusPreset) => {
    dismiss();
    if (focusStatus === "complete") stopFocus();
    if (minutes) startFocus(minutes);
  };

  if (rolling) {
    return (
      <div className="rise-in flex w-full max-w-md flex-col items-center gap-4 rounded-2xl border border-border bg-surface-raised px-6 py-6 text-center shadow-soft" aria-live="polite">
        <span className="eyebrow">Rolling your break</span>
        <div className={`flex min-w-[14rem] items-center justify-center gap-3 rounded-xl border border-dashed border-border bg-surface px-4 py-5 text-lg text-ink ${reduceMotion ? "" : "loot-shuffle"}`}>
          <Dices className="size-5 text-ink-faint" aria-hidden="true" />
          <span className="font-display">{reduceMotion ? "…" : SHUFFLE_CARDS[shuffleIdx]}</span>
        </div>
        <p className="text-xs text-ink-faint">Every drop is a real break. The surprise is the point.</p>
      </div>
    );
  }

  if (!current) return null;

  const rarityTone = current.rarity === "rare" ? "clay" : current.rarity === "uncommon" ? "mist" : "neutral";

  return (
    <div className={`${reduceMotion ? "" : "loot-reveal"} flex w-full max-w-md flex-col gap-4 rounded-2xl border border-border bg-surface-raised p-5 shadow-soft`} aria-live="polite">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2">
          <span className="inline-flex size-10 items-center justify-center rounded-xl bg-accent-soft text-ink">{KIND_ICON[current.kind]}</span>
          <div>
            <div className="eyebrow">You earned</div>
            <div className="font-display text-xl leading-tight text-ink">{current.title}</div>
          </div>
        </div>
        <Pill tone={rarityTone}>{RARITY_LABEL[current.rarity]}</Pill>
      </div>

      <p className="text-sm text-ink-muted">{current.detail}</p>

      {current.kind === "video" && current.video ? (
        <div className="overflow-hidden rounded-xl border border-border bg-ink">
          <div className="aspect-video">
            <iframe
              title={current.video.title}
              src={`https://www.youtube-nocookie.com/embed/${current.video.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1&iv_load_policy=3`}
              className="size-full"
              allow="autoplay; encrypted-media; picture-in-picture"
              allowFullScreen
            />
          </div>
          <div className="flex items-center justify-between gap-2 bg-surface px-3 py-2 text-xs text-ink-faint">
            <a href={`https://www.youtube.com/watch?v=${current.video.id}`} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 hover:text-ink">
              <ExternalLink className="size-3" /> open on YouTube
            </a>
            <button
              type="button"
              onClick={() => {
                if (current.video) removeVideo(current.video.id);
                dismiss();
                startBreak(3);
              }}
              className="hover:text-ink"
            >
              won&apos;t play? swap for a 3-min break
            </button>
          </div>
        </div>
      ) : null}

      {/* Break timer */}
      {breakEndsAt !== null ? (
        <div className="rounded-xl bg-surface px-4 py-3">
          {breakOver ? (
            <div className="flex flex-col gap-3">
              <p className="text-sm text-ink">Break&apos;s over. No rush — but the next block is right here.</p>
              <div className="flex flex-wrap gap-2">
                <Button variant="primary" size="sm" onClick={() => backToFocus(flowPreset)}>
                  <Play className="size-4" /> Start {flowPreset} min
                </Button>
                <Button variant="secondary" size="sm" onClick={() => backToFocus(5)}>
                  Just 5 minutes
                </Button>
                <Button variant="ghost" size="sm" onClick={() => extendBreak(3)}>
                  <Plus className="size-4" /> 3 more
                </Button>
                <Button variant="ghost" size="sm" onClick={() => backToFocus()}>
                  Done for now
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="eyebrow">Break</div>
                <div className="font-mono text-2xl tabular-nums text-ink">{remaining === null ? "--:--" : formatClock(remaining)}</div>
              </div>
              <div className="flex gap-1">
                <Button variant="ghost" size="sm" onClick={() => extendBreak(2)}>
                  <Plus className="size-4" /> 2
                </Button>
                <Button variant="secondary" size="sm" onClick={() => backToFocus(flowPreset)}>
                  I&apos;m ready
                </Button>
              </div>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-2">
          <Button variant="primary" onClick={() => begin(current)}>
            <Gift className="size-4" /> Take it ({current.minutes} min)
          </Button>
          <Button variant="ghost" onClick={skipAndContinue}>
            Skip, keep going (+5)
          </Button>
          <button type="button" onClick={() => backToFocus()} aria-label="Dismiss" className="ml-auto text-ink-faint hover:text-ink">
            <X className="size-4" />
          </button>
        </div>
      )}
    </div>
  );
}
