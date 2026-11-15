/**
 * The quiz's background music, played with the Web Audio API (no sound files): one calm tune for the games menu and a
 * faster, brighter one while a play is running. The play tune speeds up as the question's clock runs low (`setMusicSpeed`).
 * Never throws and never blocks: with no audio the game is silent but works.
 */
/** 'menu' or a section id (football, fawazeer, general, history, cinema): each section has its own tune. */
export type MusicTheme = string;

interface Tune {
  bpm: number;
  wave: OscillatorType;
  /** Semitones above A3 (220 Hz) for each 8th note; null = a rest. */
  lead: (number | null)[];
  bass: (number | null)[];
  gain: number;
}

const TUNES: Record<string, Tune> = {
  // Relaxed major pentatonic arpeggios.
  menu: {
    bpm: 84,
    wave: 'sine',
    gain: 0.06,
    lead: [12, 16, 19, 16, 14, 19, 21, 19, 12, 16, 19, 24, 21, 19, 16, 14, null, 16, 19, 16, 14, 12, 14, null],
    bass: [0, null, null, null, 7, null, null, null, 5, null, null, null, 7, null, null, null, 0, null, null, null, 7, null, null, null],
  },
  // Football: a driving stadium groove in minor.
  football: {
    bpm: 132,
    wave: 'square',
    gain: 0.035,
    lead: [12, null, 15, 19, 17, null, 15, 12, 10, null, 12, 15, 19, 17, 15, null, 12, 15, 19, 24, 22, 19, 17, 15],
    bass: [0, 0, null, 0, 0, null, 3, 3, 5, 5, null, 5, 3, null, 3, null, 0, 0, null, 0, 0, null, 7, 7],
  },
  // Riddles: a playful, bouncy major tune with jumps.
  fawazeer: {
    bpm: 112,
    wave: 'triangle',
    gain: 0.08,
    lead: [16, null, 19, null, 24, 19, null, 16, 14, null, 17, null, 21, 17, null, 14, 16, 19, 24, 28, 26, 24, 21, 19],
    bass: [0, null, 7, null, 0, null, 7, null, 5, null, 12, null, 5, null, 12, null, 0, null, 7, null, 7, null, 0, null],
  },
  // General knowledge: bright, curious and steady.
  general: {
    bpm: 120,
    wave: 'sawtooth',
    gain: 0.025,
    lead: [12, 14, 16, 19, 16, 14, 12, null, 14, 16, 19, 21, 19, 16, 14, null, 16, 19, 21, 24, 21, 19, 16, 14],
    bass: [0, null, 0, null, 7, null, 7, null, 5, null, 5, null, 7, null, 7, null, 0, null, 0, null, 7, null, 5, null],
  },
  // History: slow, grand and modal (dorian).
  history: {
    bpm: 80,
    wave: 'sine',
    gain: 0.07,
    lead: [12, null, 14, null, 15, null, 19, null, 17, null, 15, null, 14, null, 12, null, 10, null, 12, null, 14, null, 15, null],
    bass: [0, null, null, null, 0, null, null, null, 10, null, null, null, 7, null, null, null, 5, null, null, null, 7, null, null, null],
  },
  // Cinema: a dramatic, smoky minor theme with a chromatic turn.
  cinema: {
    bpm: 98,
    wave: 'triangle',
    gain: 0.075,
    lead: [12, null, 15, null, 19, 18, 17, null, 15, null, 14, null, 12, 11, 10, null, 12, null, 15, 17, 19, null, 22, null],
    bass: [0, null, null, 7, null, null, 0, null, null, 3, null, null, 5, null, null, 7, null, null, 0, null, null, 7, null, null],
  },
};


let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let timer: ReturnType<typeof setInterval> | null = null;
let theme: MusicTheme | null = null;
let step = 0;
let nextAt = 0;
let speed = 1;

const freq = (semi: number) => 220 * 2 ** (semi / 12);

function note(c: AudioContext, out: AudioNode, wave: OscillatorType, f: number, at: number, len: number, gain: number) {
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = wave;
  osc.frequency.value = f;
  g.gain.setValueAtTime(0.0001, at);
  g.gain.exponentialRampToValueAtTime(gain, at + 0.02);
  g.gain.exponentialRampToValueAtTime(0.0001, at + len);
  osc.connect(g).connect(out);
  osc.start(at);
  osc.stop(at + len + 0.05);
}

function schedule() {
  if (!ctx || !master || !theme) return;
  const tune = TUNES[theme] ?? TUNES.football;
  // Keep ~0.25 s of notes queued ahead of the clock.
  while (nextAt < ctx.currentTime + 0.25) {
    const i = step % tune.lead.length;
    const eighth = 60 / (tune.bpm * speed) / 2;
    const l = tune.lead[i];
    const b = tune.bass[i % tune.bass.length];
    if (l != null) note(ctx, master, tune.wave, freq(l), nextAt, eighth * 0.9, tune.gain);
    if (b != null) note(ctx, master, 'triangle', freq(b - 12), nextAt, eighth * 1.6, tune.gain * 1.6);
    nextAt += eighth;
    step++;
  }
}

/** Starts (or switches to) a tune. Calling it again with the same tune does nothing. */
export function startMusic(next: MusicTheme): void {
  if (theme === next && timer) return;
  try {
    ctx ??= new (window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext)();
    if (ctx.state === 'suspended') void ctx.resume();
    if (timer) clearInterval(timer);
    // A fresh output each time, so the previous tune fades out on its own.
    stopMaster();
    master = ctx.createGain();
    master.gain.value = 1;
    master.connect(ctx.destination);
    theme = next;
    step = 0;
    speed = 1;
    nextAt = ctx.currentTime + 0.05;
    timer = setInterval(schedule, 80);
    schedule();
  } catch {
    /* no audio */
  }
}

/** Fades what is already queued out quickly instead of cutting it. */
function stopMaster() {
  if (!ctx || !master) return;
  const old = master;
  master = null;
  try {
    old.gain.setTargetAtTime(0.0001, ctx.currentTime, 0.05);
  } catch { /* already closed */ }
  setTimeout(() => { try { old.disconnect(); } catch { /* gone */ } }, 600);
}

export function stopMusic(): void {
  if (timer) clearInterval(timer);
  timer = null;
  theme = null;
  stopMaster();
}

/** 1 = normal, 1.5 = a half faster. Used while the question's clock runs low. */
export function setMusicSpeed(rate: number): void {
  speed = Math.max(0.5, Math.min(2, rate));
}
