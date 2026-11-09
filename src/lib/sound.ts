/**
 * A quiet two-note chime built with the Web Audio API.
 * Deliberately soft: low gain, sine waves, slow release. No alarm sounds.
 */
export function playSoftChime(): void {
  if (typeof window === "undefined") return;
  const Ctx = window.AudioContext;
  if (!Ctx) return;

  const ctx = new Ctx();
  const master = ctx.createGain();
  master.gain.value = 0.08;
  master.connect(ctx.destination);

  const notes: Array<[freq: number, at: number]> = [
    [523.25, 0], // C5
    [659.25, 0.28], // E5
  ];

  for (const [freq, at] of notes) {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "sine";
    osc.frequency.value = freq;

    const start = ctx.currentTime + at;
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(1, start + 0.04);
    env.gain.exponentialRampToValueAtTime(0.001, start + 1.4);

    osc.connect(env).connect(master);
    osc.start(start);
    osc.stop(start + 1.5);
  }

  window.setTimeout(() => void ctx.close(), 2200);
}

/** A single short, soft blip: a section just unlocked. Quieter than the chime. */
export function playUnlockTick(): void {
  if (typeof window === "undefined" || !window.AudioContext) return;
  const ctx = new window.AudioContext();
  const osc = ctx.createOscillator();
  const env = ctx.createGain();
  osc.type = "sine";
  osc.frequency.setValueAtTime(740, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(988, ctx.currentTime + 0.09);
  env.gain.setValueAtTime(0, ctx.currentTime);
  env.gain.linearRampToValueAtTime(0.06, ctx.currentTime + 0.015);
  env.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3);
  osc.connect(env).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + 0.32);
  window.setTimeout(() => void ctx.close(), 600);
}

/**
 * Completion thud: something with physical weight. A sub-bass drop, a short
 * felt-mallet "thwack", and a warm confirmation tone riding on top.
 */
export function playCompletionThud(): void {
  if (typeof window === "undefined" || !window.AudioContext) return;
  const ctx = new window.AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0.9;
  const comp = ctx.createDynamicsCompressor();
  comp.threshold.value = -18;
  comp.ratio.value = 4;
  master.connect(comp).connect(ctx.destination);
  const t = ctx.currentTime;

  // Sub drop.
  const sub = ctx.createOscillator();
  sub.type = "sine";
  sub.frequency.setValueAtTime(130, t);
  sub.frequency.exponentialRampToValueAtTime(38, t + 0.32);
  const subEnv = ctx.createGain();
  subEnv.gain.setValueAtTime(0.0001, t);
  subEnv.gain.exponentialRampToValueAtTime(0.7, t + 0.012);
  subEnv.gain.exponentialRampToValueAtTime(0.0001, t + 0.75);
  sub.connect(subEnv).connect(master);
  sub.start(t);
  sub.stop(t + 0.8);

  // Mallet transient: short filtered noise.
  const len = Math.floor(ctx.sampleRate * 0.12);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len) ** 2;
  const noise = ctx.createBufferSource();
  noise.buffer = buf;
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 900;
  const nEnv = ctx.createGain();
  nEnv.gain.value = 0.35;
  noise.connect(lp).connect(nEnv).connect(master);
  noise.start(t);

  // Warm confirmation: a fifth, slightly late, so it reads as "and it's done".
  for (const [freq, at] of [
    [261.63, 0.06],
    [392.0, 0.1],
  ] as const) {
    const o = ctx.createOscillator();
    o.type = "triangle";
    o.frequency.value = freq;
    const e = ctx.createGain();
    e.gain.setValueAtTime(0.0001, t + at);
    e.gain.exponentialRampToValueAtTime(0.12, t + at + 0.02);
    e.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.9);
    o.connect(e).connect(master);
    o.start(t + at);
    o.stop(t + at + 1);
  }

  window.setTimeout(() => void ctx.close(), 1600);
}

/** Rising four-note arpeggio for a reward reveal. Still soft — a wind chime, not a jackpot. */
export function playRewardChime(): void {
  if (typeof window === "undefined" || !window.AudioContext) return;
  const ctx = new window.AudioContext();
  const master = ctx.createGain();
  master.gain.value = 0.07;
  master.connect(ctx.destination);
  const notes = [523.25, 659.25, 783.99, 1046.5]; // C5 E5 G5 C6
  notes.forEach((freq, i) => {
    const osc = ctx.createOscillator();
    const env = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const start = ctx.currentTime + i * 0.11;
    env.gain.setValueAtTime(0, start);
    env.gain.linearRampToValueAtTime(1, start + 0.03);
    env.gain.exponentialRampToValueAtTime(0.001, start + 1.1);
    osc.connect(env).connect(master);
    osc.start(start);
    osc.stop(start + 1.2);
  });
  window.setTimeout(() => void ctx.close(), 2000);
}
