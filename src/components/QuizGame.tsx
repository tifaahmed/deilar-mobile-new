import React, { useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence, animate, useMotionValue, useTransform } from 'motion/react';
import { ArrowRight, CloudCheck, Smartphone, Trophy, RotateCcw, Star, Volume2, VolumeX } from 'lucide-react';
import { SECTIONS as BASE_SECTIONS, sectionIn, type Question, type QuizDesign, type QuizSection } from '../data/quizSections';
import { navigate, useRoute } from '../router';
import { QUIZ_SPEED_TIERS, quizPoints, flushQuizAnswers, markBadgesSeen, newId, recordQuizAnswer, refreshBadgeCatalog, refreshHistory, refreshLoyalty, useBadgeCatalog, useBadges, useLoyalty, useLoyaltyHistory, useQueuedPlayIds } from '../utils/quizStore';
import type { BadgeInfo } from '../utils/quizStore';
import { PointsGallery, PointsMood, sceneFor } from './PointsMood';
import { blockPullToRefresh } from './PullToRefresh';
import { QuizLaunch } from './QuizLaunch';
import { WalletPanel, formatEgp } from './WalletPanel';
import { TransfersPanel } from './TransfersPanel';
import { resultShareText } from '../utils/shareResult';
import { PLAY_SIZE, pickQuestions, recordProgress, useProgress } from '../utils/quizProgress';
import { useSession } from '../utils/session';
import { PLAYS_PER_DAY, formatCountdown, notifyPermission, registerPlay, requestQuizNotifications, useQuizLimit } from '../utils/quizLimit';
import type { NotifyPermission } from '../utils/quizLimit';
import { savePlay, useQuizHistory } from '../utils/quizHistory';
import { useIsAr } from '../context/LanguageContext';
import { setQuizLang, useQuizLang } from '../data/quizLanguage';

/** Everything this player has won or lost: the points the backend holds for the account plus those still on the phone. */
export const PointsBalance: React.FC<{ total: number; pending: number; signedIn: boolean; egp?: number }> = ({ total, pending, signedIn, egp }) => {
  const isAr = useIsAr();
  const held = total - pending;
  const tone = total > 0 ? 'from-emerald-500 to-teal-600' : total < 0 ? 'from-rose-500 to-red-600' : 'from-slate-500 to-slate-600';

  return (
    <div className={`rounded-3xl bg-gradient-to-l ${tone} p-4 text-white shadow-md`}>
      <p className="text-xs font-bold text-white/85">{isAr ? '🎁 محصلة نقاط الولاء بتاعتي' : '🎁 My loyalty points total'}</p>
      <p dir="ltr" className="text-5xl font-black tabular-nums">{total > 0 ? `+${total}` : total}</p>
      {egp != null && egp > 0 && <p className="text-sm font-black text-white/95">≈ <span dir="ltr">{formatEgp(egp)}</span> {isAr ? 'جنيه' : 'EGP'}</p>}
      {signedIn ? (
        <p className="mt-1 text-xs font-semibold text-white/85">
          {isAr ? 'في حسابك' : 'In your account'} <span dir="ltr" className="font-black">{held}</span>
          {pending !== 0 && <> · {isAr ? 'لسه هتتضاف' : 'still to be added'} <span dir="ltr" className="font-black">{pending > 0 ? `+${pending}` : pending}</span></>}
        </p>
      ) : (
        <p className="mt-1 text-xs font-semibold text-white/85">{isAr ? 'النقاط دي على موبايلك بس. سجّل بياناتك وأعمل الكارت التجريبي المجاني عشان تتحفظ في حسابك.' : 'These points are only on your phone. Fill in your details and get the free trial card so they are saved to your account.'}</p>
      )}
    </div>
  );
};

/** Shown instead of "play" when a section's daily allowance is used up: the time until it opens again, and a way to be told. */
const LockedPanel: React.FC<{ title: string; msLeft: number }> = ({ title, msLeft }) => {
  const isAr = useIsAr();
  const [permission, setPermission] = useState<NotifyPermission>(notifyPermission());

  return (
    <div className="rounded-3xl bg-white p-4 text-center text-slate-900 shadow-md">
      <p className="text-4xl">⏳</p>
      <p className="mt-1 text-base font-black">{isAr ? `خلصت محاولاتك النهارده في ${title}` : `You have used today's plays in ${title}`}</p>
      <p className="text-xs font-semibold text-slate-500">{isAr ? `${PLAYS_PER_DAY} محاولات في اليوم لكل قسم` : `${PLAYS_PER_DAY} plays a day for each section`}</p>
      <p dir="ltr" className="my-2 text-4xl font-black tabular-nums">{formatCountdown(msLeft)}</p>
      <p className="text-xs font-bold text-slate-600">{isAr ? 'المحاولات بتتجدد كل يوم الساعة 12 بالليل' : 'Your plays renew every day at midnight'}</p>
      {permission === 'default' && (
        <button type="button" onClick={async () => setPermission(await requestQuizNotifications())} className="mt-3 w-full cursor-pointer rounded-xl bg-[#931A47] py-3 text-sm font-black text-white">
          {isAr ? '🔔 نبّهني لما أقدر ألعب' : '🔔 Tell me when I can play'}
        </button>
      )}
      {permission === 'granted' && <p className="mt-3 rounded-xl bg-emerald-50 p-2 text-xs font-bold text-emerald-700">{isAr ? '🔔 هنبعتلك إشعار أول ما العداد يخلص' : '🔔 We will notify you as soon as the countdown ends'}</p>}
      {permission === 'denied' && <p className="mt-3 rounded-xl bg-amber-50 p-2 text-xs font-bold text-amber-800">{isAr ? 'إشعارات الجهاز مقفولة من الإعدادات. هيظهرلك تنبيه جوه التطبيق لما تفتحه.' : 'Notifications are turned off in your device settings. You will see a reminder inside the app when you open it.'}</p>}
      {permission === 'unsupported' && <p className="mt-3 rounded-xl bg-slate-50 p-2 text-xs font-bold text-slate-600">{isAr ? 'هيظهرلك تنبيه جوه التطبيق أول ما العداد يخلص.' : 'You will see a reminder inside the app as soon as the countdown ends.'}</p>}
    </div>
  );
};

/** The small line under a section's name on the sections screen. */
const SectionProgressLine: React.FC<{ sec: QuizSection }> = ({ sec }) => {
  const isAr = useIsAr();
  const p = useProgress(sec.key);
  const limit = useQuizLimit(sec.key);
  return (
    <>
      <span className="block text-xs font-semibold text-white/80">{isAr ? `المرحلة ${p.stage} · حليت ${p.solved.length} سؤال` : `Stage ${p.stage} · ${p.solved.length} solved`}</span>
      <span className="block text-xs font-black text-white" dir="rtl">
        {limit.locked ? <>{isAr ? '🔒 هتفتح بعد' : '🔒 Opens in'} <span dir="ltr" className="tabular-nums">{formatCountdown(limit.msLeft)}</span></> : isAr ? `🎮 باقي ${limit.left} من ${PLAYS_PER_DAY} محاولات النهارده` : `🎮 ${limit.left} of ${PLAYS_PER_DAY} plays left today`}
      </span>
    </>
  );
};

type QuizStep = 'types' | 'sections' | 'intro' | 'history' | 'badges' | 'moods';

/** Reads the part of the address after /quiz/: which screen, which section, which points scene. */
export function parseQuizPath(path: string): { step: QuizStep; sectionId: string | null; moodScore: number | null } {
  const [first, second] = path.split('/').filter(Boolean);
  const none = { sectionId: null, moodScore: null };

  if (first === 'mcq') {
    const found = BASE_SECTIONS.find((s) => s.id === second);
    return found ? { step: 'intro', sectionId: found.id, moodScore: null } : { step: 'sections', ...none };
  }
  if (first === 'history') return { step: 'history', ...none };
  if (first === 'badges') return { step: 'badges', ...none };
  if (first === 'moods') {
    const score = second === undefined || second === '' ? NaN : Number(second);
    return { step: 'moods', sectionId: null, moodScore: Number.isFinite(score) ? score : null };
  }

  return { step: 'types', ...none };
}

/** What this player has done in one section: its stage, how many they solved and which questions they met. */
const ProgressPanel: React.FC<{ sec: QuizSection }> = ({ sec }) => {
  const isAr = useIsAr();
  const p = useProgress(sec.key);

  return (
    <div className="rounded-3xl bg-white border border-slate-200 p-3 shadow-2xs">
      <p className="text-sm font-black text-slate-900">{sec.emoji} {sec.title} · {isAr ? 'المرحلة' : 'Stage'} {p.stage}</p>
      <p className="mb-2 text-xs font-semibold text-slate-500">{isAr ? `حليت ${p.solved.length} سؤال في المرحلة دي` : `${p.solved.length} solved in this stage`}{p.stagesDone > 0 ? (isAr ? ` · خلصت ${p.stagesDone} مرحلة` : ` · ${p.stagesDone} stages finished`) : ''}</p>
      {p.seen.length === 0 ? (
        <p className="text-xs font-bold text-slate-400">{isAr ? 'لسه ماشفتش أي سؤال في المرحلة دي.' : 'You have not seen any question in this stage yet.'}</p>
      ) : (
        // Counts only: a question's number is never shown to the player.
        <div className="flex gap-2 text-xs font-black">
          <span className="rounded-lg bg-emerald-50 px-2.5 py-1 text-emerald-700">{isAr ? '✅ حليت' : '✅ Solved'} {p.solved.length}</span>
          <span className="rounded-lg bg-red-50 px-2.5 py-1 text-red-600">{isAr ? '🔁 هتتعاد عليك' : '🔁 To repeat'} {p.seen.length - p.solved.length}</span>
        </div>
      )}
    </div>
  );
};

/**
 * Where a log line is kept, as a tappable icon: «محفوظة» (saved in the account on the server) or «على الجهاز» (still only on this
 * phone, waiting for a connection or a sign-in). Tapping it opens a short explanation under it; tapping again, or anywhere else, closes it.
 */
export function SyncChip({ synced, signedIn }: { synced: boolean; signedIn: boolean }) {
  const isAr = useIsAr();
  const [open, setOpen] = useState(false);
  const Icon = synced ? CloudCheck : Smartphone;
  const explain = synced
    ? isAr ? 'تم حفظ هذا السجل في حسابك على السيرفر. نقاطك وشاراتك محفوظة ولن تضيع حتى لو غيّرت الموبايل أو مسحت التطبيق.' : 'This record is saved in your account on the server. Your points and badges are safe even if you change phone or delete the app.'
    : signedIn
      ? isAr ? 'هذا السجل ما زال على موبايلك فقط. سيُرفع إلى حسابك تلقائياً أول ما يتوفر اتصال بالإنترنت، وبعدها يتحول إلى «محفوظة».' : 'This record is still only on your phone. It will be uploaded to your account automatically as soon as there is an internet connection, then it becomes “Saved”.'
      : isAr ? 'هذا السجل على موبايلك فقط لأنك لم تسجّل الدخول. سجّل الدخول (أو أنشئ الكارت المجاني) لينتقل إلى حسابك ولا تضيع نقاطك.' : 'This record is only on your phone because you are not signed in. Sign in (or create the free card) so it moves to your account and your points are not lost.';

  return (
    <span className="relative shrink-0">
      <button
        type="button"
        aria-expanded={open}
        aria-label={synced ? (isAr ? 'محفوظة: اضغط للشرح' : 'Saved: tap for details') : isAr ? 'على الجهاز فقط: اضغط للشرح' : 'On this device only: tap for details'}
        onClick={() => setOpen((v) => !v)}
        onBlur={() => setOpen(false)}
        className={`flex flex-col items-center gap-0.5 rounded-xl px-2 py-1 text-[10px] font-black leading-tight cursor-pointer ${synced ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}
      >
        <Icon className="w-4 h-4" aria-hidden="true" />
        {synced ? (isAr ? 'محفوظة' : 'Saved') : isAr ? 'على الجهاز' : 'On device'}
      </button>
      {open && (
        <span role="status" className="absolute z-20 top-full mt-1 end-0 w-52 rounded-xl bg-slate-900 p-2.5 text-[11px] font-bold leading-5 text-white shadow-lg">
          {explain}
        </span>
      )}
    </span>
  );
}

type LogLine =
  | { kind: 'play'; key: string; at: string; title: string; right: number; wrong: number; points: number; completed: boolean; synced: boolean }
  | { kind: 'badge'; key: string; at: string; title: string; icon: string; points: number; synced: boolean }
  | { kind: 'admin'; key: string; at: string; points: number; note: string | null; synced: boolean }
  | { kind: 'wallet'; key: string; at: string; points: number; synced: boolean }
  | { kind: 'transfer'; key: string; at: string; points: number; synced: boolean };

/** The difficulty sign on a question: a word, a colour and 10 small bars of which `level` are lit. */
function difficultyLook(level: number, isAr = true): { label: string; pill: string; bar: string } {
  if (level <= 3) return { label: isAr ? 'سهل' : 'Easy', pill: 'bg-emerald-600', bar: 'bg-emerald-300' };
  if (level <= 6) return { label: isAr ? 'متوسط' : 'Medium', pill: 'bg-amber-600', bar: 'bg-amber-300' };
  if (level <= 8) return { label: isAr ? 'صعب' : 'Hard', pill: 'bg-orange-600', bar: 'bg-orange-300' };
  return { label: isAr ? 'صعب جداً' : 'Very hard', pill: 'bg-red-600', bar: 'bg-red-300' };
}

/** The kinds of badge, in the order they are drawn; what a kind means and how many levels it has comes from the backend. */
const BADGE_KIND_ORDER = ['solved', 'streak', 'stage'];
const BADGE_KIND_TITLES: Record<string, string> = { solved: 'إجابات صحيحة', streak: 'صح ورا بعض', stage: 'مراحل القسم' };
const BADGE_KIND_TITLES_EN: Record<string, string> = { solved: 'Right answers', streak: 'Right in a row', stage: 'Section stages' };
/** The look of a ladder's levels, lowest to highest. */
const BADGE_TIERS = [
  { name: 'برونزي', nameEn: 'Bronze', medal: '🥉', earned: 'border-orange-300 bg-orange-50' },
  { name: 'فضي', nameEn: 'Silver', medal: '🥈', earned: 'border-slate-300 bg-slate-100' },
  { name: 'ذهبي', nameEn: 'Gold', medal: '🥇', earned: 'border-amber-300 bg-amber-50' },
  { name: 'بلاتيني', nameEn: 'Platinum', medal: '💠', earned: 'border-cyan-300 bg-cyan-50' },
  { name: 'ماسي', nameEn: 'Diamond', medal: '💎', earned: 'border-fuchsia-300 bg-fuchsia-50' },
];

/** How a badge from the backend is named and drawn; the kinds and thresholds themselves are the backend's. */
const BADGE_ICONS: Record<string, string> = { solved: '🎯', streak: '🔥', stage: '🏆' };
function badgeIcon(b: { kind?: string | null; icon?: string | null }): string {
  return b.icon || BADGE_ICONS[b.kind ?? ''] || '🏅';
}
/** The admin's title when there is one (/admin/loyalty), otherwise the app words the rule itself. */
function badgeTitle(b: { kind?: string | null; threshold?: number | null; title?: string | null }, isAr = true): string {
  if (b.title) return b.title;
  if (b.threshold == null) return isAr ? 'شارة' : 'Badge';
  if (b.kind === 'solved') return isAr ? `حل ${b.threshold} سؤال صح` : `Solve ${b.threshold} questions right`;
  if (b.kind === 'streak') return isAr ? `${b.threshold} إجابات صح ورا بعض` : `${b.threshold} right answers in a row`;
  if (b.kind === 'stage') return isAr ? `وصلت المرحلة ${b.threshold}` : `Reach stage ${b.threshold}`;
  return isAr ? `شارة ${b.threshold}` : `Badge ${b.threshold}`;
}
/** Three pictures of a section for its start screen (whatever its file has). */
const introImages = (section: QuizSection): string[] => section.questions.flatMap((q) => (q.image && section.imageOf(q.image) ? [section.imageOf(q.image) as string] : [])).slice(0, 3);
const OPTION_COLORS = ['from-rose-500 to-rose-600', 'from-sky-500 to-sky-600', 'from-amber-500 to-orange-500', 'from-violet-500 to-purple-600'];
const OPTION_SHAPES = ['🔴', '🔵', '🟡', '🟣'];
type Design = QuizDesign;

/** The look of each design a question can name in its JSON `design` field. */
const LOOKS: Record<Design, { wrap: string; chip: string; title: string; grid?: boolean; tilt?: boolean }> = {
  cards: { wrap: 'bg-white border border-slate-200 shadow-md', chip: 'bg-emerald-50 text-emerald-700', title: 'text-slate-900' },
  grid: { wrap: 'bg-sky-50 border-2 border-sky-200', chip: 'bg-sky-500 text-white', title: 'text-sky-900', grid: true },
  bubbles: { wrap: 'bg-gradient-to-br from-fuchsia-500 via-purple-500 to-indigo-600 text-center', chip: 'bg-white/90 text-purple-700', title: 'text-white', },
  stadium: { wrap: 'bg-emerald-800 border-4 border-emerald-950', chip: 'bg-amber-300 text-emerald-950', title: 'text-white' },
  poster: { wrap: 'bg-slate-900 min-h-56 flex flex-col justify-end', chip: 'bg-rose-500 text-white', title: 'text-white drop-shadow' },
  neon: { wrap: 'bg-slate-950 border-2 border-cyan-400 shadow-[0_0_25px_#22d3ee80]', chip: 'bg-cyan-400 text-slate-950', title: 'text-cyan-100', grid: true },
  comic: { wrap: 'bg-yellow-300 border-4 border-black shadow-[6px_6px_0_#000]', chip: 'bg-black text-yellow-300', title: 'text-black', tilt: true },
  polaroid: { wrap: 'bg-amber-100 border-2 border-dashed border-amber-300 text-center', chip: 'bg-orange-400 text-white', title: 'text-amber-950', tilt: true },
};

/** Option button classes per design; right / wrong answers override the colour. */
function optionClass(design: Design, i: number, right: boolean, wrong: boolean): string {
  const state = right ? 'bg-emerald-500 text-white ring-4 ring-emerald-300' : wrong ? 'bg-slate-500 text-white ring-4 ring-red-300' : '';
  switch (design) {
    case 'grid':
      return `rounded-3xl shadow-[0_5px_0_rgba(0,0,0,0.18)] text-white ${state || `bg-gradient-to-br ${OPTION_COLORS[i]}`}`;
    case 'bubbles':
      return `rounded-full shadow-md ${state || 'bg-white text-purple-800'}`;
    case 'stadium':
      return `rounded-md border-2 border-white/70 uppercase ${state || 'bg-emerald-950 text-white'}`;
    case 'poster':
      return `rounded-2xl backdrop-blur ${state || 'bg-slate-800 text-white border border-white/20'}`;
    case 'polaroid':
      return `rounded-xl shadow-md border-2 border-white ${state || ['bg-pink-300 text-pink-950', 'bg-sky-300 text-sky-950', 'bg-lime-300 text-lime-950', 'bg-orange-300 text-orange-950'][i]}`;
    case 'neon':
      return `rounded-2xl border-2 ${state || ['border-cyan-400 text-cyan-200 shadow-[0_0_12px_#22d3ee90]', 'border-pink-500 text-pink-200 shadow-[0_0_12px_#ec489990]', 'border-lime-400 text-lime-200 shadow-[0_0_12px_#a3e63590]', 'border-fuchsia-500 text-fuchsia-200 shadow-[0_0_12px_#d946ef90]'][i] + ' bg-slate-950'}`;
    case 'comic':
      return `rounded-xl border-4 border-black shadow-[4px_4px_0_#000] ${state || ['bg-white text-black', 'bg-pink-300 text-black', 'bg-cyan-300 text-black', 'bg-lime-300 text-black'][i]}`;
    default:
      return `rounded-2xl text-white shadow-[0_4px_0_rgba(0,0,0,0.2)] bg-gradient-to-l ${right ? 'from-emerald-500 to-emerald-600 ring-4 ring-emerald-300' : wrong ? 'from-slate-500 to-slate-600 ring-4 ring-red-300' : OPTION_COLORS[i]}`;
  }
}

/** Seconds a member has for each question, and how long the right / wrong sign stays before the next one. */
const SECONDS_PER_QUESTION = 20;
/** In the last 5 seconds the clock beeps, faster and higher as the time runs out (ms from the start of the question). */
const WARNING_BEEPS_MS = [15000, 16000, 17000, 17700, 18300, 18800, 19200, 19550, 19800];
const FEEDBACK_MS = 1300;
/** Points won for a right answer and lost for a wrong one or a missed clock; the total may go below zero. Shared with the upload queue, which mirrors the backend's figure. */


/** A short beep made with WebAudio, so the game needs no sound files. */
function useBeep(enabled: boolean) {
  const ctx = useRef<AudioContext | null>(null);

  return (notes: number[]) => {
    if (!enabled) return;
    try {
      ctx.current ??= new (window.AudioContext || (window as any).webkitAudioContext)();
      const c = ctx.current;
      notes.forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.18, c.currentTime + i * 0.12);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.12 + 0.2);
        osc.connect(gain).connect(c.destination);
        osc.start(c.currentTime + i * 0.12);
        osc.stop(c.currentTime + i * 0.12 + 0.22);
      });
    } catch {
      /* no audio: the game still works */
    }
  };
}

const Confetti: React.FC = () => {
  const pieces = useMemo(
    () => Array.from({ length: 28 }, (_, i) => ({ id: i, x: Math.random() * 100, delay: Math.random() * 0.4, size: 8 + Math.random() * 10, emoji: ['⚽', '⭐', '🎉', '🏆', '✨'][i % 5], drift: (Math.random() - 0.5) * 120 })),
    [],
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden" aria-hidden>
      {pieces.map((p) => (
        <motion.span
          key={p.id}
          initial={{ y: -40, x: 0, opacity: 1, rotate: 0 }}
          animate={{ y: '105vh', x: p.drift, opacity: [1, 1, 0], rotate: 360 }}
          transition={{ duration: 2.2 + Math.random(), delay: p.delay, ease: 'easeIn' }}
          style={{ left: `${p.x}%`, fontSize: p.size + 8 }}
          className="absolute top-0"
        >
          {p.emoji}
        </motion.span>
      ))}
    </div>
  );
};

/** The picture of a question in the shape its design wants; a question with no image shows its emoji in the same frame. */
const Art: React.FC<{ design: Design; q: Question; imageOf: (name: string) => string | undefined }> = ({ design, q, imageOf }) => {
  if (design === 'poster') return null;

  const frame: Record<Exclude<Design, 'poster'>, string> = {
    cards: 'w-full h-28 rounded-2xl mb-2 bg-emerald-50',
    grid: 'w-full h-28 rounded-2xl mb-2 border-2 border-sky-200 bg-sky-100',
    bubbles: 'w-28 h-28 mx-auto rounded-full border-4 border-white/80 shadow-xl mb-2 bg-white/20',
    stadium: 'w-full h-28 rounded-md border-4 border-white/80 mb-2 bg-emerald-700',
    polaroid: 'w-full aspect-square bg-amber-50',
    neon: 'w-full h-28 rounded-2xl border-2 border-cyan-400 shadow-[0_0_18px_#22d3ee90] mb-2 bg-slate-900',
    comic: 'w-full h-28 rounded-xl border-4 border-black shadow-[4px_4px_0_#000] mb-2 bg-white',
  };
  const cls = frame[design];
  // A missing / misspelled image file falls back to the emoji (or a ❓) instead of a broken picture.
  const picture = q.image ? imageOf(q.image) : undefined;
  const content = picture ? <img src={picture} alt="" className="w-full h-full object-cover" /> : <span className="text-6xl">{q.emoji || '❓'}</span>;
  const box = <div className={`${cls} overflow-hidden flex items-center justify-center`}>{content}</div>;

  if (design === 'polaroid') {
    return (
      <motion.div key={q.id} initial={{ rotate: -14, y: -40, opacity: 0 }} animate={{ rotate: -3, y: 0, opacity: 1 }} transition={{ type: 'spring' }} className="bg-white p-1.5 pb-4 w-32 mx-auto shadow-lg mb-2">
        {box}
      </motion.div>
    );
  }
  if (design === 'bubbles') return <motion.div key={q.id} initial={{ scale: 0 }} animate={{ scale: 1, y: [0, -8, 0] }} transition={{ scale: { type: 'spring' }, y: { repeat: Infinity, duration: 2.5 } }}>{box}</motion.div>;
  if (design === 'grid') return <motion.div key={q.id} initial={{ x: 80, opacity: 0 }} animate={{ x: 0, opacity: 1 }}>{box}</motion.div>;
  if (design === 'stadium') return <motion.div key={q.id} initial={{ opacity: 0, scaleY: 0.2 }} animate={{ opacity: 1, scaleY: 1 }}>{box}</motion.div>;
  if (design === 'comic') return <motion.div key={q.id} initial={{ rotate: 6, scale: 0.7, opacity: 0 }} animate={{ rotate: -1.5, scale: 1, opacity: 1 }} transition={{ type: 'spring' }}>{box}</motion.div>;
  if (design === 'neon') return <motion.div key={q.id} initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0.6, 1] }} transition={{ duration: 0.6 }}>{box}</motion.div>;

  return <motion.div key={q.id} initial={{ scale: 1.15, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}>{box}</motion.div>;
};

/** Asked once per visit when the app is in English: the questions come in Arabic or in English. */
const QuizLanguageChoice: React.FC = () => (
  <div dir="ltr" className="mx-auto max-w-sm space-y-4 pt-8 text-center" data-testid="quiz-language-choice">
    <p className="text-5xl">🌐</p>
    <h1 className="text-xl font-black text-slate-900">Which language for the questions?</h1>
    <p className="text-sm font-semibold text-slate-500">You can pick again next time you open the app.</p>
    <button type="button" onClick={() => setQuizLang('en')} className="w-full rounded-3xl bg-gradient-to-l from-sky-500 to-blue-600 p-4 text-lg font-black text-white shadow-[0_5px_0_rgba(0,0,0,0.2)] cursor-pointer">English questions</button>
    <button type="button" onClick={() => setQuizLang('ar')} className="w-full rounded-3xl bg-gradient-to-l from-emerald-500 to-emerald-600 p-4 text-lg font-black text-white shadow-[0_5px_0_rgba(0,0,0,0.2)] cursor-pointer">الأسئلة بالعربي (Arabic questions)</button>
  </div>
);

/** The quiz. An app in English first asks which language the questions should be in. */
export const QuizGame: React.FC = () => {
  const isAr = useIsAr();
  const lang = useQuizLang();
  if (!isAr && lang === null) return <QuizLanguageChoice />;
  return <QuizGameInner />;
};

const QuizGameInner: React.FC = () => {
  const isAr = useIsAr();
  const quizLang = useQuizLang();
  const SECTIONS = useMemo(() => BASE_SECTIONS.map((sec) => sectionIn(sec, quizLang)), [quizLang]);
  // Where the player is comes from the address (/quiz/mcq/football ...): the back button and shared links work.
  const route = useRoute();
  const { step, sectionId, moodScore } = parseQuizPath(route.quizPath ?? '');
  const go = (path: string) => navigate(path ? `/quiz/${path}` : '/quiz');
  // The 10 questions of this play, drawn when it starts (never-met ones first, see quizProgress.ts).
  // The section being played (chosen on the sections screen); everything below reads its questions, pictures and key.
  const section = SECTIONS.find((s) => s.id === sectionId) ?? SECTIONS[0];
  // The section of the play in progress: leaving it (back button, another link) ends the play.
  const playSection = useRef(section.id);
  const QUESTIONS = section.questions;
  const QUIZ_KEY = section.key;
  const imageOf = section.imageOf;
  const [deck, setDeck] = useState<Question[]>(() => pickQuestions(SECTIONS[0].key, SECTIONS[0].questions, PLAY_SIZE));
  const stageAtStart = useRef(1);
  const progress = useProgress(QUIZ_KEY);
  const limit = useQuizLimit(QUIZ_KEY);
  const { badges: mine, unseen } = useBadges();
  const catalog = useBadgeCatalog();
  // Every badge on offer (public), with this player's progress laid over it when they are signed in.
  const badges = useMemo<BadgeInfo[]>(
    () => (catalog.length === 0 ? mine : catalog.map((def) => {
      const own = mine.find((b) => b.quiz === def.quiz && b.key === def.key);
      return { ...def, progress: own?.progress ?? 0, earned: own?.earned ?? false, earned_at: own?.earned_at ?? null };
    })),
    [catalog, mine],
  );
  useEffect(() => {
    void refreshBadgeCatalog();
    void refreshLoyalty();
  }, []);
  const [started, setStarted] = useState(false);
  /** True while the 1-2-3 lights and the Deilar logo scene play, before the first question. */
  const [launching, setLaunching] = useState(false);
  const [index, setIndex] = useState(0);
  const [picked, setPicked] = useState<number | null>(null);
  const [score, setScore] = useState(0);
  const [rightCount, setRightCount] = useState(0);
  const [streak, setStreak] = useState(0);
  const [finished, setFinished] = useState(false);
  const [sound, setSound] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  /** Points the last answer won or lost, and when the open question's clock started. */
  const [gained, setGained] = useState(0);
  const questionStart = useRef(Date.now());
  const [timeLeft, setTimeLeft] = useState(SECONDS_PER_QUESTION);
  // How much of the line around the question card is used up: 0 = full time left, 1 = none.
  const spent = useMotionValue(0);
  const beep = useBeep(sound);
  // The clock effect below lives for a whole question, so it reads the latest beep (sound on / off) through a ref.
  const beepRef = useRef(beep);
  beepRef.current = beep;
  // The line's colour follows the time left: calm blue → green → yellow → orange → red.
  const lineColor = useTransform(spent, [0, 0.4, 0.6, 0.75, 1], ['#38bdf8', '#22c55e', '#facc15', '#f97316', '#ef4444']);
  const session = useSession();
  const playId = useRef(newId());
  const loyalty = useLoyalty();
  const plays = useQuizHistory();
  const { entries: serverEntries } = useLoyaltyHistory();
  const queuedPlays = useQueuedPlayIds();
  // The points scenes this player has really got: the result of every play they finished (on this phone or in their account).
  const seenScenes = useMemo(() => {
    const scores = new Set<number>();
    plays.forEach((p) => {
      if (p.completed) scores.add(sceneFor(p.points).score);
    });
    serverEntries.forEach((e) => {
      if (e.type === 'play' && e.right + e.wrong >= PLAY_SIZE) scores.add(sceneFor(e.points).score);
    });
    return scores;
  }, [plays, serverEntries]);
  // One log in time order: what the backend holds (plays, badges and their reward, points from the admin), plus plays
  // still on this phone that have not been uploaded yet.
  const log = useMemo<LogLine[]>(() => {
    const titleOf = (quiz: string | null) => `${isAr ? 'اختيار من متعدد' : 'Multiple choice'} · ${SECTIONS.find((x) => x.key === quiz)?.title ?? SECTIONS[0].title}`;
    const onServer = new Set(serverEntries.flatMap((e) => (e.type === 'play' ? [e.play_id] : [])));
    const lines: LogLine[] = serverEntries.map((e, i): LogLine => {
      if (e.type === 'play') return { kind: 'play', key: `s-${e.play_id}`, at: e.at, title: titleOf(e.quiz), right: e.right, wrong: e.wrong, points: e.points, completed: e.right + e.wrong >= PLAY_SIZE, synced: !queuedPlays.has(e.play_id) };
      if (e.type === 'badge') return { kind: 'badge', key: `b-${e.quiz}-${e.key}-${i}`, at: e.at, title: badgeTitle(e, isAr), icon: badgeIcon(e), points: e.points, synced: true };
      if (e.type === 'wallet') return { kind: 'wallet', key: `w-${e.at}-${i}`, at: e.at, points: e.points, synced: true };
      if (e.type === 'transfer') return { kind: 'transfer', key: `t-${e.at}-${i}`, at: e.at, points: e.points, synced: true };
      return { kind: 'admin', key: `a-${e.at}-${i}`, at: e.at, points: e.points, note: e.note, synced: true };
    });

    plays.filter((p) => !onServer.has(p.id)).forEach((p) => lines.push({ kind: 'play', key: `l-${p.id}`, at: p.played_at, title: p.title, right: p.right, wrong: p.wrong, points: p.points, completed: p.completed, synced: false }));

    return lines.sort((a, b) => b.at.localeCompare(a.at));
  }, [serverEntries, plays, queuedPlays]);
  // A real card, not the placeholder a sign-in leaves: only these players already have somewhere for their points.
  const isMember = !!session.token && !!session.cardNumber;

  const q = deck[index];
  const design: Design = q.design in LOOKS ? q.design : 'cards';
  const look = LOOKS[design];
  const answered = picked !== null || timedOut;
  const correct = answered && picked === q.correctAnswerIndex;

  useEffect(() => {
    if (finished) {
      void flushQuizAnswers();
      logPlay(deck.length, true);
    }
    if (finished && rightCount >= deck.length / 2) beep([523, 659, 784, 1047]);
  }, [finished]); // eslint-disable-line react-hooks/exhaustive-deps

  // The clock of the open question: it runs only until an answer is given.
  useEffect(() => {
    if (!started || launching || finished || answered) return;
    setTimeLeft(SECONDS_PER_QUESTION);
    questionStart.current = Date.now();
    spent.set(0);
    const line = animate(spent, 1, { duration: SECONDS_PER_QUESTION, ease: 'linear' });
    const tick = setInterval(() => setTimeLeft((t) => Math.max(0, t - 1)), 1000);
    const warnings = WARNING_BEEPS_MS.map((at, i) => setTimeout(() => beepRef.current([880 + i * 70]), at));
    const stop = setTimeout(() => {
      setTimedOut(true);
      book(false, true, SECONDS_PER_QUESTION);
      setGained(quizPoints(false));
      setScore((p) => p + quizPoints(false));
      setStreak(0);
      beep([300, 220]);
    }, SECONDS_PER_QUESTION * 1000);

    return () => {
      line.stop();
      clearInterval(tick);
      clearTimeout(stop);
      warnings.forEach(clearTimeout);
    };
  }, [started, launching, finished, index, answered]); // eslint-disable-line react-hooks/exhaustive-deps

  // After the right / wrong sign, the next question comes by itself.
  useEffect(() => {
    if (!answered || finished) return;
    const go = setTimeout(next, FEEDBACK_MS);
    return () => clearTimeout(go);
  }, [answered, finished, index]); // eslint-disable-line react-hooks/exhaustive-deps

  /** Files one answer: in the stage progress, and in the queue that goes up to the backend. */
  function book(correct: boolean, timedOutAnswer: boolean, seconds: number) {
    const { stage } = recordProgress(QUIZ_KEY, QUESTIONS, q.id, correct);
    recordQuizAnswer({ play_id: playId.current, quiz: QUIZ_KEY, question_id: q.id, correct, timed_out: timedOutAnswer, seconds, stage });
  }

  const choose = (i: number) => {
    if (answered) return;
    setPicked(i);

    const seconds = Math.min(SECONDS_PER_QUESTION, Math.max(0, Math.round(((Date.now() - questionStart.current) / 1000) * 100) / 100));
    book(i === q.correctAnswerIndex, false, seconds);
    const won = quizPoints(i === q.correctAnswerIndex, seconds);
    setGained(won);

    if (i === q.correctAnswerIndex) {
      setScore((p) => p + won);
      setRightCount((c) => c + 1);
      setStreak((s) => s + 1);
      beep([660, 880]);
    } else {
      setScore((p) => p + won);
      setStreak(0);
      beep([300, 220]);
    }
  };

  /** Files this play in the log: when it was played and the points it won or lost. `answeredSoFar` is how many questions were answered. */
  const logPlay = (answeredSoFar: number, completed: boolean, rightSoFar = rightCount, pointsSoFar = score) => {
    if (answeredSoFar === 0) return;
    savePlay({ id: playId.current, played_at: new Date().toISOString(), quiz: QUIZ_KEY, title: `${isAr ? 'اختيار من متعدد' : 'Multiple choice'} · ${section.title}`, right: rightSoFar, wrong: answeredSoFar - rightSoFar, completed, points: pointsSoFar });
  };

  const next = () => {
    if (index + 1 >= deck.length) return setFinished(true);
    setIndex(index + 1);
    setPicked(null);
    setTimedOut(false);
  };

  /** Starts a play when the section's daily allowance has one left (and counts it); false when it is used up. */
  const restart = (): boolean => {
    if (limit.left <= 0) return false;
    registerPlay(QUIZ_KEY);
    playSection.current = section.id;
    playId.current = newId();
    stageAtStart.current = progress.stage;
    setDeck(pickQuestions(QUIZ_KEY, QUESTIONS, PLAY_SIZE));
    setIndex(0);
    setPicked(null);
    setTimedOut(false);
    setScore(0);
    setRightCount(0);
    setStreak(0);
    setFinished(false);
    setStarted(true);
    setLaunching(true);
    return true;
  };

  /** Ends the play in progress (a play left half-way is still logged). */
  const exitPlay = () => {
    if (!started) return;
    setLaunching(false);
    if (!finished) logPlay(index + (answered ? 1 : 0), false);
    setStarted(false);
    setLaunching(false);
    setFinished(false);
    setIndex(0);
    setPicked(null);
    setTimedOut(false);
    setScore(0);
    setRightCount(0);
    setStreak(0);
  };

  // While a play is on, pulling the page down must not reload it (the play would be lost).
  useEffect(() => (started && !finished ? blockPullToRefresh() : undefined), [started, finished]);

  // The address changed away from the play (the browser's back button, a link): the play ends.
  useEffect(() => {
    if (started && (step !== 'intro' || section.id !== playSection.current)) exitPlay();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route.quizPath]);

  const goBack = () => {
    if (started) {
      exitPlay();
      go('mcq');
    } else if (step === 'intro') go('mcq');
    else if (step === 'moods' && moodScore !== null) go('moods');
    else if (step === 'sections' || step === 'history' || step === 'badges' || step === 'moods') go('');
    else if (history.length > 1) history.back();
    else navigate('/');
  };

  const ratio = rightCount / deck.length;
  const stars = ratio >= 0.9 ? 3 : ratio >= 0.6 ? 2 : ratio >= 0.3 ? 1 : 0;

  return (
    <div dir={isAr ? 'rtl' : 'ltr'} className={`relative min-h-[80vh] pb-24 pt-1 ${isAr ? 'text-right' : 'text-left'}`}>
      <div className="flex items-center justify-between mb-1.5">
        <button onClick={goBack} className="flex items-center gap-1 text-sm font-bold text-[#931A47] cursor-pointer">
          <ArrowRight className={`w-4 h-4 ${isAr ? '' : 'rotate-180'}`} /> {isAr ? 'رجوع' : 'Back'}
        </button>
        <button onClick={() => setSound((s) => !s)} className="w-8 h-8 rounded-full bg-white border border-slate-200 flex items-center justify-center cursor-pointer" aria-label={isAr ? 'الصوت' : 'Sound'}>
          {sound ? <Volume2 className="w-4 h-4 text-slate-700" /> : <VolumeX className="w-4 h-4 text-slate-400" />}
        </button>
      </div>

      <AnimatePresence mode="wait">
        {!started && step === 'types' && (
          <motion.div key="types" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <PointsBalance total={loyalty.total} pending={loyalty.pending} signedIn={!!session.token} egp={loyalty.egp} />
            <WalletPanel signedIn={!!session.token} />
            {!!session.token && <TransfersPanel />}
            <h1 className="text-xl font-black text-slate-900">{isAr ? '🎮 اختر نوع اللعبة' : '🎮 Choose the game'}</h1>
            <motion.button whileTap={{ scale: 0.96 }} onClick={() => go('mcq')} className="w-full flex items-center gap-3 p-4 rounded-3xl bg-gradient-to-l from-violet-500 to-purple-600 text-white shadow-[0_5px_0_rgba(0,0,0,0.2)] cursor-pointer">
              <span className="text-4xl">🎯</span>
              <span className="flex-1 text-right"><span className="block text-lg font-black">{isAr ? 'اختيار من متعدد' : 'Multiple choice'}</span><span className="block text-xs font-semibold text-white/80">{isAr ? 'اختر الإجابة الصحيحة من 4 اختيارات' : 'Pick the right answer out of 4'}</span></span>
              <span className="text-xl">◀</span>
            </motion.button>
          </motion.div>
        )}

        {!started && step === 'types' && (
          <motion.div key="types-more" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-3 space-y-3">
            <button onClick={() => { void refreshHistory(); void refreshLoyalty(); go('history'); }} className="w-full flex items-center gap-3 p-4 rounded-3xl bg-white border-2 border-slate-200 text-slate-800 cursor-pointer">
              <span className="text-3xl">📜</span>
              <span className="flex-1 text-right"><span className="block text-base font-black">{isAr ? 'سجل اللعب والتقدم' : 'Play history & progress'}</span><span className="block text-xs font-semibold text-slate-500">{isAr ? `${plays.length} مرة لعب · المرحلة ${progress.stage} · حليت ${progress.solved.length}` : `${plays.length} plays · stage ${progress.stage} · ${progress.solved.length} solved`}</span></span>
              <span className="text-xl">◀</span>
            </button>
            <button onClick={() => go('moods')} className="w-full flex items-center gap-3 p-4 rounded-3xl bg-white border-2 border-fuchsia-200 text-slate-800 cursor-pointer">
              <span className="text-3xl">🎭</span>
              <span className="flex-1 text-right"><span className="block text-base font-black">{isAr ? 'شاشات النقاط' : 'Points screens'}</span><span className="block text-xs font-semibold text-slate-500">{isAr ? '20 شاشة تفاعلية للربح والخسارة' : '20 interactive win and lose screens'}</span></span>
              <span className="text-xl">◀</span>
            </button>
            <button onClick={() => { markBadgesSeen(badges.filter((b) => b.earned)); void refreshLoyalty(); go('badges'); }} className="relative w-full flex items-center gap-3 p-4 rounded-3xl bg-white border-2 border-amber-200 text-slate-800 cursor-pointer">
              <span className="text-3xl">🏅</span>
              <span className="flex-1 text-right"><span className="block text-base font-black">{isAr ? 'كل الشارات' : 'All badges'}</span><span className="block text-xs font-semibold text-slate-500">{badges.length === 0 ? (isAr ? 'شوف الشارات اللي تقدر تكسبها وهداياها' : 'See the badges you can earn and their gifts') : isAr ? `حصلت على ${badges.filter((b) => b.earned).length} من ${badges.length} شارة` : `You earned ${badges.filter((b) => b.earned).length} of ${badges.length} badges`}</span></span>
              {unseen.length > 0 && <span className="rounded-full bg-red-500 px-2 py-0.5 text-xs font-black text-white">{unseen.length} {isAr ? 'جديدة' : 'new'}</span>}
              <span className="text-xl">◀</span>
            </button>
          </motion.div>
        )}

        {!started && step === 'moods' && (
          <motion.div key="moods" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
            <PointsGallery selected={moodScore} onSelect={(score) => go(score === null ? 'moods' : `moods/${score}`)} seen={seenScenes} shareFor={(s) => resultShareText(s, null, PLAY_SIZE, sceneFor(s).emoji, section.topic, isAr)} />
          </motion.div>
        )}

        {!started && step === 'badges' && (
          <motion.div key="badges" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <h1 className="text-xl font-black text-slate-900">{isAr ? '🏅 كل الشارات' : '🏅 All badges'}</h1>
            {badges.length === 0 && (
              <p className="rounded-2xl bg-slate-50 border border-slate-200 p-4 text-sm font-bold text-slate-600">
                {isAr ? 'مقدرناش نحمّل الشارات دلوقتي. اتأكد من الاتصال بالإنترنت وجرّب تاني.' : 'We could not load the badges now. Check your connection and try again.'}
              </p>
            )}
            {badges.length > 0 && !session.token && (
              <p className="rounded-2xl bg-amber-50 border border-amber-200 p-3 text-xs font-bold text-amber-900">
                {isAr ? 'دي كل الشارات اللي تقدر تكسبها وهدية نقاط الولاء لكل واحدة. سجّل بياناتك واعمل كارت العضوية التجريبي المجاني عشان تتسجل شاراتك وتاخد هداياها.' : 'These are all the badges you can earn, with a loyalty-points gift for each. Fill in your details and get the free trial card so your badges are saved and you get the gifts.'}
              </p>
            )}
            {SECTIONS.map((sec) => {
              const mine = badges.filter((b) => b.quiz === sec.key);
              if (mine.length === 0) return null;
              return (
                <div key={sec.id} className="rounded-3xl bg-white border border-slate-200 p-3 shadow-2xs">
                  <h2 className="text-base font-black text-slate-900">{sec.emoji} {sec.title}</h2>
                  {/* Each kind of badge is a ladder: its levels from the lowest threshold up, as the backend lists them. */}
                  {BADGE_KIND_ORDER.map((kind) => {
                    const levels = mine.filter((b) => b.kind === kind).sort((x, y) => x.threshold - y.threshold);
                    if (levels.length === 0) return null;
                    const next = levels.find((b) => !b.earned);
                    return (
                      <div key={kind} className="mt-3 rounded-2xl border border-slate-200 p-2.5">
                        <div className="mb-2 flex items-center justify-between">
                          <p className="text-sm font-black text-slate-900">{BADGE_ICONS[kind]} {(isAr ? BADGE_KIND_TITLES : BADGE_KIND_TITLES_EN)[kind]}</p>
                          <span className="text-xs font-bold text-slate-500">{levels.filter((b) => b.earned).length}/{levels.length} {isAr ? 'مراحل' : 'levels'}</span>
                        </div>
                        <div className="grid grid-cols-5 gap-1.5">
                          {levels.map((b, i) => {
                            const tier = BADGE_TIERS[Math.min(i, BADGE_TIERS.length - 1)];
                            return (
                              <div key={b.key} title={badgeTitle(b, isAr)} className={`flex flex-col items-center rounded-xl border-2 px-1 py-2 text-center ${b.earned ? tier.earned : 'border-slate-200 bg-slate-50'}`}>
                                <span className={`text-2xl leading-none ${b.earned ? '' : 'grayscale opacity-60'}`}>{b.icon || tier.medal}</span>
                                <span className="mt-1 text-sm font-black text-slate-900" dir="ltr">{b.threshold}</span>
                                <span className="text-[10px] font-bold leading-tight text-slate-500">{b.title || (isAr ? tier.name : tier.nameEn)}</span>
                                {b.reward_points > 0 && <span className="mt-0.5 text-[10px] font-black text-emerald-600" dir="ltr">🎁 +{b.reward_points}</span>}
                                {b.earned && <span className="text-[10px] font-black text-emerald-600">✔</span>}
                              </div>
                            );
                          })}
                        </div>
                        {next && session.token && (
                          <div className="mt-2">
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                              <div className="h-full bg-amber-400" style={{ width: `${Math.min(100, (next.progress / next.threshold) * 100)}%` }} />
                            </div>
                            <p className="mt-0.5 text-[10px] font-bold text-slate-500" dir="ltr">{next.progress}/{next.threshold}</p>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </motion.div>
        )}

        {!started && step === 'history' && (
          <motion.div key="history" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-2.5">
            <h1 className="text-xl font-black text-slate-900">{isAr ? '📜 سجل اللعب' : '📜 Play history'}</h1>

            {SECTIONS.map((sec) => <ProgressPanel key={sec.id} sec={sec} />)}

            {log.length === 0 && <p className="rounded-2xl bg-slate-50 p-4 text-center text-sm font-bold text-slate-500">{isAr ? 'لسه ما لعبتش. العب أول مرة وهتظهر هنا.' : 'You have not played yet. Play your first game and it will show here.'}</p>}
            {log.map((line) => {
              const when = new Date(line.at).toLocaleString('ar-EG', { dateStyle: 'medium', timeStyle: 'short' });
              const tone = line.points >= 0 ? 'bg-emerald-500' : 'bg-red-500';
              const points = line.points > 0 ? `+${line.points}` : `${line.points}`;

              if (line.kind === 'play') {
                return (
                  <div key={line.key} className="flex items-center gap-3 rounded-2xl bg-white border border-slate-200 p-3 shadow-2xs">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white shrink-0 ${tone}`} dir="ltr">{points}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-slate-900 truncate">🎮 {line.title}</p>
                      <p className="text-xs font-semibold text-slate-500">{when}</p>
                      <p className="text-xs font-bold mt-0.5"><span className="text-emerald-600">✅ {line.right} {isAr ? 'صح' : 'right'}</span> <span className="text-red-600">❌ {line.wrong} {isAr ? 'غلط' : 'wrong'}</span>{!line.completed && <span className="text-slate-400"> · {isAr ? 'غير مكتملة' : 'unfinished'}</span>}</p>
                    </div>
                    <SyncChip synced={line.synced} signedIn={!!session.token} />
                  </div>
                );
              }

              if (line.kind === 'badge') {
                return (
                  <div key={line.key} className="flex items-center gap-3 rounded-2xl bg-amber-50 border-2 border-amber-300 p-3 shadow-2xs">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-3xl bg-white shrink-0">{line.icon}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-amber-900">{isAr ? 'شارة:' : 'Badge:'} {line.title}</p>
                      <p className="text-xs font-semibold text-slate-500">{when}</p>
                    </div>
                    {line.points > 0 && <span className="rounded-xl bg-emerald-500 px-2.5 py-1 text-sm font-black text-white" dir="ltr">{points} 🎁</span>}
                    <SyncChip synced={line.synced} signedIn={!!session.token} />
                  </div>
                );
              }

              if (line.kind === 'wallet') {
                return (
                  <div key={line.key} className="flex items-center gap-3 rounded-2xl bg-violet-50 border-2 border-violet-300 p-3 shadow-2xs">
                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white shrink-0 bg-violet-600" dir="ltr">{points}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-violet-900">{isAr ? '👛 تحويل نقاط إلى المحفظة' : '👛 Points converted to the wallet'}</p>
                      <p className="text-xs font-semibold text-slate-500">{when}</p>
                    </div>
                    <SyncChip synced={line.synced} signedIn={!!session.token} />
                  </div>
                );
              }

              if (line.kind === 'transfer') {
                return (
                  <div key={line.key} className="flex items-center gap-3 rounded-2xl bg-indigo-50 border-2 border-indigo-300 p-3 shadow-2xs">
                    <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white shrink-0 ${tone}`} dir="ltr">{points}</div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-black text-indigo-900">{line.points < 0 ? (isAr ? '↗️ تحويل نقاط إلى عضو' : '↗️ Points sent to a member') : isAr ? '↙️ نقاط وصلتك من عضو' : '↙️ Points received from a member'}</p>
                      <p className="text-xs font-semibold text-slate-500">{when}</p>
                    </div>
                    <SyncChip synced={line.synced} signedIn={!!session.token} />
                  </div>
                );
              }

              return (
                <div key={line.key} className="flex items-center gap-3 rounded-2xl bg-sky-50 border-2 border-sky-300 p-3 shadow-2xs">
                  <div className={`w-14 h-14 rounded-2xl flex items-center justify-center text-lg font-black text-white shrink-0 ${tone}`} dir="ltr">{points}</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black text-sky-900">{isAr ? '🎁 نقاط ولاء من الإدارة' : '🎁 Loyalty points from the admin'}</p>
                    <p className="text-xs font-semibold text-slate-500">{when}</p>
                    {line.note && <p className="text-xs font-bold text-slate-700 mt-0.5">{line.note}</p>}
                  </div>
                  <SyncChip synced={line.synced} signedIn={!!session.token} />
                </div>
              );
            })}
          </motion.div>
        )}

        {!started && step === 'sections' && (
          <motion.div key="sections" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="space-y-3">
            <h1 className="text-xl font-black text-slate-900">{isAr ? '🎯 اختيار من متعدد' : '🎯 Multiple choice'}</h1>
            <p className="text-sm font-semibold text-slate-500">{isAr ? 'اختر القسم' : 'Choose a section'}</p>
            {!isAr && <button type="button" onClick={() => setQuizLang(null)} className="text-xs font-bold text-sky-700 underline cursor-pointer">{quizLang === 'en' ? 'Questions: English — change' : 'Questions: Arabic — change'}</button>}
            {SECTIONS.map((sec) => (
              <motion.button key={sec.id} whileTap={{ scale: 0.96 }} onClick={() => go(`mcq/${sec.id}`)} className={`w-full flex items-center gap-3 p-4 rounded-3xl bg-gradient-to-l ${sec.color} text-white shadow-[0_5px_0_rgba(0,0,0,0.2)] cursor-pointer`}>
                <motion.span animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 1.2 }} className="text-4xl">{sec.emoji}</motion.span>
                <span className="flex-1 text-right"><span className="block text-lg font-black">{sec.title}</span><SectionProgressLine sec={sec} /></span>
                <span className="text-xl">◀</span>
              </motion.button>
            ))}
          </motion.div>
        )}

        {!started && step === 'intro' && (
          <motion.div key="intro" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className={`rounded-3xl bg-gradient-to-b ${section.introBg} p-6 text-center text-white shadow-lg overflow-hidden relative`}>
            <motion.div animate={{ y: [0, -22, 0], rotate: [0, 360] }} transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }} className="text-7xl mb-2 inline-block">{section.emoji}</motion.div>
            <h1 className="text-2xl font-black mb-1">{section.introTitle}</h1>
            <p className="text-sm font-semibold text-emerald-50 mb-2">{isAr ? `جاوب على ${PLAY_SIZE} أسئلة واجمع النقاط!` : `Answer ${PLAY_SIZE} questions and collect points!`}</p>
            <p className="text-xs font-bold text-white/90 mb-4">{isAr ? '⚡ كل ما تجاوب أسرع تكسب أكتر:' : '⚡ The faster you answer, the more you earn:'} {QUIZ_SPEED_TIERS.map((t) => `${t.upTo}${isAr ? 'ث' : 's'} = ${t.points}`).join(' · ')}</p>
            <p className="-mt-3 mb-1 text-xs font-bold text-emerald-100">{isAr ? `المرحلة ${progress.stage} · حليت ${progress.solved.length} سؤال` : `Stage ${progress.stage} · ${progress.solved.length} solved`}</p>
            <p className="mb-4 text-xs font-black text-white">{limit.locked ? (isAr ? '🔒 خلصت محاولات النهارده' : '🔒 No plays left today') : isAr ? `🎮 باقي ${limit.left} من ${PLAYS_PER_DAY} محاولات النهارده` : `🎮 ${limit.left} of ${PLAYS_PER_DAY} plays left today`}</p>
            <div className="grid grid-cols-3 gap-2 mb-5 empty:hidden">
              {introImages(section).map((src, i) => (
                <motion.img key={src} src={src} alt="" initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.2 + i * 0.15 }} className="rounded-2xl border-4 border-white/70 aspect-square object-cover" />
              ))}
            </div>
            {limit.locked ? (
              <LockedPanel title={section.title} msLeft={limit.msLeft} />
            ) : (
              <motion.button whileTap={{ scale: 0.92 }} animate={{ scale: [1, 1.07, 1] }} transition={{ repeat: Infinity, duration: 1.3 }} onClick={() => { if (restart()) beep([523, 659]); }} className="w-full py-4 rounded-2xl bg-amber-400 text-emerald-900 text-xl font-black shadow-[0_6px_0_#b45309] active:translate-y-1 active:shadow-none cursor-pointer">
                {isAr ? 'ابدأ اللعب 🎮' : 'Start playing 🎮'}
              </motion.button>
            )}
          </motion.div>
        )}

        {started && !finished && !launching && (
          <motion.div key={`q${index}`} initial={{ opacity: 0, x: -60 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 60 }} transition={{ type: 'spring', stiffness: 200, damping: 22 }}>
            <div className="flex items-center gap-2 mb-2">
              <div className="flex-1 h-3 rounded-full bg-slate-200 overflow-hidden">
                <motion.div className="h-full rounded-full bg-gradient-to-l from-amber-400 to-emerald-500" animate={{ width: `${((index + (answered ? 1 : 0)) / deck.length) * 100}%` }} />
              </div>
              <span className="text-xs font-black text-slate-600">{index + 1}/{deck.length}</span>
              <span className={`relative flex items-center gap-1 text-sm font-black ${score < 0 ? 'text-red-600' : 'text-amber-600'}`}>
                <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                <span dir="ltr">{score}</span>
                <AnimatePresence>
                  {answered && (
                    <motion.span key={`delta-${index}`} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: -26 }} exit={{ opacity: 0 }} transition={{ duration: 0.7 }} dir="ltr" className={`absolute -top-1 left-0 text-lg font-black ${correct ? 'text-emerald-500' : 'text-red-500'}`}>
                      {gained > 0 ? `+${gained}` : `${gained}`}
                    </motion.span>
                  )}
                </AnimatePresence>
              </span>
            </div>

            <div className={`rounded-3xl p-2.5 overflow-hidden relative ${look.wrap}`}>
              {/* The clock: a line that runs round the card's border and is used up in SECONDS_PER_QUESTION seconds. */}
              <svg className="absolute inset-0 w-full h-full z-20 pointer-events-none" aria-hidden>
                <motion.rect x="0" y="0" width="100%" height="100%" rx="24" fill="none" strokeWidth="8" strokeLinecap="round" pathLength={1} strokeDasharray={1} style={{ strokeDashoffset: spent, stroke: lineColor }} />
              </svg>
              <AnimatePresence>
                {answered && (
                  <motion.div initial={{ opacity: 0, scale: 0.4 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }} transition={{ type: 'spring', stiffness: 300, damping: 15 }} className="absolute inset-0 z-30 flex items-center justify-center bg-black/35 pointer-events-none">
                    <div className={`rounded-2xl px-6 py-3 text-center text-3xl font-black text-white shadow-xl ${correct ? 'bg-emerald-500' : timedOut ? 'bg-orange-500' : 'bg-red-500'}`}>
                      {correct ? (isAr ? '✅ صح!' : '✅ Right!') : timedOut ? (isAr ? '⏰ انتهى الوقت!' : '⏰ Time is up!') : isAr ? '❌ غلط!' : '❌ Wrong!'}
                      <span dir="ltr" className="block text-lg mt-0.5">{gained > 0 ? `+${gained}` : `${gained}`}</span>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
              {design === 'poster' && (
                <>
                  {q.image && imageOf(q.image) ? <img src={imageOf(q.image)} alt="" className="absolute inset-0 w-full h-full object-cover" /> : <div className="absolute inset-0 bg-gradient-to-br from-rose-600 to-indigo-700" />}
                  <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/55 to-black/85" />
                </>
              )}
              {design === 'stadium' && <div className="absolute inset-0 opacity-20 [background:repeating-linear-gradient(90deg,transparent_0_28px,#fff_28px_30px)]" />}

              <div className="relative">
                <div className={`flex items-center gap-2 mb-1.5 ${design === 'bubbles' || design === 'polaroid' ? 'justify-center' : ''}`}>
                  <span className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-black text-white ${difficultyLook(q.difficulty, isAr).pill}`} title={isAr ? `الصعوبة ${q.difficulty} من 10` : `Difficulty ${q.difficulty} of 10`}>
                    {difficultyLook(q.difficulty, isAr).label}
                    <span className="flex gap-px" dir="ltr" aria-hidden>
                      {Array.from({ length: 10 }, (_, n) => (
                        <span key={n} className={`h-2.5 w-1 rounded-sm ${n < q.difficulty ? difficultyLook(q.difficulty, isAr).bar : 'bg-white/25'}`} />
                      ))}
                    </span>
                  </span>
                  {streak >= 2 && <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-orange-500 text-white">🔥 {streak}</span>}
                </div>

                <Art design={design} q={q} imageOf={imageOf} />
                {design === 'poster' && <div className="h-24 flex items-center justify-center text-5xl">{!(q.image && imageOf(q.image)) && <motion.span animate={{ scale: [1, 1.2, 1] }} transition={{ repeat: Infinity, duration: 1.6 }}>{q.emoji || '❓'}</motion.span>}</div>}

                <h2 className={`text-base font-black leading-snug ${look.title}`} dir="auto">{q.question}</h2>
              </div>
            </div>

            <div className="mt-2.5 grid grid-cols-2 gap-2">
              {q.options.map((opt, i) => {
                const isRight = correct && i === q.correctAnswerIndex;
                const isWrong = answered && i === picked && !correct;
                return (
                  <motion.button
                    key={i}
                    disabled={answered}
                    onClick={() => choose(i)}
                    initial={{ opacity: 0, y: 20 }}
                    animate={isWrong ? { opacity: 1, y: 0, x: [0, -10, 10, -8, 8, 0] } : isRight ? { opacity: 1, y: 0, scale: [1, 1.06, 1] } : { opacity: answered ? 0.45 : 1, y: 0, rotate: look.tilt ? (i % 2 ? 1.5 : -1.5) : 0 }}
                    transition={{ delay: answered ? 0 : i * 0.07, duration: answered ? 0.5 : undefined }}
                    whileTap={{ scale: 0.95 }}
                    className={`flex items-center gap-1.5 px-2 py-2 min-h-14 text-sm leading-tight font-extrabold text-right cursor-pointer ${optionClass(design, i, isRight, isWrong)}`}
                  >
                    <span className="text-base shrink-0">{isRight ? '✅' : isWrong ? '❌' : design === 'stadium' ? 'ABCD'[i] : OPTION_SHAPES[i]}</span>
                    <span className="flex-1" dir="auto">{opt}</span>
                  </motion.button>
                );
              })}
            </div>

          </motion.div>
        )}

        {finished && (
          <motion.div key="end" initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="space-y-3">
            {score > 0 && <Confetti />}
            {/* The scene of this result (one of 20), with the button that shares it. */}
            <PointsMood score={score} shareText={resultShareText(score, rightCount, deck.length, sceneFor(score).emoji, section.topic, isAr)} />

          <div className="rounded-3xl bg-gradient-to-b from-amber-300 via-amber-400 to-orange-500 p-5 text-center shadow-lg">
            <div className="flex justify-center gap-2 mb-3">
              {[1, 2, 3].map((n) => (
                <motion.div key={n} initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} transition={{ delay: 0.3 + n * 0.25, type: 'spring' }}>
                  <Star className={`w-14 h-14 ${n <= stars ? 'fill-white text-white' : 'fill-amber-200/40 text-amber-200'}`} />
                </motion.div>
              ))}
            </div>
            <p dir="ltr" className="text-5xl font-black text-white">{score} <span className="text-2xl">{isAr ? 'نقطة ولاء' : 'loyalty points'}</span></p>
            <p className="text-sm font-bold text-white/90 mb-4">{isAr ? `${rightCount} إجابة صحيحة من ${deck.length}` : `${rightCount} right answers out of ${deck.length}`}</p>

            {progress.stage > stageAtStart.current && (
              <p className="mb-3 rounded-2xl bg-white/90 px-3 py-2 text-sm font-black text-emerald-700">{isAr ? `🎉 خلصت كل أسئلة القسم! بدأت المرحلة ${progress.stage} بكل الأسئلة من جديد.` : `🎉 You finished every question in this section! Stage ${progress.stage} starts with all the questions again.`}</p>
            )}
            {unseen.length > 0 && (
              <div className="mb-3 rounded-2xl bg-white/90 px-3 py-2 text-sm font-black text-amber-700">
                {isAr ? '🏅 شارة جديدة!' : '🏅 New badge!'}
                {unseen.map((b) => <span key={`${b.quiz}${b.key}`} className="block text-xs">{badgeIcon(b)} {badgeTitle(b, isAr)}{b.reward_points > 0 && <span dir="ltr"> · 🎁 +{b.reward_points} {isAr ? 'نقطة' : 'points'}</span>}</span>)}
              </div>
            )}

            {isMember ? (
              <p className="mb-4 rounded-2xl bg-white/25 px-3 py-2 text-sm font-bold text-white">
                {isAr ? '🎁 رصيد نقاط الولاء في حسابك:' : '🎁 Loyalty points in your account:'} <span dir="ltr">{loyalty.total}</span>
                {loyalty.egp > 0 && <> (≈ <span dir="ltr">{formatEgp(loyalty.egp)}</span> {isAr ? 'جنيه' : 'EGP'})</>}
              </p>
            ) : (
              <div className="mb-4 rounded-2xl bg-white p-4 text-right shadow-md">
                <p className="text-sm font-black text-slate-900">{isAr ? '🎁 احتفظ بنقاطك!' : '🎁 Keep your points!'}</p>
                <p className="mt-1 text-xs font-semibold leading-relaxed text-slate-600">
                  {isAr ? 'النقاط دي محفوظة على موبايلك. املأ بياناتك واعمل كارت العضوية التجريبي المجاني عشان تتسجل في حسابك وتقدر تستفيد بيها بعدين.' : 'These points are saved on your phone. Fill in your details and get the free trial card so they are recorded in your account and you can use them later.'}
                </p>
                <motion.button whileTap={{ scale: 0.95 }} onClick={() => navigate('/card')} className="mt-3 w-full rounded-xl bg-[#931A47] py-3 text-base font-black text-white cursor-pointer">
                  {isAr ? 'املأ بياناتي واحتفظ بنقاطي ➜' : 'Fill in my details and keep my points ➜'}
                </motion.button>
              </div>
            )}

            {limit.locked ? (
              <LockedPanel title={section.title} msLeft={limit.msLeft} />
            ) : (
              <motion.button whileTap={{ scale: 0.93 }} onClick={() => void restart()} className="w-full py-4 rounded-2xl bg-white text-orange-600 text-lg font-black shadow-[0_5px_0_#c2410c] flex items-center justify-center gap-2 cursor-pointer">
                <RotateCcw className="w-5 h-5" /> {isAr ? 'العب تاني' : 'Play again'} <span className="text-xs font-bold text-orange-400">({isAr ? 'باقي' : 'left:'} {limit.left})</span>
              </motion.button>
            )}
            <button onClick={() => navigate('/')} className="mt-3 text-sm font-bold text-white/90 underline cursor-pointer">{isAr ? 'الرجوع للرئيسية' : 'Back to home'}</button>
          </div>
          </motion.div>
        )}
      </AnimatePresence>
      <AnimatePresence>{started && launching && <QuizLaunch key="launch" sound={sound} onDone={() => setLaunching(false)} />}</AnimatePresence>
    </div>
  );
};
