import React, { useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Share2 } from 'lucide-react';
import { shareResult, type ShareOutcome } from '../utils/shareResult';

/**
 * The points screen of the quiz: one scene per result. A play is ten questions of ±10, so its score is a multiple of 10
 * from -100 to +100 — ten scenes for losing points (-10 ... -100) and ten for winning them (+10 ... +100), plus one for 0.
 * Each scene has its own face, colours, falling or rising things, a way of moving, and three things to say when it is tapped.
 */
type Move = 'float' | 'pulse' | 'shake' | 'spin' | 'wobble' | 'bounce' | 'drop';

export interface Scene {
  score: number;
  emoji: string;
  title: string;
  /** Said in turn each time the player taps the face. */
  lines: [string, string, string];
  /** Tailwind classes of the background. */
  bg: string;
  /** Tailwind class of the text colour. */
  ink: string;
  /** What falls (losing) or rises (winning) in the background. */
  drift: string[];
  /** What bursts out of the face when it is tapped. */
  burst: string[];
  move: Move;
}

export const SCENES: Scene[] = [
  // ----- losing points: -100 ... -10 -----
  { score: -100, emoji: '🤕', title: 'ضربة قاضية… بس الأبطال بيقوموا!', lines: ['آه! بس مفيش بطل ما وقعش 💪', 'كل غلطة درس جديد', 'جرّب تاني وهتفاجئ نفسك!'], bg: 'from-slate-800 via-zinc-700 to-slate-900', ink: 'text-white', drift: ['💥', '🌩️', '💫'], burst: ['💥', '⭐', '💫'], move: 'shake' },
  { score: -90, emoji: '🆘', title: 'محتاج إنقاذ!', lines: ['ساعدني! 🙏', 'هنطلع من الحفرة دي سوا', 'الأسئلة الجاية أسهل، صدّقني'], bg: 'from-red-800 via-rose-700 to-red-900', ink: 'text-white', drift: ['🆘', '🌊', '💧'], burst: ['🆘', '🛟', '💧'], move: 'bounce' },
  { score: -80, emoji: '🌪️', title: 'عاصفة عدّت عليك!', lines: ['العاصفة بتعدي دايماً 🌤️', 'خد نفس عميق', 'الجولة الجاية بداية جديدة'], bg: 'from-gray-700 via-slate-600 to-gray-800', ink: 'text-white', drift: ['🍃', '🌪️', '💨'], burst: ['💨', '🍃', '🌀'], move: 'spin' },
  { score: -70, emoji: '😵‍💫', title: 'الدنيا لفّت بيك!', lines: ['أنا دايخ 😵‍💫', 'ركّز أكتر الجولة الجاية', 'اسأل نفسك: إيه الأقرب للصح؟'], bg: 'from-purple-900 via-fuchsia-800 to-indigo-900', ink: 'text-white', drift: ['💫', '🌀', '✨'], burst: ['💫', '🌀', '⭐'], move: 'wobble' },
  { score: -60, emoji: '🥶', title: 'الملعب كان بارد النهارده', lines: ['برررد! 🧊', 'سخّن شوية وارجع', 'الفوز بيحب اللي بيحاول تاني'], bg: 'from-sky-800 via-cyan-700 to-blue-900', ink: 'text-white', drift: ['❄️', '🧊', '☃️'], burst: ['❄️', '🧊', '💎'], move: 'shake' },
  { score: -50, emoji: '😭', title: 'يوم صعب… بس هيعدّي', lines: ['بكيت شوية 😭', 'امسح دموعك وكمّل', 'نص الأسئلة غلط، يعني نصها صح!'], bg: 'from-blue-900 via-indigo-800 to-slate-900', ink: 'text-white', drift: ['💧', '😭', '🌧️'], burst: ['💧', '💦', '😢'], move: 'drop' },
  { score: -40, emoji: '😢', title: 'خسارة صغيرة، وهتعوّضها!', lines: ['ولا يهمك، فيها حاجة تتعلّمها', 'كل لاعب كبير خسر قبل ما يكسب', 'العب تاني وخد حقك 💪'], bg: 'from-indigo-800 via-blue-700 to-slate-800', ink: 'text-white', drift: ['💧', '🌧️', '☁️'], burst: ['💧', '💦', '🫧'], move: 'drop' },
  { score: -30, emoji: '😟', title: 'لسه بتسخّن', lines: ['لسه الشوط الأول 😅', 'الأسئلة السهلة هتفرق', 'ركّز وهتكسب'], bg: 'from-stone-700 via-slate-600 to-stone-800', ink: 'text-white', drift: ['☁️', '🌧️', '💭'], burst: ['💭', '☁️', '💧'], move: 'wobble' },
  { score: -20, emoji: '😕', title: 'ولا يهمك!', lines: ['غلطتين… عادي 😉', 'ارجع أقوى', 'المرة الجاية أحسن'], bg: 'from-slate-600 via-gray-500 to-slate-700', ink: 'text-white', drift: ['☁️', '💭', '🍂'], burst: ['🍂', '💭', '☁️'], move: 'float' },
  { score: -10, emoji: '😐', title: 'تعثّر بسيط', lines: ['خطوة صغيرة للخلف بس', 'قوم وكمّل!', 'محتاجة شوية تركيز 🧠'], bg: 'from-gray-500 via-slate-400 to-gray-600', ink: 'text-white', drift: ['💧', '☁️', '🍃'], burst: ['🍃', '💧', '✨'], move: 'float' },

  // ----- winning points: +10 ... +100 -----
  { score: 10, emoji: '🙂', title: 'بداية حلوة!', lines: ['أول نقطة في الجيب ✨', 'كمّل كده!', 'الجاي أحلى'], bg: 'from-emerald-400 via-green-400 to-teal-500', ink: 'text-white', drift: ['✨', '🌱', '⭐'], burst: ['✨', '🌱', '⭐'], move: 'float' },
  { score: 20, emoji: '😃', title: 'ماشي كويس!', lines: ['شغل جميل 👏', 'إيدك على الصح', 'زوّد السرعة شوية!'], bg: 'from-green-400 via-emerald-500 to-lime-500', ink: 'text-white', drift: ['⭐', '🍀', '✨'], burst: ['⭐', '🍀', '👏'], move: 'bounce' },
  { score: 30, emoji: '😎', title: 'لاعب شاطر!', lines: ['شكلك فاهم في الكورة 😎', 'ثقة وهدوء', 'ولسه قدامك أكتر'], bg: 'from-lime-400 via-green-500 to-emerald-600', ink: 'text-white', drift: ['🎯', '⭐', '⚽'], burst: ['🎯', '⚽', '⭐'], move: 'wobble' },
  { score: 40, emoji: '🤩', title: 'أداء رائع!', lines: ['واااو! 🤩', 'الجمهور بيصفّق لك', 'قرّبت من القمة'], bg: 'from-teal-400 via-cyan-500 to-sky-500', ink: 'text-white', drift: ['🌟', '✨', '👏'], burst: ['🌟', '👏', '🎉'], move: 'pulse' },
  { score: 50, emoji: '🥳', title: 'نص الطريق للقمة!', lines: ['احتفل! 🎉', 'نص الأسئلة ونص نقاط الكمال', 'كمّل وهتوصل'], bg: 'from-yellow-400 via-amber-400 to-orange-500', ink: 'text-white', drift: ['🎉', '🎊', '🎈'], burst: ['🎉', '🎊', '🎈'], move: 'bounce' },
  { score: 60, emoji: '🔥', title: 'إنت نار!', lines: ['ولّعتها! 🔥', 'مفيش حد يوقفك', 'الأسئلة بتخاف منك'], bg: 'from-orange-500 via-red-500 to-rose-600', ink: 'text-white', drift: ['🔥', '✨', '💥'], burst: ['🔥', '💥', '⭐'], move: 'pulse' },
  { score: 70, emoji: '🚀', title: 'صاروخ!', lines: ['3… 2… 1… انطلاق 🚀', 'سرعتك مرعبة', 'على وشك النجوم!'], bg: 'from-indigo-600 via-violet-600 to-purple-700', ink: 'text-white', drift: ['⭐', '🌠', '🚀'], burst: ['🚀', '🌠', '⭐'], move: 'float' },
  { score: 80, emoji: '🏅', title: 'بطل بجد!', lines: ['ميدالية مستحقة 🏅', 'أداء يستاهل التصفيق', 'خطوة وتبقى ملك'], bg: 'from-amber-400 via-yellow-500 to-orange-500', ink: 'text-white', drift: ['🏅', '⭐', '✨'], burst: ['🏅', '⭐', '🥇'], move: 'spin' },
  { score: 90, emoji: '👑', title: 'ملك الكورة!', lines: ['تاجك يليق بيك 👑', 'غلطة واحدة بس!', 'الكمال على بعد سؤال'], bg: 'from-fuchsia-600 via-purple-600 to-violet-700', ink: 'text-white', drift: ['👑', '💎', '✨'], burst: ['👑', '💎', '🌟'], move: 'pulse' },
  { score: 100, emoji: '🏆', title: 'نتيجة كاملة! أسطورة!', lines: ['10 من 10! 🏆', 'إنت أسطورة الكورة', 'ابعتها لصحابك وتحدّاهم!'], bg: 'from-yellow-300 via-amber-400 to-yellow-600', ink: 'text-amber-950', drift: ['⚽', '🏆', '🎆'], burst: ['🏆', '⚽', '🎆'], move: 'bounce' },
];

/** A result of exactly 0. */
const EVEN: Scene = { score: 0, emoji: '😶', title: 'تعادل!', lines: ['لا ربح ولا خسارة 🤝', 'الجولة الجاية تحسم', 'يلا نكسب!'], bg: 'from-slate-500 via-gray-400 to-slate-600', ink: 'text-white', drift: ['⚖️', '🤝', '⚽'], burst: ['⚽', '🤝', '⭐'], move: 'float' };

/** The scene of a score: its distance from 0 in tens, up to ten steps either way. */
export function sceneFor(score: number): Scene {
  if (score === 0) return EVEN;
  const steps = Math.min(10, Math.max(1, Math.round(Math.abs(score) / 10)));
  return SCENES.find((s) => s.score === Math.sign(score) * steps * 10) ?? EVEN;
}

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
  const scene = sceneFor(score);
  const winning = scene.score > 0;
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
    setShared(await shareResult(shareText));
  };

  const points = scene.score > 0 ? `+${scene.score}` : `${scene.score}`;

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
        <motion.p key={scene.score} initial={{ scale: 0.4, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} transition={{ type: 'spring', stiffness: 220, damping: 12 }} dir="ltr" className="text-6xl font-black drop-shadow">
          {points}
        </motion.p>
        <p className="text-sm font-bold opacity-90">نقطة ولاء</p>

        <div className="relative mx-auto my-3 flex h-40 w-40 items-center justify-center">
          <motion.button
            type="button"
            aria-label="اضغط عليّ"
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

        <h2 className="text-xl font-black leading-snug drop-shadow">{scene.title}</h2>

        <AnimatePresence mode="wait">
          <motion.p key={taps} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mx-auto mt-2 min-h-10 max-w-xs rounded-2xl bg-black/20 px-3 py-2 text-sm font-bold">
            {taps === 0 ? '👆 اضغط على الوش!' : scene.lines[(taps - 1) % scene.lines.length]}
          </motion.p>
        </AnimatePresence>

        {shareText && (
          <div className="mt-3">
            <motion.button whileTap={{ scale: 0.93 }} type="button" onClick={share} className="inline-flex cursor-pointer items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-base font-black text-slate-900 shadow-[0_4px_0_rgba(0,0,0,0.25)]">
              <Share2 className="h-5 w-5" /> شارك نتيجتك
            </motion.button>
            {shared === 'copied' && <p className="mt-1.5 text-xs font-bold">✔ اتنسخت النتيجة — الصقها في أي محادثة</p>}
            {shared === 'shared' && <p className="mt-1.5 text-xs font-bold">✔ تمت المشاركة</p>}
            {shared === 'whatsapp' && <p className="mt-1.5 text-xs font-bold">فتحنا واتساب لمشاركة نتيجتك</p>}
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
  const [hint, setHint] = useState<number | null>(null);

  // A scene that is not unlocked cannot be opened, not even from the address.
  if (selected !== null && seen.has(sceneFor(selected).score)) {
    return (
      <div className="space-y-3">
        <PointsMood score={selected} shareText={shareFor(selected)} />
        <button type="button" onClick={() => onSelect(null)} className="w-full cursor-pointer rounded-2xl border-2 border-slate-200 bg-white py-3 text-sm font-black text-slate-800">
          ← كل الحالات
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
              <span className="mt-1 text-[11px] font-black" dir="ltr">{s.score > 0 ? `+${s.score}` : s.score}</span>
            </motion.button>
          ) : (
            <motion.button key={s.score} whileTap={{ x: [0, -4, 4, -3, 3, 0] }} type="button" aria-label="شاشة مقفولة" onClick={() => setHint(s.score)} className="flex cursor-pointer flex-col items-center rounded-2xl border border-slate-700 bg-slate-950 px-1 py-2 text-slate-600">
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
      <h1 className="text-xl font-black text-slate-900">🎭 شاشات النقاط</h1>
      <p className="text-xs font-semibold text-slate-500">
        فتحت <span className="font-black text-slate-800">{unlocked}</span> من {SCENES.length} شاشة. كل نتيجة تحققها في لعبة بتفتح شاشتها هنا، والباقي مظلم لحد ما توصله.
      </p>
      {hint !== null && <p className="rounded-2xl bg-slate-900 px-3 py-2 text-center text-xs font-bold text-amber-300">🔒 العب وحقق النتيجة دي عشان تفتح الشاشة دي</p>}
      {group('😢 لما تخسر نقاط (10 حالات)', [...SCENES.filter((s) => s.score < 0)].sort((a, b) => b.score - a.score))}
      {group('🎉 لما تكسب نقاط (10 حالات)', SCENES.filter((s) => s.score > 0))}
    </div>
  );
};
