import React, { useEffect, useMemo, useState } from 'react';
import { Camera, CheckCircle2, Loader2 } from 'lucide-react';
import { addFamilyMember } from '../api/family';
import { ApiError } from '../api/http';

interface AddMemberFormProps {
  token: string;
  isAr: boolean;
  isDark: boolean;
  /** The member's own gender: a man adds a wife / mother / father, a woman a husband / mother / father (children go through AddChildForm). */
  gender?: 'male' | 'female' | '';
  onCancel: () => void;
  /** Called after the server accepted the request (the member now waits for approval). */
  onSent: () => void;
}

const RELATIONS: { value: string; ar: string; en: string }[] = [
  { value: 'wife', ar: 'زوجة', en: 'Wife' },
  { value: 'husband', ar: 'زوج', en: 'Husband' },
  { value: 'son', ar: 'ابن', en: 'Son' },
  { value: 'daughter', ar: 'ابنة', en: 'Daughter' },
  { value: 'father', ar: 'والد', en: 'Father' },
  { value: 'mother', ar: 'والدة', en: 'Mother' },
  // First degree only (parents, spouse, children). Siblings are second degree: customer service adds those.
];

/** One required picture, taken with the device camera (never the gallery). */
const CameraField: React.FC<{
  label: string;
  file: File | null;
  onChange: (f: File | null) => void;
  facing: 'user' | 'environment';
  isAr: boolean;
  isDark: boolean;
}> = ({ label, file, onChange, facing, isAr, isDark }) => {
  const preview = useMemo(() => (file ? URL.createObjectURL(file) : null), [file]);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  return (
    <label
      className={`relative block rounded-xl border-2 border-dashed overflow-hidden cursor-pointer aspect-[1.6/1] ${
        file ? 'border-emerald-500/60' : isDark ? 'border-white/20' : 'border-slate-300'
      } ${isDark ? 'bg-[#181B26]' : 'bg-white'}`}
    >
      {/* capture opens the camera directly on phones */}
      <input
        type="file"
        accept="image/*"
        capture={facing}
        className="sr-only"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {preview ? (
        <>
          <img src={preview} alt={label} className="w-full h-full object-cover" />
          <span className="absolute bottom-1 inset-x-1 text-center text-[10px] font-bold bg-black/60 text-white rounded-md py-0.5">
            {isAr ? 'دوس عشان تصوّر تاني' : 'Tap to retake'}
          </span>
        </>
      ) : (
        <span className={`absolute inset-0 flex flex-col items-center justify-center gap-1 text-[11px] font-bold ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>
          <Camera className="w-6 h-6 text-[#941946]" />
          <span>{label}</span>
          <span className="text-[9px] text-rose-500">{isAr ? 'مطلوب' : 'Required'}</span>
        </span>
      )}
    </label>
  );
};

export const AddMemberForm: React.FC<AddMemberFormProps> = ({ token, isAr, isDark, gender = '', onCancel, onSent }) => {
  const relations = useMemo(() => {
    if (gender === 'male') return RELATIONS.filter((r) => ['wife', 'mother', 'father'].includes(r.value));
    if (gender === 'female') return RELATIONS.filter((r) => ['husband', 'mother', 'father'].includes(r.value));
    return RELATIONS;
  }, [gender]);
  const [name, setName] = useState('');
  const [relationship, setRelationship] = useState(relations[0].value);
  const [nationalId, setNationalId] = useState('');
  // Optional. The backend saves a phone typed by the card owner UNVERIFIED (no SMS) until the relative proves it.
  const [phone, setPhone] = useState('');
  const [front, setFront] = useState<File | null>(null);
  const [back, setBack] = useState<File | null>(null);
  const [photo, setPhoto] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  // Every relation but a son/daughter (added by first name in AddChildForm) needs the FULL name.
  // A father is typed with the grandfather's name only (the backend adds the member's second name).
  const isFather = relationship === 'father';
  const complete = (isFather ? name.trim().length > 1 : name.trim().split(/\s+/).length > 1) && /^\d{14}$/.test(nationalId) && (phone === '' || /^\+?\d{8,15}$/.test(phone)) && !!front && !!back && !!photo;

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!complete || busy) return;
    setBusy(true);
    setError(null);

    const body = new FormData();
    body.append('name', name.trim());
    body.append('relationship', relationship);
    body.append('national_id', nationalId);
    if (phone) body.append('phone', phone);
    body.append('id_front', front!);
    body.append('id_back', back!);
    body.append('photo', photo!);

    try {
      await addFamilyMember(token, body);
      setSent(true);
      setTimeout(onSent, 2200);
    } catch (err) {
      const first =
        err instanceof ApiError && err.status === 422
          ? Object.values((err.body?.errors ?? {}) as Record<string, string[]>)[0]?.[0]
          : undefined;
      setError(first ?? (isAr ? 'مقدرناش نبعت الطلب، جرّب تاني.' : 'Could not send the request, please try again.'));
    } finally {
      setBusy(false);
    }
  };

  const field = `w-full px-3 py-2 text-xs rounded-xl border focus:outline-none focus:border-[#941946] ${
    isDark ? 'bg-[#181B26] border-white/[0.08] text-[#F1F5F9]' : 'bg-white border-slate-200 text-slate-900'
  }`;
  const label = `text-[11px] font-bold block mb-1 ${isDark ? 'text-[#F1F5F9]' : 'text-slate-700'}`;

  if (sent) {
    return (
      <div className={`p-5 rounded-2xl border text-center space-y-2 mt-3 ${isDark ? 'bg-[#1E2330] border-white/[0.08]' : 'bg-emerald-50 border-emerald-200'}`}>
        <CheckCircle2 className="w-9 h-9 text-emerald-500 mx-auto" />
        <p className="text-xs font-black">{isAr ? 'الطلب اتبعت' : 'Request sent'}</p>
        <p className={`text-[11px] ${isDark ? 'text-[#94A3B8]' : 'text-slate-600'}`}>
          {isAr ? 'الفرد هيظهر على كارتك بعد ما الإدارة توافق.' : 'The member will appear on your card once the admin approves.'}
        </p>
      </div>
    );
  }

  return (
    <div className={`p-4 rounded-2xl border space-y-3 mt-3 animate-in fade-in ${isDark ? 'bg-[#1E2330] border-white/[0.08]' : 'bg-rose-50/40 border-rose-200'}`}>
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-bold">{isAr ? 'إضافة فرد جديد' : 'Add a family member'}</h4>
        <button
          type="button"
          onClick={onCancel}
          className={`w-6 h-6 rounded-full flex items-center justify-center text-xs cursor-pointer ${isDark ? 'bg-[#252c3d] text-[#94A3B8]' : 'bg-slate-200 text-slate-600'}`}
        >
          ✕
        </button>
      </div>

      <p className={`text-[10.5px] leading-relaxed ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>
        {isAr
          ? 'كل البيانات والصور مطلوبة، والفرد بيتفعّل بعد ما الإدارة تراجع.'
          : 'Every field and picture is required. The member is activated after the admin reviews the request.'}
      </p>

      <form onSubmit={submit} className="space-y-2.5">
        <div>
          <label className={label}>{isFather ? (isAr ? 'اسم الجد (والد الأب)' : "Grandfather's name") : isAr ? 'الاسم بالكامل' : 'Full name'}</label>
          <input type="text" required value={name} onChange={(e) => setName(e.target.value)} className={field} />
          {isFather && <p className={`text-[10px] mt-1 ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>{isAr ? 'اكتب اسم الجد بس: اسم الأب الأول هو اسمك التاني، وبنكمّله لوحدنا.' : "Type only the grandfather's name: your father's first name is your second name, we add it."}</p>}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className={label}>{isAr ? 'صلة القرابة' : 'Relationship'}</label>
            <select value={relationship} onChange={(e) => setRelationship(e.target.value)} className={field}>
              {relations.map((r) => (
                <option key={r.value} value={r.value}>
                  {isAr ? r.ar : r.en}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className={label}>{isAr ? 'الرقم القومي' : 'National ID'}</label>
            <input
              type="text"
              required
              inputMode="numeric"
              maxLength={14}
              placeholder="14"
              value={nationalId}
              onChange={(e) => setNationalId(e.target.value.replace(/\D/g, ''))}
              className={`${field} font-mono`}
            />
          </div>
        </div>

        <div>
          <label className={label}>{isAr ? 'رقم الموبايل (لو حابب)' : 'Phone (optional)'}</label>
          <input type="tel" inputMode="tel" dir="ltr" maxLength={16} value={phone} onChange={(e) => setPhone(e.target.value.replace(/[^\d+]/g, ''))} className={`${field} font-mono`} aria-label={isAr ? 'رقم الهاتف' : 'Phone'} />
          <p className={`text-[10px] mt-0.5 ${isDark ? 'text-[#94A3B8]' : 'text-slate-500'}`}>{isAr ? 'هيفضل «مش متأكد منه» لحد ما صاحبه يأكده.' : 'Shown as "not verified" until its owner confirms it.'}</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div>
            <span className={label}>{isAr ? 'وش البطاقة' : 'ID front'}</span>
            <CameraField label={isAr ? 'صوّر الوش' : 'Photo of front'} file={front} onChange={setFront} facing="environment" isAr={isAr} isDark={isDark} />
          </div>
          <div>
            <span className={label}>{isAr ? 'ضهر البطاقة' : 'ID back'}</span>
            <CameraField label={isAr ? 'صوّر الضهر' : 'Photo of back'} file={back} onChange={setBack} facing="environment" isAr={isAr} isDark={isDark} />
          </div>
        </div>

        <div>
          <span className={label}>{isAr ? 'صورة الفرد' : 'Member photo'}</span>
          <div className="w-1/2">
            <CameraField label={isAr ? 'صوّر الشخص' : 'Photo of the person'} file={photo} onChange={setPhoto} facing="user" isAr={isAr} isDark={isDark} />
          </div>
        </div>

        {error && <p className="text-[11px] font-bold text-rose-500">{error}</p>}

        <button
          type="submit"
          disabled={!complete || busy}
          className="w-full py-2.5 bg-[#941946] hover:bg-[#7b1439] disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors shadow-2xs cursor-pointer flex items-center justify-center gap-1.5"
        >
          {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
          <span>{isAr ? 'ابعت للموافقة' : 'Send for approval'}</span>
        </button>
      </form>
    </div>
  );
};
