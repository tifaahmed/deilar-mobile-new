import React from 'react';
import { useIsAr } from '../context/LanguageContext';
import { navigate, routeHref } from '../router';
import { useLoyalty } from '../utils/quizStore';

/** Where the points page sends the player: the products that take points, the physical card and the membership. */
export const POINTS_PRODUCTS_HREF = '/products?points=1';

/**
 * «How do I use my loyalty points»: opened from the points total at the top of the games page (/quiz/points). It tells the rate the
 * backend gave (`points_per_egp`), where points can be spent, and that they are reset on the 1st of every month.
 */
export const PointsGuide: React.FC = () => {
  const isAr = useIsAr();
  const loyalty = useLoyalty();
  const rate = loyalty.money?.points_per_egp && loyalty.money.points_per_egp > 0 ? loyalty.money.points_per_egp : null;
  const examples = rate ? [1, 10, 50, 100] : [];

  const Row: React.FC<{ icon: string; title: string; text: string }> = ({ icon, title, text }) => (
    <div className="flex gap-3 rounded-2xl bg-white p-3 border border-slate-200">
      <span className="text-2xl">{icon}</span>
      <div className="flex-1">
        <p className="text-sm font-black text-slate-900">{title}</p>
        <p className="text-xs font-semibold leading-relaxed text-slate-600">{text}</p>
      </div>
    </div>
  );

  const Go: React.FC<{ label: string; href: string; testId: string }> = ({ label, href, testId }) => (
    <button type="button" data-testid={testId} onClick={() => navigate(href)} className="w-full rounded-2xl bg-[#941946] px-4 py-3 text-sm font-black text-white active:scale-95 cursor-pointer">{label}</button>
  );

  return (
    <div data-testid="points-guide" className="space-y-3">
      <h1 className="text-xl font-black text-slate-900">{isAr ? '⭐ إزاي تستخدم نقاط الولاء؟' : '⭐ How to use your loyalty points'}</h1>

      <div className="rounded-3xl bg-gradient-to-l from-amber-400 to-orange-500 p-4 text-white shadow-md">
        <p className="text-xs font-bold text-white/90">{isAr ? 'كام نقطة بجنيه؟' : 'How many points per pound?'}</p>
        {rate ? (
          <>
            <p data-testid="points-rate" dir="ltr" className="text-3xl font-black tabular-nums">{rate} {isAr ? 'نقطة' : 'points'} = 1 {isAr ? 'جنيه' : 'EGP'}</p>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {examples.map((egp) => <span key={egp} dir="ltr" className="rounded-lg bg-white/20 px-2 py-1 text-[11px] font-black tabular-nums">{egp * rate} = {egp} {isAr ? 'جنيه' : 'EGP'}</span>)}
            </div>
          </>
        ) : (
          <p className="text-sm font-black">{isAr ? 'السعر بيظهر لما تفتح التطبيق وإنت متصل بالإنترنت.' : 'The rate shows when you open the app online.'}</p>
        )}
      </div>

      <Row icon="🎮" title={isAr ? 'بتجيبها منين؟' : 'Where do points come from?'} text={isAr ? 'كل إجابة صح في الألعاب بتكسّبك نقاط، وكل ما تجاوب أسرع بتاخد أكتر. والشارات بتدّيك هدايا نقاط.' : 'Every right answer wins points, more when you answer faster, and badges give gift points.'} />
      <Row icon="🛍️" title={isAr ? 'تستخدمها فين؟' : 'Where can you use them?'} text={isAr ? 'تقدر تستخدم نقاط الولاء في كل حاجة: المنتجات، وطلب كارت فيزيكال، وشراء العضوية.' : 'You can use loyalty points on everything: products, a physical card and the membership.'} />
      <Row icon="👆" title={isAr ? 'إزاي؟' : 'How?'} text={isAr ? 'وإنت بتدفع، دوس على «استخدم نقاط الولاء». النقاط ما بتتخصمش لوحدها، إنت اللي بتختار.' : 'When you pay, tap “Use my loyalty points”. They are never spent on their own; you choose.'} />

      <div data-testid="points-expiry" className="rounded-2xl border-2 border-red-200 bg-red-50 p-3">
        <p className="text-sm font-black text-red-700">{isAr ? '⏰ خد بالك' : '⏰ Heads up'}</p>
        <p className="text-xs font-bold leading-relaxed text-red-700">{isAr ? 'نقاط الولاء بتختفي عند كل الناس يوم 1 أول كل شهر. استخدم نقاطك قبل كده.' : 'Loyalty points disappear for everyone on the 1st of every month. Use yours before then.'}</p>
      </div>

      <div data-testid="points-share-card" className="rounded-2xl border-2 border-sky-200 bg-sky-50 p-3 space-y-2">
        <p className="text-sm font-black text-sky-900">{isAr ? '🤝 شارك نقاطك' : '🤝 Share your points'}</p>
        <p className="text-xs font-semibold leading-relaxed text-sky-800">{isAr ? 'تقدر تبعت نقاط للاعبين التانيين أو لأفراد أسرتك، وتشوف سجل المشاركات.' : 'Send points to other players or your family and see the log of what you shared.'}</p>
        <Go testId="points-go-share" label={isAr ? 'مشاركة نقاط الولاء' : 'Share loyalty points'} href={routeHref({ tab: 'profile', section: 'share' })} />
      </div>

      <Go testId="points-go-products" label={isAr ? '🛍️ المنتجات اللي بتقبل نقاط الولاء' : '🛍️ Products that accept points'} href={POINTS_PRODUCTS_HREF} />
      <Go testId="points-go-physical" label={isAr ? '💳 اطلب كارت فيزيكال' : '💳 Order a physical card'} href={routeHref({ tab: 'mycard', section: 'physical' })} />
      <Go testId="points-go-membership" label={isAr ? '🎫 اشترك في العضوية' : '🎫 Buy a membership'} href={routeHref({ tab: 'mycard' })} />
    </div>
  );
};
