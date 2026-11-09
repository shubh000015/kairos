import type { DopamineItem } from "@/store/useRoutineStore";

/**
 * Variable-reward "loot drops" for the end of a focus sprint.
 *
 * Dopamine rises in anticipation of an *uncertain* reward, so the break you get
 * is rolled, not chosen. Every outcome is still a real, bounded break — nothing
 * here opens an infinite feed.
 */

export type RewardKind = "break" | "move" | "video" | "menu" | "wander";
export type Rarity = "common" | "uncommon" | "rare";

export interface RewardVideo {
  id: string;
  title: string;
  minutes: number;
  /** User-added videos can be removed; curated ones can be hidden. */
  custom?: boolean;
}

export interface Reward {
  kind: RewardKind;
  rarity: Rarity;
  title: string;
  detail: string;
  /** Length of the break this reward grants. */
  minutes: number;
  video?: RewardVideo;
}

/** Short, self-ending, widely known. A novelty hit that stops on its own. */
export const CURATED_VIDEOS: RewardVideo[] = [
  { id: "LXb3EKWsInQ", title: "Costa Rica in 4K — five minutes of jungle and sea", minutes: 5 },
  { id: "ZbZSe6N_BXs", title: "Pharrell — Happy", minutes: 4 },
  { id: "OPf0YbXqDm0", title: "Uptown Funk", minutes: 5 },
  { id: "y6120QOlsfU", title: "Darude — Sandstorm", minutes: 4 },
  { id: "60ItHLz5WEA", title: "Alan Walker — Faded", minutes: 4 },
  { id: "hT_nvWreIhg", title: "OneRepublic — Counting Stars", minutes: 5 },
  { id: "RgKAFK5djSk", title: "See You Again", minutes: 4 },
  { id: "9bZkp7q19f0", title: "Gangnam Style (yes, really)", minutes: 4 },
  { id: "fJ9rUzIMcZQ", title: "Bohemian Rhapsody", minutes: 6 },
  { id: "h6fcK_fRYaI", title: "Kurzgesagt — The Egg", minutes: 8 },
  { id: "dQw4w9WgXcQ", title: "A classic. You know the one.", minutes: 4 },
];

const MOVES: Array<Pick<Reward, "title" | "detail" | "minutes">> = [
  { title: "15 push-ups", detail: "Knees down counts. Floor, wall, desk edge — any surface.", minutes: 3 },
  { title: "20 squats", detail: "Slow on the way down. Your legs have been holding a chair for a while.", minutes: 3 },
  { title: "Walk to the farthest window and back, twice", detail: "Look at something more than 20 metres away while you're there.", minutes: 4 },
  { title: "90-second stretch", detail: "Arms over head, then fold forward and hang. Breathe out longer than in.", minutes: 2 },
  { title: "One song, moving the whole time", detail: "Dance, pace, shadow-box. Volume up. Nobody's watching.", minutes: 4 },
  { title: "Shake it out", detail: "Hands, arms, shoulders, legs. 60 seconds of looking ridiculous resets the nervous system.", minutes: 2 },
  { title: "Stairs, up and down, three times", detail: "No stairs? Thirty high-knees on the spot.", minutes: 3 },
];

interface RollInput {
  menu: DopamineItem[];
  videos: RewardVideo[];
  allowVideos: boolean;
  rand?: () => number;
}

interface Weighted {
  weight: number;
  make: () => Reward;
}

/** Roll a reward. Weights lean toward movement and short breaks; videos are the rare drop. */
export function rollReward({ menu, videos, allowVideos, rand = Math.random }: RollInput): Reward {
  const pick = <T,>(arr: T[]) => arr[Math.floor(rand() * arr.length)];
  const menuPool = menu.filter((m) => m.minutes <= 10);

  const table: Weighted[] = [
    {
      weight: 24,
      make: () => ({ kind: "break", rarity: "common", title: "3-minute breather", detail: "Stand up, drink water, look out a window. Back before the kettle boils.", minutes: 3 }),
    },
    {
      weight: 17,
      make: () => ({ kind: "break", rarity: "uncommon", title: "7-minute break", detail: "Enough for tea, a snack, or lying on the floor doing nothing at all.", minutes: 7 }),
    },
    {
      weight: 27,
      make: () => {
        const m = pick(MOVES);
        return { kind: "move", rarity: "common", ...m };
      },
    },
    {
      weight: 4,
      make: () => ({ kind: "wander", rarity: "rare", title: "10-minute wander", detail: "Outside if you can. No phone, no destination. Rare drop — take it.", minutes: 10 }),
    },
  ];
  if (menuPool.length) {
    table.push({
      weight: 10,
      make: () => {
        const m = pick(menuPool);
        return { kind: "menu", rarity: "uncommon", title: m.text, detail: "From your own dopamine menu — past you chose well.", minutes: m.minutes };
      },
    });
  }
  if (allowVideos && videos.length) {
    table.push({
      weight: 18,
      make: () => {
        const v = pick(videos);
        return { kind: "video", rarity: "rare", title: v.title, detail: "Plays right here and ends on its own. No feed, no autoplay-next.", minutes: Math.max(3, v.minutes + 1), video: v };
      },
    });
  }

  const total = table.reduce((a, t) => a + t.weight, 0);
  let r = rand() * total;
  for (const t of table) {
    r -= t.weight;
    if (r <= 0) return t.make();
  }
  return table[0].make();
}

export const RARITY_LABEL: Record<Rarity, string> = {
  common: "Common",
  uncommon: "Uncommon",
  rare: "Rare drop",
};
