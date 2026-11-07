/**
 * The result screens of the quiz. A play is ten questions and each right answer pays 100 / 75 / 50 / 25 points by speed
 * (a wrong one pays 0), so a play's score is a multiple of 25 from 0 to 1000: 41 possible results, one screen each.
 * A score is rounded to the nearest 25; a score below 0 (only if the admin sets a price for wrong answers) uses the 0 screen.
 */
export type Move = 'float' | 'pulse' | 'shake' | 'spin' | 'wobble' | 'bounce' | 'drop';

export interface Scene {
  score: number;
  emoji: string;
  title: string;
  titleEn: string;
  /** Said in turn each time the player taps the face. */
  lines: [string, string, string];
  linesEn: [string, string, string];
  /** Tailwind classes of the background, and the same colours for the picture that is shared. */
  bg: string;
  colors: [string, string, string];
  ink: string;
  drift: string[];
  burst: string[];
  move: Move;
}

interface Band {
  upTo: number;
  bg: string;
  colors: [string, string, string];
  ink: string;
  drift: string[];
  burst: string[];
  lines: [string, string, string];
  linesEn: [string, string, string];
}

const BANDS: Band[] = [
  { upTo: 0, bg: 'from-slate-600 via-gray-500 to-slate-700', colors: ['#475569', '#6b7280', '#334155'], ink: 'text-white', drift: ['💭', '☁️', '🍃'], burst: ['💭', '✨', '⭐'], lines: ['مفيش مشكلة، كل بطل بدأ من الصفر 💪', 'السرعة هي السر: جاوب أسرع وهتكسب أكتر', 'العب تاني وفاجئ نفسك!'], linesEn: ['No problem, every champion started at zero 💪', 'Speed is the secret: answer faster, earn more', 'Play again and surprise yourself!'] },
  { upTo: 100, bg: 'from-emerald-400 via-green-400 to-teal-500', colors: ['#34d399', '#4ade80', '#14b8a6'], ink: 'text-white', drift: ['✨', '🌱', '⭐'], burst: ['✨', '🌱', '⭐'], lines: ['أول نقاطك في الجيب ✨', 'كمّل كده، الجاي أحلى', 'جاوب أسرع تكسب أكتر!'], linesEn: ['Your first points are in the pocket ✨', 'Keep it up, the best is yet to come', 'Answer faster, earn more!'] },
  { upTo: 250, bg: 'from-green-400 via-emerald-500 to-lime-500', colors: ['#4ade80', '#10b981', '#84cc16'], ink: 'text-white', drift: ['⭐', '🍀', '✨'], burst: ['⭐', '🍀', '👏'], lines: ['شغل جميل 👏', 'إيدك على الصح', 'زوّد السرعة شوية!'], linesEn: ['Beautiful work 👏', 'Your hand is on the right answers', 'Speed up a little!'] },
  { upTo: 400, bg: 'from-teal-400 via-cyan-500 to-sky-500', colors: ['#2dd4bf', '#06b6d4', '#0ea5e9'], ink: 'text-white', drift: ['🌟', '✨', '👏'], burst: ['🌟', '👏', '🎉'], lines: ['الجمهور بيصفّق لك 👏', 'ثقة وهدوء وسرعة', 'قرّبت من القمة'], linesEn: ['The crowd is clapping for you 👏', 'Confidence, calm and speed', 'Close to the top'] },
  { upTo: 550, bg: 'from-yellow-400 via-amber-400 to-orange-500', colors: ['#facc15', '#fbbf24', '#f97316'], ink: 'text-white', drift: ['🎉', '🎊', '🎈'], burst: ['🎉', '🎊', '🎈'], lines: ['احتفل! 🎉', 'نص نقاط الكمال في الجيب', 'كمّل وهتوصل'], linesEn: ['Celebrate! 🎉', 'Half of the perfect points are yours', 'Keep going and you will get there'] },
  { upTo: 700, bg: 'from-orange-500 via-red-500 to-rose-600', colors: ['#f97316', '#ef4444', '#e11d48'], ink: 'text-white', drift: ['🔥', '✨', '💥'], burst: ['🔥', '💥', '⭐'], lines: ['ولّعتها! 🔥', 'مفيش حد يوقفك', 'الأسئلة بتخاف منك'], linesEn: ['You lit it up! 🔥', 'Nobody can stop you', 'The questions are afraid of you'] },
  { upTo: 850, bg: 'from-amber-400 via-yellow-500 to-orange-500', colors: ['#fbbf24', '#eab308', '#f97316'], ink: 'text-white', drift: ['🏅', '⭐', '✨'], burst: ['🏅', '⭐', '🥇'], lines: ['ميدالية مستحقة 🏅', 'أداء يستاهل التصفيق', 'خطوة وتبقى ملك'], linesEn: ['A well-earned medal 🏅', 'A performance worth applauding', 'One step and you are royalty'] },
  { upTo: 975, bg: 'from-fuchsia-600 via-purple-600 to-violet-700', colors: ['#c026d3', '#9333ea', '#6d28d9'], ink: 'text-white', drift: ['👑', '💎', '✨'], burst: ['👑', '💎', '🌟'], lines: ['إنت من النخبة 👑', 'غلطة صغيرة بس بينك وبين الكمال', 'ابعتها لصحابك وتحدّاهم!'], linesEn: ['You are among the elite 👑', 'One tiny slip from perfection', 'Send it to your friends and challenge them!'] },
  { upTo: 1000, bg: 'from-yellow-300 via-amber-400 to-yellow-600', colors: ['#fde047', '#fbbf24', '#ca8a04'], ink: 'text-amber-950', drift: ['⚽', '🏆', '🎆'], burst: ['🏆', '⚽', '🎆'], lines: ['10 من 10 وكلها سريعة! 🏆', 'إنت أسطورة', 'ابعتها لصحابك وتحدّاهم!'], linesEn: ['10 out of 10, all of them fast! 🏆', 'You are a legend', 'Send it to your friends and challenge them!'] },
];

const MOVES: Move[] = ['float', 'bounce', 'wobble', 'pulse', 'spin', 'shake', 'drop'];

/** [score, face, title in Arabic, title in English] */
const ROWS: Array<[number, string, string, string]> = [
  [0, '😶', 'لسه بتسخّن', 'Still warming up'],
  [25, '🌱', 'أول خطوة', 'The first step'],
  [50, '🙂', 'بداية حلوة', 'A nice start'],
  [75, '🐣', 'لسه بتفقس!', 'Just hatching!'],
  [100, '😊', 'ماشي صح', 'On the right track'],
  [125, '🍀', 'حظ حلو', 'Lucky charm'],
  [150, '😃', 'ماشي كويس', 'Going well'],
  [175, '🎈', 'خفيف ومبسوط', 'Light and happy'],
  [200, '👏', 'شغل جميل', 'Nice work'],
  [225, '🧠', 'دماغ شغالة', 'Brain at work'],
  [250, '😎', 'لاعب شاطر', 'A clever player'],
  [275, '🎯', 'على الهدف', 'On target'],
  [300, '⚽', 'جووول!', 'Goal!'],
  [325, '🍿', 'عرض حلو', 'A good show'],
  [350, '🤩', 'أداء رائع', 'Great performance'],
  [375, '🎸', 'ماشي بإيقاع', 'In rhythm'],
  [400, '🌈', 'ألوان النصر', 'Colours of victory'],
  [425, '🎊', 'احتفال صغير', 'A small celebration'],
  [450, '💪', 'عضلات المعرفة', 'Muscles of knowledge'],
  [475, '🧭', 'قرّبت من النص', 'Nearing halfway'],
  [500, '🥳', 'نص نقاط الكمال', 'Halfway to perfection'],
  [525, '⚡', 'سريع زي البرق', 'Quick as lightning'],
  [550, '🏎️', 'سرعة عالية', 'High speed'],
  [575, '🔥', 'إنت نار!', 'You are on fire!'],
  [600, '🌋', 'بركان معرفة', 'A volcano of knowledge'],
  [625, '🦁', 'قلب أسد', 'Lion heart'],
  [650, '🦅', 'عين النسر', 'Eagle eye'],
  [675, '🚀', 'صاروخ!', 'A rocket!'],
  [700, '🛸', 'من كوكب تاني', 'Out of this world'],
  [725, '🥉', 'ميدالية برونز', 'Bronze medal'],
  [750, '🥈', 'ميدالية فضة', 'Silver medal'],
  [775, '🥇', 'ميدالية ذهب', 'Gold medal'],
  [800, '🏅', 'بطل بجد!', 'A real champion!'],
  [825, '💎', 'جوهرة', 'A gem'],
  [850, '🌟', 'نجم الليلة', 'Star of the night'],
  [875, '🎆', 'ألعاب نارية', 'Fireworks'],
  [900, '👑', 'ملك الكورة!', 'King of the game!'],
  [925, '🧙', 'ساحر الأسئلة', 'Wizard of questions'],
  [950, '🦄', 'نادر زي اليونيكورن', 'Rare as a unicorn'],
  [975, '🌠', 'على بعد خطوة من الكمال', 'One step from perfect'],
  [1000, '🏆', 'نتيجة كاملة! أسطورة!', 'A perfect score! A legend!'],
];

export const SCENES: Scene[] = ROWS.map(([score, emoji, title, titleEn], i) => {
  const band = BANDS.find((b) => score <= b.upTo)!;
  const [first, ...rest] = band.drift;
  return {
    score, emoji, title, titleEn,
    lines: band.lines, linesEn: band.linesEn,
    bg: band.bg, colors: band.colors, ink: band.ink,
    // Each screen drifts its own face first, then its band's things.
    drift: [emoji, first, ...rest], burst: [emoji, ...band.burst],
    move: score === 1000 ? 'bounce' : MOVES[i % MOVES.length],
  };
});

export const MAX_SCENE_SCORE = 1000;

/** The screen of a play's score: rounded to the nearest 25 and kept between 0 and 1000. */
export function sceneFor(score: number): Scene {
  const steps = Math.min(40, Math.max(0, Math.round(score / 25)));
  return SCENES[steps];
}
