import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2 } from 'lucide-react';
import { useIsAr } from '../context/LanguageContext';
import { shareResult, type ShareOutcome } from '../utils/shareResult';
import { SCENES, sceneFor, type Move, type Scene } from '../data/pointsScenes';

export { SCENES, sceneFor };
export type { Scene };

/**
 * The points screen of the quiz: one scene per possible result (0 to 1000 points, in steps of 25 — see data/pointsScenes.ts).
 * Each scene has its own face, colours, falling or rising things, a way of moving, and three things to say when it is tapped.
 */
const MOVES: Record<Move, { animate: Record<string, number[]>; duration: number; ease?: 'linear' }> = {
  float: { animate: { y: [0, -14, 0] }, duration: 2.4 },
  pulse: { animate: { scale: [1, 1.14, 1] }, duration: 1.2 },
  shake: { animate: { x: [-7, 7, -7] }, duration: 0.5 },
  spin: { animate: { rotate: [0, 360] }, duration: 3.5, ease: 'linear' },
  wobble: { animate: { rotate: [-9, 9, -9] }, duration: 1.5 },
  bounce: { animate: { y: [0, -26, 0] }, duration: 0.85 },
  drop: { animate: { y: [0, 8, 0], scale: [1, 0.95, 1] }, duration: 2.2 },
};

interface Burst {
  id: number;
  emoji: string;
  dx: number;
  dy: number;
}

interface PointsMoodProps {
  score: number;
  /** When given, a "share your result" button is drawn with this message. */
  shareText?: string;
}

export const PointsMood: React.FC<PointsMoodProps> = ({ score, shareText }) => {
  const isAr = useIsAr();
  const scene = sceneFor(score);
  const winning = true;
  const [taps, setTaps] = useState(0);
  const [bursts, setBursts] = useState<Burst[]>([]);
  const [shared, setShared] = useState<ShareOutcome | null>(null);
  const nextId = useRef(0);
  const move = MOVES[scene.move];

  // The things drifting in the background: up when winning points, down when losing them.
  const drift = useMemo(
    () => Array.from({ length: 16 }, (_, i) => ({ id: i, left: (i * 37 + 11) % 100, delay: (i % 8) * 0.45, duration: 4 + (i % 5), size: 16 + (i % 4) * 8, emoji: scene.drift[i % scene.drift.length] })),
    [scene],
  );

  const tap = () => {
    const made = Array.from({ length: 8 }, (_, k): Burst => {
      const angle = (Math.PI * 2 * k) / 8 + Math.random() * 0.5;
      return { id: nextId.current++, emoji: scene.burst[k % scene.burst.length], dx: Math.cos(angle) * (90 + Math.random() * 40), dy: Math.sin(angle) * (90 + Math.random() * 40) };
    });
    setBursts((current) => [...current, ...made]);
    setTaps((n) => n + 1);
    window.setTimeout(() => setBursts((current) => current.filter((b) => !made.includes(b))), 1100);
  };

  const share = async () => {
    if (!shareText) return;
    setShared(await shareResult(shareText, scene, score));
  };

  const points = `+${Math.max(0, Math.round(score))}`;

  return (
    <div className={`relative overflow-hidden rounded-3xl bg-gradient-to-b ${scene.bg} ${scene.ink} p-5 text-center shadow-lg`}>
      <div className="pointer-events-none absolute inset-0" aria-hidden>
        {drift.map((p) => (
          <motion.span
            key={`${scene.score}-${p.id}`}
            className="absolute"
            style={{ left: `${p.left}%`, fontSize: p.size, top: winning ? '100%' : '-10%' }}
            animate={{ y: winning ? ['0%', '-120vh'] : ['0%', '120vh'], opacity: [0, 0.9, 0], rotate: [0, p.id % 2 ? 40 : -40] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }}
          >
            {p.emoji}
          </motion.span>
        ))}
      </div>

      <div className="relative">
        <motion.p key={score} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }} dir="ltr" className="text-6xl font-black drop-shadow">
          {points}
        </motion.p>
        <p className="text-sm font-bold opacity-90">{isAr ? 'نقطة ولاء' : 'loyalty points'}</p>

        <div className="relative mx-auto my-3 flex h-40 w-40 items-center justify-center">
          <motion.button
            type="button"
            aria-label={isAr ? 'اضغط عليّ' : 'Tap me'}
            onClick={tap}
            whileTap={{ scale: 0.8, rotate: winning ? 12 : -12 }}
            animate={move.animate}
            transition={{ duration: move.duration, repeat: Infinity, ease: move.ease ?? 'easeInOut' }}
            className="relative z-10 cursor-pointer select-none text-[7.5rem] leading-none drop-shadow-xl"
          >
            {scene.emoji}
          </motion.button>
          <AnimatePresence>
            {bursts.map((b) => (
              <motion.span key={b.id} className="pointer-events-none absolute z-20 text-2xl" initial={{ x: 0, y: 0, opacity: 1, scale: 0.4 }} animate={{ x: b.dx, y: b.dy, opacity: 0, scale: 1.4 }} exit={{ opacity: 0 }} transition={{ duration: 1, ease: 'easeOut' }}>
                {b.emoji}
              </motion.span>
            ))}
          </AnimatePresence>
        </div>

        <h2 className="text-xl font-black leading-snug drop-shadow">{isAr ? scene.title : scene.titleEn}</h2>

        <AnimatePresence mode="wait">
          <motion.p key={taps} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto mt-2 min-h-10 max-w-xs rounded-2xl bg-black/20 px-3 py-2 text-sm font-bold">
            {taps === 0 ? (isAr ? '👆 اضغط على الوش!' : '👆 Tap the face!') : (isAr ? scene.lines : scene.linesEn)[(taps - 1) % scene.lines.length]}
          </motion.p>
        </AnimatePresence>

        {shareText && (
          <div className="mt-3">
            <motion.button whileTap={{ scale: 0.93 }} type="button" onClick={share} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-base font-black text-slate-900 shadow-[0_4px_0_rgba(0,0,0,0.25)]">
              <Share2 className="h-5 w-5" /> {isAr ? 'شارك نتيجتك' : 'Share your result'}
            </motion.button>
            {shared === 'copied' && <p className="mt-1.5 text-xs font-bold">{isAr ? '✔ اتنسخت النتيجة — الصقها في أي محادثة' : '✔ Result copied — paste it in any chat'}</p>}
            {shared === 'shared' && <p className="mt-1.5 text-xs font-bold">{isAr ? '✔ تمت المشاركة' : '✔ Shared'}</p>}
            {shared === 'whatsapp' && <p className="mt-1.5 text-xs font-bold">{isAr ? 'فتحنا واتساب لمشاركة نتيجتك' : 'We opened WhatsApp to share your result'}</p>}
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Every scene in one place. A scene shows only once the player has actually got that result in a play (`seen` holds those
 * scores); the others stay dark and locked, so each is a goal to reach.
 */
export const PointsGallery: React.FC<{ selected: number | null; onSelect: (score: number | null) => void; shareFor: (score: number) => string; seen: ReadonlySet<number> }> = ({ selected, onSelect, shareFor, seen }) => {
  const isAr = useIsAr();
  const [hint, setHint] = useState<number | null>(null);

  // A scene that is not unlocked cannot be opened, not even from the address.
  if (selected !== null && seen.has(sceneFor(selected).score)) {
    return (
      <div className="space-y-3">
        <PointsMood score={selected} shareText={shareFor(selected)} />
        <button type="button" onClick={() => onSelect(null)} className="w-full cursor-pointer rounded-2xl border-2 border-slate-200 bg-white py-3 text-sm font-black text-slate-800">
          {isAr ? '← كل الحالات' : '← All screens'}
        </button>
      </div>
    );
  }

  const unlocked = SCENES.filter((s) => seen.has(s.score)).length;

  const group = (title: string, items: Scene[]) => (
    <div className="rounded-3xl border border-slate-200 bg-white p-3 shadow-2xs">
      <h2 className="mb-2 text-base font-black text-slate-900">{title}</h2>
      <div className="grid grid-cols-5 gap-2">
        {items.map((s) =>
          seen.has(s.score) ? (
            <motion.button key={s.score} whileTap={{ scale: 0.88 }} type="button" onClick={() => onSelect(s.score)} className={`flex cursor-pointer flex-col items-center rounded-2xl bg-gradient-to-b ${s.bg} px-1 py-2 text-white`}>
              <span className="text-3xl leading-none">{s.emoji}</span>
              <span className="mt-1 text-[11px] font-black" dir="ltr">{`+${s.score}`}</span>
            </motion.button>
          ) : (
            <motion.button key={s.score} whileTap={{ x: [0, -4, 4, -3, 3, 0] }} type="button" aria-label={isAr ? 'شاشة مقفولة' : 'Locked screen'} onClick={() => setHint(s.score)} className="flex cursor-pointer flex-col items-center rounded-2xl border border-slate-700 bg-slate-950 px-1 py-2 text-slate-600">
              <span className="text-3xl leading-none opacity-60">🔒</span>
              <span className="mt-1 text-[11px] font-black">؟</span>
            </motion.button>
          ),
        )}
      </div>
    </div>
  );

  return (
    <div className="space-y-3">
      <h1 className="text-xl font-black text-slate-900">{isAr ? '🎭 شاشات النقاط' : '🎭 Points screens'}</h1>
      <p className="text-xs font-semibold text-slate-500">
        {isAr ? <>فتحت <span className="font-black text-slate-800">{unlocked}</span> من {SCENES.length} شاشة. كل نتيجة تحققها في لعبة بتفتح شاشتها هنا، والباقي مظلم لحد ما توصله.</> : <>You unlocked <span className="font-black text-slate-800">{unlocked}</span> of {SCENES.length} screens. Each result you reach in a game unlocks its screen here; the rest stay dark until you get there.</>}
      </p>
      {hint !== null && <p className="rounded-2xl bg-slate-900 px-3 py-2 text-center text-xs font-bold text-amber-300">{isAr ? '🔒 العب وحقق النتيجة دي عشان تفتح الشاشة دي' : '🔒 Play and reach this result to unlock this screen'}</p>}
      {group(isAr ? '🌱 من 0 إلى 250 نقطة' : '🌱 From 0 to 250 points', SCENES.filter((x) => x.score <= 250))}
      {group(isAr ? '🎉 من 275 إلى 550 نقطة' : '🎉 From 275 to 550 points', SCENES.filter((x) => x.score > 250 && x.score <= 550))}
      {group(isAr ? '🔥 من 575 إلى 800 نقطة' : '🔥 From 575 to 800 points', SCENES.filter((x) => x.score > 550 && x.score <= 800))}
      {group(isAr ? '👑 من 825 إلى 1000 نقطة' : '👑 From 825 to 1000 points', SCENES.filter((x) => x.score > 800))}
    </div>
  );
};
