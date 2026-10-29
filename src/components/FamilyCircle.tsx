import React, { useEffect, useState } from 'react';
import { Award, Camera, ChevronDown, Crown, Loader2, Pencil, Phone, Star, Trash2, Users } from 'lucide-react';
import { cardImageUrl } from '../api/auth';
import { deleteRelative, fetchFamilyOverview, updateRelative, uploadRelativeAvatar, type FamilyCirclePerson, type FamilyOverview } from '../api/family';
import { ApiError } from '../api/http';
import { useLanguage } from '../context/LanguageContext';
import { reportClientError } from '../utils/reportError';
import { ImageViewer } from './ImageViewer';

const Avatar: React.FC<{ name: string | null; url?: string | null; head: boolean }> = ({ name, url, head }) => {
  const [broken, setBroken] = useState(false);

  return (
    <span className={`w-11 h-11 shrink-0 rounded-full overflow-hidden flex items-center justify-center font-black text-white bg-gradient-to-br from-[#941946] to-[#6d1132] ${head ? 'ring-2 ring-[#c89e43]' : ''}`}>
      {url && !broken ? <img src={url} alt="" loading="lazy" onError={() => setBroken(true)} className="w-full h-full object-cover" /> : <span>{(name ?? '?').trim().charAt(0) || '?'}</span>}
    </span>
  );
};

/** What the card owner can do to one of their relatives: change the photo, complete the data, remove them. */
const RelativeTools: React.FC<{ token: string; p: FamilyCirclePerson; onChanged: () => void }> = ({ token, p, onChanged }) => {
  const { isAr } = useLanguage();
  const [mode, setMode] = useState<'idle' | 'edit' | 'delete'>('idle');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const approved = p.approval_status === 'approved' || p.approval_status === null;
  const [form, setForm] = useState({ name: p.name ?? '', phone: p.phone ?? '', date_of_birth: p.date_of_birth ?? '', national_id: p.national_id ?? '' });
  const input = 'w-full px-3 py-2 text-xs rounded-xl border border-slate-200 bg-white text-slate-900 disabled:bg-slate-100 disabled:text-slate-500 focus:outline-none focus:border-[#941946]';

  const run = async (job: () => Promise<unknown>, fail: string, done: () => void) => {
    setBusy(true);
    setError(null);
    try {
      await job();
      done();
      onChanged();
    } catch (e) {
      const first = e instanceof ApiError && e.status === 422 ? Object.values((e.body?.errors ?? {}) as Record<string, string[]>)[0]?.[0] : undefined;
      reportClientError('relative tools failed', e);
      setError(first ?? fail);
    } finally {
      setBusy(false);
    }
  };

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const body: Parameters<typeof updateRelative>[2] = {};
    if (!approved && form.name.trim() !== (p.name ?? '')) body.name = form.name.trim();
    if (form.phone.trim() !== (p.phone ?? '')) body.phone = form.phone.trim() || null;
    if (form.date_of_birth !== (p.date_of_birth ?? '')) body.date_of_birth = form.date_of_birth || null;
    if (form.national_id.trim() !== (p.national_id ?? '')) body.national_id = form.national_id.trim() || null;
    if (Object.keys(body).length === 0) { setMode('idle'); return; }
    void run(() => updateRelative(token, p.id, body), isAr ? 'تعذّر الحفظ، حاول مرة أخرى.' : 'Could not save, please try again.', () => setMode('idle'));
  };

  const filled = (v: string | null | undefined) => approved && !!v;

  return (
    <div className="space-y-2 pt-1">
      <div className="flex flex-wrap gap-2">
        <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-slate-900 text-white text-[11px] font-bold cursor-pointer">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Camera className="w-3.5 h-3.5" />}
          <span>{isAr ? 'رفع / تغيير الصورة' : 'Upload / change photo'}</span>
          <input type="file" accept="image/*" className="sr-only" disabled={busy}
            onChange={(e) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (file) void run(() => uploadRelativeAvatar(token, p.id, file), isAr ? 'تعذّر رفع الصورة (صورة حتى 2 ميجا).' : 'Could not upload the photo (an image up to 2 MB).', () => undefined);
            }} />
        </label>
        <button type="button" onClick={() => { setError(null); setMode(mode === 'edit' ? 'idle' : 'edit'); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-[#941946] text-white text-[11px] font-bold cursor-pointer">
          <Pencil className="w-3.5 h-3.5" />{isAr ? 'تعديل / استكمال البيانات' : 'Edit / complete data'}
        </button>
        <button type="button" onClick={() => { setError(null); setMode(mode === 'delete' ? 'idle' : 'delete'); }} className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-[11px] font-bold cursor-pointer">
          <Trash2 className="w-3.5 h-3.5" />{isAr ? 'حذف' : 'Remove'}
        </button>
      </div>

      {mode === 'edit' && (
        <form onSubmit={save} className="p-3 rounded-xl border border-slate-200 bg-white space-y-2 text-slate-900">
          <label className="block space-y-1"><span className="text-[11px] font-bold">{isAr ? 'الاسم' : 'Name'}</span>
            <input className={input} value={form.name} disabled={approved} onChange={(e) => setForm({ ...form, name: e.target.value })} /></label>
          <label className="block space-y-1"><span className="text-[11px] font-bold">{isAr ? 'رقم الهاتف' : 'Phone'}</span>
            <input className={input} dir="ltr" inputMode="numeric" maxLength={11} value={form.phone} disabled={filled(p.phone)} onChange={(e) => setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })} /></label>
          <label className="block space-y-1"><span className="text-[11px] font-bold">{isAr ? 'تاريخ الميلاد' : 'Date of birth'}</span>
            <input className={input} type="date" max={new Date().toISOString().slice(0, 10)} value={form.date_of_birth} disabled={filled(p.date_of_birth)} onChange={(e) => setForm({ ...form, date_of_birth: e.target.value })} /></label>
          <label className="block space-y-1"><span className="text-[11px] font-bold">{isAr ? 'الرقم القومي' : 'National ID'}</span>
            <input className={input} dir="ltr" inputMode="numeric" maxLength={14} value={form.national_id} disabled={filled(p.national_id)} onChange={(e) => setForm({ ...form, national_id: e.target.value.replace(/\D/g, '') })} /></label>
          {approved && <p className="text-[10px] text-slate-500">{isAr ? 'البيانات المعتمدة لا تتغير من هنا؛ تواصل مع خدمة العملاء لتعديلها. يمكنك فقط إضافة الناقص.' : 'Approved data cannot be changed here; contact customer service. You can only add what is missing.'}</p>}
          <button type="submit" disabled={busy} className="w-full py-2 rounded-xl bg-[#941946] text-white text-xs font-bold disabled:opacity-60 cursor-pointer">{busy ? '…' : isAr ? 'حفظ' : 'Save'}</button>
        </form>
      )}

      {mode === 'delete' && (
        <div className="p-3 rounded-xl border border-rose-200 bg-rose-50 text-rose-900 space-y-2 text-[11px]">
          <p className="font-bold">{isAr ? `حذف ${p.name ?? 'هذا الفرد'} من الكارت؟ لا يمكن التراجع.` : `Remove ${p.name ?? 'this person'} from the card? This cannot be undone.`}</p>
          <div className="flex gap-2">
            <button type="button" disabled={busy} onClick={() => void run(() => deleteRelative(token, p.id), isAr ? 'تعذّر الحذف، حاول مرة أخرى.' : 'Could not remove, please try again.', () => setMode('idle'))} className="px-3 py-1.5 rounded-xl bg-rose-600 text-white font-bold disabled:opacity-60 cursor-pointer">{isAr ? 'نعم، احذف' : 'Yes, remove'}</button>
            <button type="button" onClick={() => setMode('idle')} className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 font-bold cursor-pointer">{isAr ? 'إلغاء' : 'Cancel'}</button>
          </div>
        </div>
      )}

      {error && <p role="alert" className="text-[11px] font-bold text-rose-600 bg-rose-50 border border-rose-200 rounded-xl px-3 py-2">{error}</p>}
    </div>
  );
};

/** One person: only the photo and the name show until the row is opened; the rest (phone, points, badges, card) is inside. */
const Person: React.FC<{ p: FamilyCirclePerson; dark: boolean; token: string; onCard: (number: string) => void; onChanged: () => void }> = ({ p, dark, token, onCard, onChanged }) => {
  const { isAr } = useLanguage();
  const [open, setOpen] = useState(false);
  const head = p.is_primary;
  const panel = `family-person-${p.id}`;

  return (
    <div className={`rounded-2xl border overflow-hidden ${
      head
        ? 'border-[#c89e43] bg-gradient-to-br from-[#c89e43]/15 via-transparent to-[#941946]/10 shadow-md ring-1 ring-[#c89e43]/40'
        : dark ? 'bg-[#1E2330] border-white/[0.08]' : 'bg-slate-50 border-slate-200'
    }`}>
      <button type="button" onClick={() => setOpen((v) => !v)} aria-expanded={open} aria-controls={panel} className="w-full flex items-center gap-3 p-3 text-start cursor-pointer">
        <Avatar name={p.name} url={p.avatar_url} head={head} />
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-black truncate">
            {p.name || (isAr ? 'بدون اسم' : 'No name')}
            {p.is_me && <span className="ms-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#941946] text-white">{isAr ? 'أنت' : 'You'}</span>}
          </span>
          <span className="flex items-center gap-1 text-[11px] font-bold text-[#c89e43]">
            {head && <Crown className="w-3.5 h-3.5 shrink-0" />}
            {head ? (isAr ? 'صاحب الكارت الأساسي' : 'Primary card holder') : p.relationship_label || p.relationship || ''}
          </span>
          {p.approval_status && p.approval_status !== 'approved' && (
            <span className={`inline-block mt-0.5 text-[10px] font-bold px-1.5 py-0.5 rounded-full ${p.approval_status === 'rejected' ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
              {p.approval_status === 'rejected' ? (isAr ? 'مرفوض' : 'Rejected') : isAr ? 'بانتظار الموافقة' : 'Awaiting approval'}
            </span>
          )}
        </span>
        <ChevronDown className={`w-5 h-5 shrink-0 text-slate-400 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div id={panel} className="px-3 pb-3 space-y-2 animate-in fade-in duration-150">
          <div className="flex flex-wrap items-center gap-2 text-[11px]">
            <span className={`font-black px-2 py-1 rounded-full flex items-center gap-1 ${p.points < 0 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-800'}`}>
              <Star className="w-3 h-3" />{isAr ? `${p.points} نقطة` : `${p.points} pts`}
            </span>
            {p.phone && (
              <a href={`tel:${p.phone}`} dir="ltr" className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-slate-900 text-white font-bold">
                <Phone className="w-3 h-3" />{p.phone}
              </a>
            )}
            {p.phone && p.phone_verified === false && <span className="px-2 py-0.5 rounded-full bg-slate-200 text-slate-700 font-bold">{isAr ? 'رقم غير موثق' : 'Phone not verified'}</span>}
            <span dir="ltr" className="font-mono text-slate-500">#{p.membership_number}</span>
            {p.approval_status === 'pending' && <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 font-bold">{isAr ? 'بانتظار الموافقة' : 'Awaiting approval'}</span>}
            {p.approval_status === 'rejected' && <span className="px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 font-bold">{isAr ? 'مرفوض' : 'Rejected'}{p.rejection_reason ? ` • ${p.rejection_reason}` : ''}</span>}
          </div>

          <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-[11px]">
            {([
              [isAr ? 'الصلة' : 'Relation', head ? (isAr ? 'صاحب الكارت الأساسي' : 'Primary card holder') : p.relationship_label || p.relationship, false],
              [isAr ? 'رقم الكارت' : 'Card number', p.membership_number, true],
              [isAr ? 'الرقم القومي' : 'National ID', p.national_id, true],
              [isAr ? 'تاريخ الميلاد' : 'Date of birth', p.date_of_birth, true],
              [isAr ? 'الحالة' : 'Status', p.is_active ? (isAr ? 'مفعل' : 'Active') : isAr ? 'غير مفعل' : 'Inactive', false],
            ] as [string, string | null | undefined, boolean][]).filter(([, v]) => v).map(([k, v, ltr]) => (
              <div key={k} className="min-w-0">
                <dt className="text-slate-500">{k}</dt>
                <dd className="font-bold truncate" dir={ltr ? 'ltr' : undefined}>{v}</dd>
              </div>
            ))}
          </dl>

          {p.badges.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {p.badges.map((b) => (
                <span key={`${b.quiz}-${b.title}`} className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#941946]/10 text-[#941946]">
                  <Award className="w-3 h-3" />{b.title}
                </span>
              ))}
            </div>
          )}

          {p.editable && <RelativeTools token={token} p={p} onChanged={onChanged} />}

          <button type="button" onClick={() => onCard(p.membership_number)} className="block w-full cursor-pointer" aria-label={isAr ? 'عرض الكارت' : 'View card'}>
            <img src={cardImageUrl(p.membership_number, 'front')} loading="lazy" alt="" className="w-full max-w-xs mx-auto rounded-xl shadow-sm" />
          </button>
        </div>
      )}
    </div>
  );
};

/**
 * The family of the signed-in member: everyone on the card with phone, card picture, loyalty points and badges.
 * A relative sees the card they belong to (the primary holder first, in gold); after paying and becoming primary
 * they keep seeing the old family in a second list. All of it is the backend's (`GET /family/overview`).
 */
export const FamilyCircle: React.FC<{ token: string; dark: boolean }> = ({ token, dark }) => {
  const { isAr } = useLanguage();
  const [data, setData] = useState<FamilyOverview | null>(null);
  const [failed, setFailed] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const [version, setVersion] = useState(0);
  const reload = () => setVersion((v) => v + 1);

  useEffect(() => {
    let alive = true;
    fetchFamilyOverview(token).then(
      (d) => alive && setData(d),
      (e) => { reportClientError('fetchFamilyOverview failed', e); if (alive) setFailed(true); },
    );

    return () => { alive = false; };
  }, [token, version]);

  if (failed) return null;
  if (!data) return <div className="flex justify-center py-3"><Loader2 className="w-5 h-5 animate-spin text-slate-400" /></div>;
  if (data.current.length === 0 && data.former.length === 0) return null;

  const total = data.current.reduce((n, p) => n + p.points, 0);

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-black flex items-center gap-1.5"><Users className="w-4 h-4 text-[#941946]" />{isAr ? 'عائلتي' : 'My family'}</h3>
        <span className="text-[11px] font-bold text-amber-700">{isAr ? `مجموع نقاط العائلة: ${total}` : `Family points: ${total}`}</span>
      </div>
      {data.current.map((p) => <Person key={p.id} p={p} dark={dark} token={token} onCard={setZoom} onChanged={reload} />)}

      {data.former.length > 0 && (
        <>
          <h3 className="text-xs font-black pt-2">{isAr ? 'عائلتي السابقة (الكارت الذي كنت عليه)' : 'My former family (the card you were on)'}</h3>
          {data.former.map((p) => <Person key={`old-${p.id}`} p={p} dark={dark} token={token} onCard={setZoom} onChanged={reload} />)}
        </>
      )}

      {zoom && <ImageViewer images={[cardImageUrl(zoom, 'front'), cardImageUrl(zoom, 'back')]} index={0} onIndexChange={() => undefined} onClose={() => setZoom(null)} />}
    </div>
  );
};
