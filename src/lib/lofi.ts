/**
 * A tiny procedural lo-fi band: warm chord pad, soft kick/snare/hats with swing,
 * vinyl crackle, and a bassline that only enters when the sprint is nearly over.
 *
 * `setTension(0..1)` is the whole API for "dynamic audio tension": tempo rises
 * from 72 → 86 BPM, the filter opens a little, hats get busier, and the bass fades in.
 * No samples, no network; everything is synthesised at schedule time.
 */

const BASE_BPM = 72;
const TENSION_BPM = 14;
const SWING = 0.14;
const LOOKAHEAD_MS = 50;

// Dm9 → G13 → Cmaj9 → Am11 in a comfortable mid register (Hz).
const CHORDS: number[][] = [
  [146.83, 174.61, 220.0, 261.63, 329.63], // D F A C E
  [196.0, 246.94, 349.23, 329.63, 440.0], // G B F E A
  [130.81, 164.81, 196.0, 246.94, 293.66], // C E G B D
  [110.0, 130.81, 164.81, 196.0, 293.66], // A C E G D
];
// Bass roots and fifths, an octave or two down.
const BASS: Array<[root: number, fifth: number]> = [
  [73.42, 110.0],
  [49.0, 73.42],
  [65.41, 98.0],
  [55.0, 82.41],
];

export class LofiEngine {
  private ctx: AudioContext | null = null;
  private out: GainNode | null = null;
  private tone: BiquadFilterNode | null = null;
  private bassBus: GainNode | null = null;
  private hatBus: GainNode | null = null;
  private crackle: AudioBufferSourceNode | null = null;
  private noise: AudioBuffer | null = null;

  private timer: number | null = null;
  private nextTime = 0;
  private step = 0; // 8th-note steps, 0..7 per bar
  private bar = 0;
  private tension = 0;
  private running = false;

  /** Connects to `destination` (a gain the caller controls for volume). */
  start(ctx: AudioContext, destination: AudioNode) {
    if (this.running) return;
    this.ctx = ctx;
    this.running = true;

    this.tone = ctx.createBiquadFilter();
    this.tone.type = "lowpass";
    this.tone.frequency.value = 1800;
    this.tone.Q.value = 0.4;

    const comp = ctx.createDynamicsCompressor();
    comp.threshold.value = -22;
    comp.ratio.value = 3;
    comp.attack.value = 0.01;
    comp.release.value = 0.25;

    this.out = ctx.createGain();
    this.out.gain.value = 1;
    this.tone.connect(comp).connect(this.out).connect(destination);

    this.bassBus = ctx.createGain();
    this.bassBus.gain.value = 0;
    const bassLp = ctx.createBiquadFilter();
    bassLp.type = "lowpass";
    bassLp.frequency.value = 320;
    this.bassBus.connect(bassLp).connect(this.tone);

    this.hatBus = ctx.createGain();
    this.hatBus.gain.value = 0.5;
    this.hatBus.connect(this.tone);

    this.noise = makeNoise(ctx);
    this.startCrackle();

    this.nextTime = ctx.currentTime + 0.1;
    this.step = 0;
    this.bar = 0;
    this.timer = window.setInterval(() => this.schedule(), LOOKAHEAD_MS);
    this.applyTension();
  }

  stop() {
    if (this.timer !== null) window.clearInterval(this.timer);
    this.timer = null;
    try {
      this.crackle?.stop();
    } catch {
      // already stopped
    }
    this.crackle?.disconnect();
    this.crackle = null;
    this.out?.disconnect();
    this.out = null;
    this.tone = null;
    this.bassBus = null;
    this.hatBus = null;
    this.running = false;
  }

  /** 0 = calm study groove; 1 = final-stretch drive. */
  setTension(t: number) {
    this.tension = Math.min(1, Math.max(0, t));
    this.applyTension();
  }

  private applyTension() {
    if (!this.ctx || !this.tone || !this.bassBus || !this.hatBus) return;
    const now = this.ctx.currentTime;
    const t = this.tension;
    // Bass is the clearest "something changed" cue; ease it in over a few seconds.
    this.bassBus.gain.setTargetAtTime(0.9 * easeIn(t), now, 1.2);
    this.tone.frequency.setTargetAtTime(1800 + 900 * t, now, 1.5);
    this.hatBus.gain.setTargetAtTime(0.5 + 0.3 * t, now, 1.0);
  }

  private get bpm() {
    return BASE_BPM + TENSION_BPM * this.tension;
  }

  private schedule() {
    if (!this.ctx) return;
    const ahead = typeof document !== "undefined" && document.hidden ? 1.6 : 0.25;
    while (this.nextTime < this.ctx.currentTime + ahead) {
      this.playStep(this.step, this.bar, this.nextTime);
      const eighth = 60 / this.bpm / 2;
      // Swing: push the off-beat 8ths late.
      const swingShift = this.step % 2 === 0 ? SWING * eighth : -SWING * eighth;
      this.nextTime += eighth + swingShift;
      this.step = (this.step + 1) % 8;
      if (this.step === 0) this.bar++;
    }
  }

  private playStep(step: number, bar: number, t: number) {
    const chord = CHORDS[bar % CHORDS.length];
    const [root, fifth] = BASS[bar % BASS.length];
    const eighth = 60 / this.bpm / 2;

    if (step === 0) this.pad(chord, t, eighth * 8);
    if (step === 0 || step === 5) this.pluck(chord[3 + (bar % 2)], t);
    if (step === 3 && bar % 4 === 3) this.pluck(chord[4], t + eighth * 0.5);

    // Drums.
    if (step === 0 || step === 4) this.kick(t);
    if (step === 7 && bar % 2 === 1) this.kick(t + eighth * 0.5, 0.5);
    if (step === 2 || step === 6) this.snare(t);
    this.hat(t, step % 2 === 0 ? 0.5 : 0.28);
    if (this.tension > 0.5 && (step === 5 || step === 7)) this.hat(t + eighth / 2, 0.18);

    // Bass (bus gain is 0 when calm, so this is silent until the final stretch).
    if (step === 0) this.bass(root, t, eighth * 1.6);
    if (step === 3) this.bass(root, t, eighth * 0.9);
    if (step === 5) this.bass(fifth, t, eighth * 1.4);
    if (this.tension > 0.6 && step === 7) this.bass(root * 2, t, eighth * 0.6);
  }

  /* ---------- Voices ---------- */

  private pad(freqs: number[], t: number, dur: number) {
    if (!this.ctx || !this.tone) return;
    const ctx = this.ctx;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 900;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.09, t + 0.5);
    env.gain.setValueAtTime(0.09, t + dur - 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur + 0.2);
    lp.connect(env).connect(this.tone);
    for (const f of freqs) {
      const a = ctx.createOscillator();
      a.type = "triangle";
      a.frequency.value = f;
      a.detune.value = -5;
      const b = ctx.createOscillator();
      b.type = "sine";
      b.frequency.value = f;
      b.detune.value = 6;
      // Slow vibrato = tape wow.
      const lfo = ctx.createOscillator();
      lfo.frequency.value = 0.35 + Math.random() * 0.2;
      const lfoGain = ctx.createGain();
      lfoGain.gain.value = 2.2;
      lfo.connect(lfoGain);
      lfoGain.connect(a.detune);
      lfoGain.connect(b.detune);
      a.connect(lp);
      b.connect(lp);
      a.start(t);
      b.start(t);
      lfo.start(t);
      a.stop(t + dur + 0.3);
      b.stop(t + dur + 0.3);
      lfo.stop(t + dur + 0.3);
    }
  }

  private pluck(freq: number, t: number) {
    if (!this.ctx || !this.tone) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq * 2, t);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.11, t + 0.01);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
    osc.connect(env).connect(this.tone);
    osc.start(t);
    osc.stop(t + 1);
  }

  private kick(t: number, vel = 1) {
    if (!this.ctx || !this.tone) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = "sine";
    osc.frequency.setValueAtTime(140, t);
    osc.frequency.exponentialRampToValueAtTime(48, t + 0.12);
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.55 * vel, t + 0.005);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
    osc.connect(env).connect(this.tone);
    osc.start(t);
    osc.stop(t + 0.3);
  }

  private snare(t: number) {
    if (!this.ctx || !this.tone || !this.noise) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 1700;
    bp.Q.value = 0.8;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.22, t + 0.004);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.14);
    src.connect(bp).connect(env).connect(this.tone);
    src.start(t, Math.random() * 2);
    src.stop(t + 0.16);
    // A soft body under the noise.
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(190, t);
    const e2 = ctx.createGain();
    e2.gain.setValueAtTime(0.12, t);
    e2.gain.exponentialRampToValueAtTime(0.0001, t + 0.1);
    osc.connect(e2).connect(this.tone);
    osc.start(t);
    osc.stop(t + 0.12);
  }

  private hat(t: number, vel: number) {
    if (!this.ctx || !this.hatBus || !this.noise) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = this.noise;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 7000;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.16 * vel, t + 0.002);
    env.gain.exponentialRampToValueAtTime(0.0001, t + 0.045);
    src.connect(hp).connect(env).connect(this.hatBus);
    src.start(t, Math.random() * 2);
    src.stop(t + 0.06);
  }

  private bass(freq: number, t: number, dur: number) {
    if (!this.ctx || !this.bassBus) return;
    const ctx = this.ctx;
    const osc = ctx.createOscillator();
    osc.type = "triangle";
    osc.frequency.value = freq;
    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, t);
    env.gain.exponentialRampToValueAtTime(0.5, t + 0.02);
    env.gain.setValueAtTime(0.5, t + dur * 0.6);
    env.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    osc.connect(env).connect(this.bassBus);
    osc.start(t);
    osc.stop(t + dur + 0.05);
  }

  private startCrackle() {
    if (!this.ctx || !this.tone) return;
    const ctx = this.ctx;
    const seconds = 4;
    const buf = ctx.createBuffer(1, ctx.sampleRate * seconds, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) {
      if (Math.random() < 0.0006) d[i] = (Math.random() * 2 - 1) * (0.3 + Math.random() * 0.7);
      else d[i] = (Math.random() * 2 - 1) * 0.004; // faint hiss
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = "highpass";
    hp.frequency.value = 1800;
    const g = ctx.createGain();
    g.gain.value = 0.35;
    src.connect(hp).connect(g).connect(this.tone);
    src.start();
    this.crackle = src;
  }
}

function makeNoise(ctx: AudioContext): AudioBuffer {
  const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

function easeIn(t: number) {
  return t * t;
}
