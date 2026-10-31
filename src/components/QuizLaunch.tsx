import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { DeilarLogo } from './DeilarLogo';

/** Seconds each light of the start lights stays lit, like the start of a race. */
export const LIGHT_SECONDS = 0.85;
/** How long the logo scene lasts before the quiz begins. */
export const LOGO_SECONDS = 3;

type Phase = 'lights' | 'go' | 'logo';

/** Race-start beeps and the logo fanfare, made with WebAudio so no sound file is needed. */
function useLaunchSound(enabled: boolean) {
  const ctx = useRef<AudioContext | null>(null);

  const tone = (freq: number, at: number, length: number, type: OscillatorType = 'square', volume = 0.16, to?: number) => {
    try {
      ctx.current ??= new (window.AudioContext || (window as any).webkitAudioContext)();
      const c = ctx.current;
      const start = c.currentTime + at;
      const osc = c.createOscillator();
      const gain = c.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, start);
      if (to) osc.frequency.exponentialRampToValueAtTime(to, start + length);
      gain.gain.setValueAtTime(volume, start);
      gain.gain.exponentialRampToValueAtTime(0.001, start + length);
      osc.connect(gain).connect(c.destination);
      osc.start(start);
      osc.stop(start + length + 0.02);
    } catch {
      /* no audio: the countdown still plays */
    }
  };

  return {
    /** One red light: a short low beep. */
    light: () => enabled && tone(440, 0, 0.28),
    /** Green: the long high beep that starts the race. */
    go: () => enabled && (tone(880, 0, 0.7), tone(1320, 0, 0.7, 'sawtooth', 0.06)),
    /** The logo coming in: a rising sweep, then a sparkle. */
    logo: () => {
      if (!enabled) return;
      tone(180, 0, 0.9, 'sawtooth', 0.1, 900);
      [1047, 1319, 1568, 2093].forEach((f, i) => tone(f, 0.55 + i * 0.13, 0.35, 'triangle', 0.12));
    },
  };
}

const Stars: React.FC = () => {
  const stars = useMemo(
    () =>
      Array.from({ length: 36 }, (_, i) => {
        const angle = (i / 36) * Math.PI * 2 + (i % 3) * 0.15;
        const far = 120 + (i % 5) * 38;
        return { id: i, x: Math.cos(angle) * far, y: Math.sin(angle) * far * 0.8, size: 12 + (i % 4) * 7, delay: 0.25 + (i % 9) * 0.07, char: i % 4 === 0 ? '✨' : '⭐' };
      }),
    [],
  );
  return (
    <>
      {stars.map((s) => (
        <motion.span
          key={s.id}
          aria-hidden
          className="absolute left-1/2 top-1/2 pointer-events-none"
          style={{ fontSize: s.size }}
          initial={{ x: 0, y: 0, opacity: 0, scale: 0, rotate: 0 }}
          animate={{ x: s.x, y: s.y, opacity: [0, 1, 1, 0.5, 1], scale: [0, 1.4, 1, 1.2, 1], rotate: 360 }}
          transition={{ duration: 1.6, delay: s.delay, ease: 'easeOut' }}
        >
          {s.char}
        </motion.span>
      ))}
    </>
  );
};

/**
 * The scene before a quiz play: three start lights light up one by one with a race-start beep (1, 2, 3), a green GO,
 * then the Deilar logo and name arrive in a burst of stars. When it ends, `onDone` starts the questions.
 */
export const QuizLaunch: React.FC<{ sound: boolean; onDone: () => void }> = ({ sound, onDone }) => {
  const [phase, setPhase] = useState<Phase>('lights');
  const [lit, setLit] = useState(0);
  const sfx = useLaunchSound(sound);
  const done = useRef(onDone);
  done.current = onDone;
  const sfxRef = useRef(sfx);
  sfxRef.current = sfx;

  useEffect(() => {
    const timers: ReturnType<typeof setTimeout>[] = [];
    const at = (ms: number, fn: () => void) => timers.push(setTimeout(fn, ms));
    const step = LIGHT_SECONDS * 1000;
    [1, 2, 3].forEach((n, i) => at(i * step, () => { setLit(n); sfxRef.current.light(); }));
    at(3 * step, () => { setPhase('go'); sfxRef.current.go(); });
    at(3 * step + 700, () => { setPhase('logo'); sfxRef.current.logo(); });
    at(3 * step + 700 + LOGO_SECONDS * 1000, () => done.current());
    return () => timers.forEach(clearTimeout);
  }, []);

  return (
    <motion.div
      role="dialog"
      aria-label="بداية التحدي"
      dir="rtl"
      className="fixed inset-0 z-[300] flex items-center justify-center overflow-hidden bg-[#12041f]"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
    >
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_45%,#5b1a6e_0%,#1e0833_55%,#0b0215_100%)]" />

      <AnimatePresence>
        {phase !== 'logo' && (
          <motion.div key="lights" className="relative flex flex-col items-center gap-8" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <div className="flex gap-4 rounded-[2rem] bg-black/60 px-7 py-6 border-4 border-slate-700 shadow-2xl">
              {[1, 2, 3].map((n) => {
                const on = phase === 'go' ? true : lit >= n;
                const green = phase === 'go';
                return (
                  <motion.div
                    key={n}
                    animate={{ scale: on ? [1, 1.18, 1] : 1 }}
                    transition={{ duration: 0.3 }}
                    className={`h-16 w-16 rounded-full border-4 border-black/50 ${on ? (green ? 'bg-emerald-400 shadow-[0_0_40px_12px_rgba(52,211,153,0.8)]' : 'bg-red-500 shadow-[0_0_36px_10px_rgba(239,68,68,0.8)]') : 'bg-slate-800'}`}
                  />
                );
              })}
            </div>
            <div className="h-24">
              <motion.div
                key={phase === 'go' ? 'go' : lit}
                initial={{ scale: 2.4, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 260, damping: 18 }}
                className={`text-8xl font-black leading-none ${phase === 'go' ? 'text-emerald-300' : 'text-white'}`}
                style={{ textShadow: '0 0 30px rgba(255,255,255,0.5)' }}
              >
                {phase === 'go' ? 'انطلق!' : lit || ''}
              </motion.div>
            </div>
          </motion.div>
        )}

        {phase === 'logo' && (
          <motion.div key="logo" className="relative flex flex-col items-center" initial={{ opacity: 1 }}>
            <motion.div className="absolute inset-0 bg-white" initial={{ opacity: 0.95 }} animate={{ opacity: 0 }} transition={{ duration: 0.6 }} />
            <motion.div
              className="absolute left-1/2 top-1/2 h-[140vmax] w-[140vmax] -translate-x-1/2 -translate-y-1/2 opacity-30"
              style={{ background: 'repeating-conic-gradient(from 0deg, #fde68a 0deg 6deg, transparent 6deg 18deg)' }}
              initial={{ rotate: 0, scale: 0.2 }}
              animate={{ rotate: 90, scale: 1 }}
              transition={{ duration: LOGO_SECONDS, ease: 'easeOut' }}
            />
            <div className="relative flex items-center justify-center gap-4 px-6">
              <Stars />
              <motion.div
                initial={{ scale: 0, rotate: -200, opacity: 0 }}
                animate={{ scale: [0, 1.35, 1], rotate: [-200, 12, 0], opacity: 1 }}
                transition={{ duration: 1, ease: 'easeOut' }}
                className="rounded-3xl bg-white/95 p-3 shadow-[0_0_60px_14px_rgba(251,191,36,0.7)]"
              >
                <DeilarLogo className="h-24 w-auto" />
              </motion.div>
              <motion.div
                initial={{ x: -60, opacity: 0, scale: 0.4 }}
                animate={{ x: 0, opacity: 1, scale: 1 }}
                transition={{ delay: 0.55, type: 'spring', stiffness: 180, damping: 12 }}
                className="text-6xl font-black bg-gradient-to-b from-yellow-200 via-amber-400 to-orange-500 bg-clip-text text-transparent"
                style={{ filter: 'drop-shadow(0 0 18px rgba(251,191,36,0.8))' }}
              >
                ديلر
              </motion.div>
            </div>
            <motion.p initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1.3 }} className="relative mt-8 text-xl font-black text-amber-200">
              ✨ يلا نبدأ التحدي ✨
            </motion.p>
          </motion.div>
        )}
      </AnimatePresence>

      <button onClick={() => done.current()} className="absolute bottom-6 left-1/2 -translate-x-1/2 rounded-full bg-white/10 px-5 py-2 text-xs font-bold text-white/70 cursor-pointer">
        تخطي
      </button>
    </motion.div>
  );
};
