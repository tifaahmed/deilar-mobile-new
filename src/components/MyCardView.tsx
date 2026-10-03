import React, { useState } from 'react';
import { 
  RotateCw, 
  QrCode, 
  ShieldCheck, 
  UserPlus, 
  Download, 
  Sparkles, 
  Check, 
  Copy, 
  Wifi, 
  CreditCard,
  Heart,
  Maximize2,
  Clock,
  X,
  Share2
} from 'lucide-react';
import { Beneficiary } from '../types';
import { DeilarLogo } from './DeilarLogo';
import { OfficialDeilarCard } from './OfficialDeilarCard';

interface MyCardViewProps {
  beneficiaries: Beneficiary[];
  onAddBeneficiary: (b: Omit<Beneficiary, 'id' | 'status'>) => void;
}

export const MyCardView: React.FC<MyCardViewProps> = ({
  beneficiaries,
  onAddBeneficiary,
}) => {
  const [selectedBeneficiaryId, setSelectedBeneficiaryId] = useState<string>(beneficiaries[0]?.id || 'ben-1');
  const [isFlipped, setIsFlipped] = useState(false);
  const [showFullPassModal, setShowFullPassModal] = useState(false);
  const [showAddMemberModal, setShowAddMemberModal] = useState(false);
  const [copiedId, setCopiedId] = useState(false);

  // New member form state
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberRelation, setNewMemberRelation] = useState('ابن');
  const [newMemberNationalId, setNewMemberNationalId] = useState('');
  const [newMemberDob, setNewMemberDob] = useState('2022-01-01');

  const currentBeneficiary = beneficiaries.find((b) => b.id === selectedBeneficiaryId) || beneficiaries[0];

  const memId = currentBeneficiary.cardNumber.startsWith('MEM')
    ? currentBeneficiary.cardNumber
    : `MEM-${1000 + parseInt(currentBeneficiary.id.replace(/\D/g, '') || '0')}`;

  const handleCopyCardId = () => {
    navigator.clipboard.writeText(memId);
    setCopiedId(true);
    setTimeout(() => setCopiedId(false), 2000);
  };

  const handleAddMemberSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim()) return;

    onAddBeneficiary({
      name: newMemberName,
      relation: newMemberRelation,
      nationalId: newMemberNationalId || '32201010109988',
      dob: newMemberDob,
      cardNumber: `MEM-${1000 + beneficiaries.length}`,
    });

    setNewMemberName('');
    setShowAddMemberModal(false);
  };

  return (
    <div className="relative space-y-5 pb-24 pt-2 animate-in fade-in duration-200">
      {/* Background Card Ambient Texture */}
      <div className="pointer-events-none absolute inset-x-0 top-0 h-96 overflow-hidden opacity-10 -z-10">
        <img
          src="/src/assets/images/deilar_card_front_official_1791012713788.jpg"
          alt="Deilar Card Background"
          className="w-full h-full object-cover scale-110 blur-[2px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-white/80 to-white" />
      </div>

      {/* 1. Header & Quick Beneficiary Switcher */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">كارت العيله الطبي الرقمي</h2>
            <p className="text-xs text-slate-500">انقر على الكارت لقلبه بين الوجه الأمامي والخلفي والباركود</p>
          </div>
          <button
            onClick={() => setShowAddMemberModal(true)}
            className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-[#931A47] rounded-xl text-xs font-bold border border-rose-200 flex items-center gap-1 transition-colors"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>إضافة فرد</span>
          </button>
        </div>

        {/* Member selector tabs */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {beneficiaries.map((ben) => {
            const isSelected = ben.id === currentBeneficiary.id;
            return (
              <button
                key={ben.id}
                onClick={() => {
                  setSelectedBeneficiaryId(ben.id);
                  setIsFlipped(false);
                }}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-[#112443] text-white shadow-sm'
                    : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                }`}
              >
                <span>{ben.name.split(' ')[0]}</span>
                <span className={`text-[10px] px-1.5 py-0.2 rounded-full ${isSelected ? 'bg-amber-400 text-slate-950 font-black' : 'bg-slate-200 text-slate-500'}`}>
                  {ben.relation}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. Interactive Official Deilar 3D Medical Card (Exact Front & Back Uploaded by Client) */}
      <div className="max-w-sm mx-auto">
        <OfficialDeilarCard
          beneficiary={currentBeneficiary}
          isFlipped={isFlipped}
          onToggleFlip={() => setIsFlipped(!isFlipped)}
        />
      </div>

      {/* 3. Primary Card Actions */}
      <div className="grid grid-cols-2 gap-2.5 max-w-sm mx-auto">
        <button
          onClick={() => setShowFullPassModal(true)}
          className="py-3 px-4 bg-[#112443] hover:bg-slate-900 text-white rounded-xl text-xs font-bold shadow-md shadow-slate-900/20 flex items-center justify-center gap-1.5 transition-all active:scale-95"
        >
          <Maximize2 className="w-4 h-4 text-amber-400" />
          <span>إبراز الكرت للمستشفى</span>
        </button>

        <button
          onClick={handleCopyCardId}
          className="py-3 px-4 bg-white hover:bg-slate-50 text-slate-800 border border-slate-200 rounded-xl text-xs font-bold shadow-xs flex items-center justify-center gap-1.5 transition-colors"
        >
          {copiedId ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4 text-slate-500" />}
          <span>{copiedId ? 'تم نسخ الرقم' : `نسخ ${memId}`}</span>
        </button>
      </div>

      {/* 4. Instructions for Patient/Hospital */}
      <div className="bg-white rounded-2xl p-4 border border-slate-200/80 shadow-xs max-w-sm mx-auto">
        <h3 className="text-xs font-bold text-slate-900 mb-2.5 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-rose-600" />
          <span>كيفية استخدام الكرت في 3 خطوات بسيطة:</span>
        </h3>

        <div className="space-y-2.5 text-xs text-slate-600">
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] flex items-center justify-center shrink-0">
              1
            </span>
            <p>توجه إلى أي من المستشفيات أو المعامل أو الصيدليات في شبكة ديلار.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] flex items-center justify-center shrink-0">
              2
            </span>
            <p>أبرز الكرت الرقمي أو الباركود لموظف الاستقبال قبل إصدار الفاتورة.</p>
          </div>
          <div className="flex items-start gap-2.5">
            <span className="w-5 h-5 rounded-full bg-rose-50 text-rose-700 font-bold text-[11px] flex items-center justify-center shrink-0">
              3
            </span>
            <p>احصل على الخصم الفوري مباشرة من قيمة الفاتورة دون أي موافقات طبية مسبقة.</p>
          </div>
        </div>
      </div>

      {/* 5. Full-Screen Digital Pass Modal (for reception desk scanning) */}
      {showFullPassModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl relative">
            <button
              onClick={() => setShowFullPassModal(false)}
              className="absolute top-4 left-4 w-8 h-8 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600"
            >
              <X className="w-4 h-4" />
            </button>

            {/* Live Verification Badge */}
            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
              <span>كرت طبي نشط وموثق رسمي</span>
            </div>

            <div>
              <h3 className="text-lg font-black text-slate-900">{currentBeneficiary.name}</h3>
              <p className="text-xs text-[#c89e43] font-bold mt-0.5">
                كارت العيله • رقم العضوية: {memId}
              </p>
            </div>

            {/* High Contrast QR Code for reception reader */}
            <div className="bg-slate-50 p-5 rounded-2xl border-2 border-dashed border-[#c89e43]/60 inline-block shadow-inner">
              <div className="w-48 h-48 bg-[#112443] text-white rounded-xl flex flex-col items-center justify-center p-2 mx-auto">
                <QrCode className="w-40 h-40" />
              </div>
              <p className="text-sm font-mono font-black text-[#112443] mt-2 tracking-wider">
                {memId}
              </p>
            </div>

            <p className="text-xs text-slate-500">
              يرجى إبراز الشاشة لموظف الاستقبال لمسح الكود والتحقق من نسبة الخصم
            </p>

            <button
              onClick={() => setShowFullPassModal(false)}
              className="w-full py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold transition-colors"
            >
              إغلاق
            </button>
          </div>
        </div>
      )}

      {/* 6. Add Beneficiary Modal */}
      {showAddMemberModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-slate-900">إضافة فرد عائلة للكرت الطبي</h3>
              <button
                onClick={() => setShowAddMemberModal(false)}
                className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddMemberSubmit} className="space-y-3 text-right">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الاسم الكامل:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: يوسف مصطفى مرسي"
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">صلة القرابة:</label>
                <select
                  value={newMemberRelation}
                  onChange={(e) => setNewMemberRelation(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-rose-600 bg-white"
                >
                  <option value="زوجة">زوجة</option>
                  <option value="زوج">زوج</option>
                  <option value="ابن">ابن</option>
                  <option value="ابنة">ابنة</option>
                  <option value="والد">والد</option>
                  <option value="والدة">والدة</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">الرقم القومي:</label>
                <input
                  type="text"
                  placeholder="14 رقم"
                  value={newMemberNationalId}
                  onChange={(e) => setNewMemberNationalId(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-rose-600 font-mono"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">تاريخ الميلاد:</label>
                <input
                  type="date"
                  value={newMemberDob}
                  onChange={(e) => setNewMemberDob(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-xl focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 bg-rose-700 hover:bg-rose-800 text-white rounded-xl text-xs font-bold shadow-md transition-colors"
                >
                  إصدار كرت رقمي جديد فوراً
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
