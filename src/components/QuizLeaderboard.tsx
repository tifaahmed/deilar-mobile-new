import React, { useEffect, useState } from 'react';
import { fetchLeaderboard, type Leaderboard } from '../api/leaderboard';
import { useIsAr } from '../context/LanguageContext';
import { useSession } from '../utils/session';

const BIG = [
  { size: 'text-xl', row: 'bg-gradient-to-l from-amber-200 to-yellow-100 border-amber-400', cup: '🏆' },
  { size: 'text-lg', row: 'bg-gradient-to-l from-slate-200 to-slate-50 border-slate-400', cup: '🏆' },
  { size: 'text-lg', row: 'bg-gradient-to-l from-orange-200 to-orange-50 border-orange-400', cup: '🏆' },
];

/** «ترتيبك على مستوى اللعبة»: the player's own place, then everyone who played by loyalty balance; the first three big, with a cup. */
export const QuizLeaderboard: React.FC = () => {
  const isAr = useIsAr();
  const session = useSession();
  const [board, setBoard] = useState<Leaderboard | null>(null);
  const [failed, setFailed] = useState(false);
  const [shown, setShown] = useState(20);

  useEffect(() => {
    let live = true;
    setFailed(false);
    fetchLeaderboard(session.token).then((b) => { if (live) setBoard(b); }).catch(() => { if (live) setFailed(true); });
    return () => { live = false; };
  }, [session.token]);

  if (failed && !board) return null;
  if (!board) return <div className="h-24 animate-pulse rounded-3xl bg-slate-100" aria-hidden />;

  const me = board.me;

  return (
    <section className="rounded-3xl border-2 border-amber-200 bg-white p-3 shadow-2xs" aria-label={isAr ? 'ترتيب اللاعبين' : 'Leaderboard'}>
      <h2 className="text-base font-black text-slate-900">{isAr ? '🏅 ترتيب اللاعبين' : '🏅 Leaderboard'}</h2>
      {session.token && (
        <p className="mt-1 rounded-2xl bg-[#931A47] px-3 py-2 text-sm font-black text-white">
          {me === null
            ? (isAr ? 'العب أول لعبة وهتظهر في الترتيب!' : 'Play your first game and you will appear in the ranking!')
            : me.rank === null
              ? (isAr ? `رصيدك ${me.points} نقطة — اكسب نقاط عشان تدخل الترتيب` : `You have ${me.points} points — earn some to enter the ranking`)
              : (isAr ? `ترتيبك ${me.rank} من ${me.players} لاعب · ${me.points} نقطة` : `You are #${me.rank} of ${me.players} players · ${me.points} points`)}
        </p>
      )}
      <p className="mt-1 text-[11px] font-semibold text-slate-500">{isAr ? 'الترتيب بنقاط الولاء الحالية: لو لاعب صرف نقاطه رقمه بينزل.' : 'Ranked by current loyalty points: a player who spends points drops down.'}</p>
      {board.top.length === 0 && <p className="mt-2 rounded-2xl bg-slate-50 p-3 text-center text-sm font-bold text-slate-500">{isAr ? 'لسه محدش لعب. كن أول واحد!' : 'Nobody has played yet. Be the first!'}</p>}
      <ol className="mt-2 space-y-1.5">
        {board.top.slice(0, shown).map((r, i) => {
          const big = r.rank <= 3 ? BIG[r.rank - 1] : null;
          return (
            <li key={`${r.rank}-${i}`} className={`flex items-center gap-2 rounded-2xl border px-3 ${big ? `${big.row} py-3 ${big.size} font-black` : 'border-slate-200 bg-white py-2 text-sm font-bold'} ${r.me ? 'ring-2 ring-[#931A47]' : ''}`}>
              <span className={`w-8 shrink-0 text-center ${big ? 'font-black' : 'text-slate-500'}`} dir="ltr">{r.rank}</span>
              <span className="min-w-0 flex-1 truncate text-slate-900">{r.name}{r.me && <span className="ms-1 text-xs text-[#931A47]">({isAr ? 'أنت' : 'you'})</span>}</span>
              {big && <span aria-hidden className={r.rank === 1 ? 'text-3xl' : 'text-2xl'}>{big.cup}</span>}
              <span className="shrink-0 text-slate-700" dir="ltr">{r.points} ⭐</span>
            </li>
          );
        })}
      </ol>
      {board.top.length > shown && (
        <button type="button" onClick={() => setShown((n) => n + 20)} className="mt-2 w-full cursor-pointer rounded-xl bg-slate-100 py-2 text-sm font-black text-slate-700">{isAr ? 'عرض المزيد' : 'Show more'}</button>
      )}
    </section>
  );
};
