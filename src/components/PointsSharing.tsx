import React from 'react';
import { useIsAr } from '../context/LanguageContext';
import { TransfersPanel } from './TransfersPanel';

/** /account/share — «مشاركة نقاط الولاء»: send points to another player or a family member, answer requests, and read the log. */
export const PointsSharing: React.FC = () => {
  const isAr = useIsAr();
  return (
    <div data-testid="points-sharing" className="space-y-3">
      <h1 className="text-xl font-black text-slate-900">{isAr ? '🤝 مشاركة نقاط الولاء' : '🤝 Share loyalty points'}</h1>
      <p className="text-xs font-semibold leading-relaxed text-slate-600">
        {isAr
          ? 'ابعت نقاطك للاعبين التانيين أو لأفراد أسرتك برقم التليفون أو رقم الكارت. التحويل مبيتمش غير لما اللي بتبعتله يوافق.'
          : 'Send your points to other players or your family by phone or card number. Nothing moves until the other person accepts.'}
      </p>
      <TransfersPanel kindOnly="points" withLog noteWhenOff />
    </div>
  );
};
