import type { SoundscapeKind } from "@/store/useSettingsStore";
import { LofiEngine } from "./lofi";

/**
 * Procedural ambient audio. Everything is synthesised — no audio files to download,
 * works offline.
 *
 * Noise kinds loop a 6-second buffer (negligible CPU). "lofi" runs a small scheduled
 * band. `setTension(0..1)` drives the final-stretch pacing: lo-fi speeds up and gains
 * a bassline; noise kinds get a slow tremolo pulse at the same rising tempo.
 */
class SoundscapeEngine {
  private ctx: AudioContext | null = null;
  private source: AudioBufferSourceNode | null = null;
  private gain: GainNode | null = null;
  private pulse: GainNode | null = null;
  private lfo: OscillatorNode | null = null;
  private lfoDepth: GainNode | null = null;
  private lofi: LofiEngine | null = null;
  private kind: SoundscapeKind = "off";
  private tension = 0;
  private pulseEnabled = true;

  async play(kind: SoundscapeKind, volume: number) {
    if (kind === "off") return this.stop();
    if (typeof window === "undefined") return;

    if (!this.ctx) this.ctx = new AudioContext();
    if (this.ctx.state === "suspended") await this.ctx.resume();

    if (!this.gain) {
      this.gain = this.ctx.createGain();
      this.gain.connect(this.ctx.destination);
    }
    this.setVolume(volume);

    if (this.kind !== kind || (!this.source && !this.lofi)) {
      this.stopSource();
      if (kind === "lofi") {
        this.lofi = new LofiEngine();
        this.lofi.start(this.ctx, this.gain);
        this.lofi.setTension(this.tension);
      } else {
        this.startNoise(kind);
      }
      this.kind = kind;
    }
  }

  private startNoise(kind: SoundscapeKind) {
    if (!this.ctx || !this.gain) return;
    const ctx = this.ctx;
    const src = ctx.createBufferSource();
    src.buffer = buildBuffer(ctx, kind);
    src.loop = true;
    let last: AudioNode = src;
    if (kind === "rain") {
      const lp = ctx.createBiquadFilter();
      lp.type = "lowpass";
      lp.frequency.value = 1400;
      const hp = ctx.createBiquadFilter();
      hp.type = "highpass";
      hp.frequency.value = 300;
      src.connect(lp).connect(hp);
      last = hp;
    }
    // Tremolo stage: gain = 1 - depth/2 + LFO * depth/2. Depth 0 when calm.
    this.pulse = ctx.createGain();
    this.pulse.gain.value = 1;
    this.lfo = ctx.createOscillator();
    this.lfo.type = "sine";
    this.lfo.frequency.value = 72 / 60;
    this.lfoDepth = ctx.createGain();
    this.lfoDepth.gain.value = 0;
    this.lfo.connect(this.lfoDepth).connect(this.pulse.gain);
    this.lfo.start();
    last.connect(this.pulse).connect(this.gain);
    src.start();
    this.source = src;
    this.applyTension();
  }

  setVolume(volume: number) {
    if (!this.gain || !this.ctx) return;
    // Perceptual curve so the slider feels linear.
    const v = Math.pow(Math.min(1, Math.max(0, volume)), 2) * 0.6;
    this.gain.gain.setTargetAtTime(v, this.ctx.currentTime, 0.05);
  }

  /** 0 = steady; 1 = final stretch. Safe to call every tick. */
  setTension(t: number, enabled = true) {
    const next = Math.min(1, Math.max(0, t));
    if (next === this.tension && enabled === this.pulseEnabled) return;
    this.tension = next;
    this.pulseEnabled = enabled;
    this.applyTension();
  }

  private applyTension() {
    const t = this.pulseEnabled ? this.tension : 0;
    this.lofi?.setTension(t);
    if (this.ctx && this.pulse && this.lfo && this.lfoDepth) {
      const now = this.ctx.currentTime;
      const bpm = 72 + 14 * t;
      const depth = 0.22 * t; // peak-to-peak swing in gain
      this.lfo.frequency.setTargetAtTime(bpm / 60, now, 0.8);
      this.lfoDepth.gain.setTargetAtTime(depth / 2, now, 1.0);
      this.pulse.gain.setTargetAtTime(1 - depth / 2, now, 1.0);
    }
  }

  stop() {
    this.stopSource();
    this.kind = "off";
  }

  private stopSource() {
    try {
      this.source?.stop();
      this.lfo?.stop();
    } catch {
      // already stopped
    }
    this.source?.disconnect();
    this.pulse?.disconnect();
    this.lfo?.disconnect();
    this.lfoDepth?.disconnect();
    this.source = null;
    this.pulse = null;
    this.lfo = null;
    this.lfoDepth = null;
    this.lofi?.stop();
    this.lofi = null;
  }
}

function buildBuffer(ctx: AudioContext, kind: SoundscapeKind): AudioBuffer {
  const seconds = 6;
  const rate = ctx.sampleRate;
  const buffer = ctx.createBuffer(2, rate * seconds, rate);

  for (let ch = 0; ch < 2; ch++) {
    const data = buffer.getChannelData(ch);
    let brown = 0;
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;

    for (let i = 0; i < data.length; i++) {
      const white = Math.random() * 2 - 1;
      switch (kind) {
        case "white":
          data[i] = white * 0.5;
          break;
        case "brown":
          brown = (brown + 0.02 * white) / 1.02;
          data[i] = brown * 3.5;
          break;
        case "pink": {
          // Paul Kellet's refined pink-noise filter.
          b0 = 0.99886 * b0 + white * 0.0555179;
          b1 = 0.99332 * b1 + white * 0.0750759;
          b2 = 0.969 * b2 + white * 0.153852;
          b3 = 0.8665 * b3 + white * 0.3104856;
          b4 = 0.55 * b4 + white * 0.5329522;
          b5 = -0.7616 * b5 - white * 0.016898;
          data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
          b6 = white * 0.115926;
          break;
        }
        case "rain": {
          // White noise with slow random amplitude swells reads as rainfall after filtering.
          const t = i / rate;
          const swell = 0.75 + 0.25 * Math.sin(t * 0.9 + ch) * Math.sin(t * 2.3);
          data[i] = white * swell * 0.6;
          break;
        }
        default:
          data[i] = 0;
      }
    }
  }
  return buffer;
}

export const soundscape = new SoundscapeEngine();

/** Final-stretch window: tension rises from 0 to 1 across the last three minutes. */
export const TENSION_WINDOW_MS = 3 * 60_000;

export function tensionFor(remainingMs: number, durationMs: number): number {
  // Blocks shorter than the window would be "tense" from the start; scale the window down.
  const window = Math.min(TENSION_WINDOW_MS, durationMs * 0.4);
  if (window <= 0 || remainingMs >= window) return 0;
  return Math.min(1, Math.max(0, 1 - remainingMs / window));
}

export const SOUNDSCAPE_OPTIONS: Array<{ value: SoundscapeKind; label: string; hint: string }> = [
  { value: "off", label: "Off", hint: "Silence" },
  { value: "lofi", label: "Lo-fi", hint: "A slow groove that quietly picks up near the end" },
  { value: "brown", label: "Brown", hint: "Deep, steady rumble" },
  { value: "pink", label: "Pink", hint: "Softer than white" },
  { value: "rain", label: "Rain", hint: "Gentle downpour" },
  { value: "white", label: "White", hint: "Classic static" },
];
