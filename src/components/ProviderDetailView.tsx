import React from 'react';
import {
  ArrowRight,
  MapPin,
  Phone,
  MessageCircle,
  Navigation,
  CreditCard,
  Building2,
} from 'lucide-react';
import type { BranchRow, FacilityCard, FacilityDetail, Place } from '../api/types';
import { api } from '../api/endpoints';
import { directionsUrl, formatKm, roundCoord, whatsappNumber } from '../api/adapters';
import { useApi } from '../hooks/useApi';
import { useLanguage } from '../context/LanguageContext';
import { navigate, routeHref } from '../router';
import { ErrorState, Skeleton } from './ui/Feedback';
import { Thumb } from './ui/Thumb';
import { BranchList } from './BranchList';

interface ProviderDetailViewProps {
  slug: string;
  /** The list card that was tapped — painted at once while the detail loads. */
  preview?: FacilityCard;
  userLocation: { lat: number; lng: number };
  onBack: () => void;
  onNavigateToMap: () => void;
  onNavigateToCard: () => void;
}

/** Branches shown first, and added on every "show more" tap. */
const BRANCH_PAGE = 3;
const SIMILAR_COUNT = 5;

export const ProviderDetailView: React.FC<ProviderDetailViewProps> = ({ slug, preview, userLocation, onBack, onNavigateToCard }) => {
  const { isAr } = useLanguage();

  const point = { lat: roundCoord(userLocation.lat), lng: roundCoord(userLocation.lng) };
  const detail = useApi<FacilityDetail>(
    `facility:${slug}:${point.lat},${point.lng}:${isAr}`,
    (signal) => api.facility(slug, { ...point, per_page: BRANCH_PAGE }, signal),
  );
  const facility = detail.data;

  const branches: BranchRow[] = facility?.branches ?? [];
  // Other places of the same type, closest to the user first.
  const typeId = facility?.type?.id ?? preview?.type?.id;
  const similarParams = { type: typeId, ...point, per_page: SIMILAR_COUNT + 1 };
  const similar = useApi(
    typeId ? `similar:${typeId}:${point.lat},${point.lng}:${isAr}` : null,
    (signal) => api.facilities(similarParams, signal).then((r) => r.data.filter((f) => f.slug !== slug).slice(0, SIMILAR_COUNT)),
  );

  // The nearest branch leads: its phone/address/directions drive the quick actions.
  const lead: Place | undefined = branches[0] ?? preview?.branch ?? undefined;

  const name = facility?.name ?? preview?.name ?? '';
  const discount = facility?.discount ?? preview?.discount ?? null;
  const typeName = facility?.type?.name ?? preview?.type?.name;
  const hero = facility?.image || facility?.logo || preview?.logo;

  const handleWhatsApp = (number: string | null | undefined) => {
    const target = whatsappNumber(number);
    if (!target) return;
    const text = encodeURIComponent(
      isAr
        ? `مرحباً ${name}، أنا من حاملي كرت ديلار الطبي وأود الاستفسار عن كشف/فحص بنسبة الخصم المعتمدة${discount != null ? ` (${discount}%)` : ''}.`
        : `Hello ${name}, I hold a Deilar medical card and would like to ask about the approved discount${discount != null ? ` (${discount}%)` : ''}.`,
    );
    window.open(`https://wa.me/${target}?text=${text}`, '_blank');
  };

  const leadDirections = directionsUrl(lead?.lat, lead?.lng, branches[0]?.maps_url);

  return (
    <div className={`space-y-4 pb-28 pt-1 animate-in fade-in duration-200 ${isAr ? 'text-right' : 'text-left'}`}>
      {/* 1. Top Navigation Bar */}
      <div className="flex items-center justify-between gap-2 bg-white p-2.5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <button
          onClick={onBack}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 hover:text-[#941946] hover:bg-rose-50/50 rounded-xl transition-all"
        >
          <ArrowRight className={`w-4 h-4 text-[#941946] ${isAr ? '' : 'rotate-180'}`} />
          <span>{isAr ? 'الرجوع إلى المنشآت الطبية' : 'Back to facilities'}</span>
        </button>

        {typeName && <span className="text-xs font-bold text-rose-700 bg-rose-50 px-2.5 py-1 rounded-xl border border-rose-100">{typeName}</span>}
      </div>

      {/* 2. Facility Hero Image & Identity */}
      <div className="relative rounded-3xl overflow-hidden bg-slate-950 text-white shadow-md border border-slate-200/50">
        <div className="relative aspect-[2.1/1] sm:aspect-[2.6/1] w-full overflow-hidden">
          <Thumb src={hero} alt={name} kind="facility" className="w-full h-full opacity-85" />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent" />
        </div>

        <div className="absolute bottom-3 right-4 left-4 text-white">
          <h1 className="text-lg sm:text-xl font-black text-white drop-shadow-md">{name}</h1>
          {facility?.tags && facility.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1">
              {facility.tags.map((tag) => (
                <span key={tag.name} className="text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-white/20 backdrop-blur-xs">
                  {tag.name}
                </span>
              ))}
            </div>
          )}
        </div>
      </div>

      {detail.error && !preview && <ErrorState onRetry={detail.reload} />}

      {/* 3. Discount Privilege Box + quick actions */}
      <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3">
        {discount != null && (
          <div className="p-3.5 bg-gradient-to-r from-rose-50 to-amber-50/60 rounded-2xl border border-rose-200/80 flex items-center justify-between gap-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-[#941946] text-white flex items-center justify-center font-black text-base shrink-0 shadow-xs">%</div>
              <div>
                <p className="text-sm font-black text-[#941946]">{isAr ? `خصم ${discount}%` : `${discount}% discount`}</p>
                <p className="text-[11px] text-slate-600 font-medium">
                  {isAr ? 'خصم فوري مباشر لحاملي كرت ديلار الطبي' : 'Instant discount for Deilar medical cardholders'}
                </p>
              </div>
            </div>
          </div>
        )}

        <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5">
          <CreditCard className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-[12px] font-black text-slate-800">
              {isAr ? 'كيف تحصل على الخصم؟' : 'How to get the discount'}
            </p>
            <p className="text-[11px] text-slate-700 leading-relaxed font-medium">
              {isAr
                ? 'للاستفادة من الخصم يجب أن يكون لديك كرت ديلار. اعرض الكرت مع رقم العضوية لمقدم الخدمة وستحصل على الخصم مباشرة.'
                : 'To use the discount you must hold a Deilar card. Just show your card with its ID number to the service provider and you get the discount right away.'}
            </p>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-2 pt-1">
          <a
            href={lead?.phone ? `tel:${lead.phone}` : undefined}
            aria-disabled={!lead?.phone}
            className={`py-2.5 px-2 bg-slate-900 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors shadow-2xs ${lead?.phone ? 'hover:bg-slate-800' : 'opacity-40 pointer-events-none'}`}
          >
            <Phone className="w-4 h-4 text-amber-400" />
            <span>{isAr ? 'اتصال هاتفي' : 'Call'}</span>
            {lead?.phone && <span dir="ltr" className="text-[10px] font-mono font-semibold text-white/80">{lead.phone}</span>}
          </a>

          <button
            onClick={() => handleWhatsApp(lead?.whatsapp)}
            disabled={!lead?.whatsapp}
            className={`py-2.5 px-2 bg-[#25D366] text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors shadow-2xs ${lead?.whatsapp ? 'hover:bg-emerald-600' : 'opacity-40 pointer-events-none'}`}
          >
            <MessageCircle className="w-4 h-4" />
            <span>{isAr ? 'واتساب وحجز' : 'WhatsApp'}</span>
            {lead?.whatsapp && <span dir="ltr" className="text-[10px] font-mono font-semibold text-white/80">{lead.whatsapp}</span>}
          </button>

          <a
            href={leadDirections ?? undefined}
            target="_blank"
            rel="noreferrer"
            aria-disabled={!leadDirections}
            className={`py-2.5 px-2 bg-blue-600 text-white rounded-xl text-xs font-bold flex flex-col items-center justify-center gap-1 transition-colors shadow-2xs ${leadDirections ? 'hover:bg-blue-700' : 'opacity-40 pointer-events-none'}`}
          >
            <Navigation className="w-4 h-4" />
            <span>{isAr ? 'الاتجاهات' : 'Directions'}</span>
          </a>
        </div>
      </div>

      {/* 5. About */}
      {(detail.loading || facility?.description) && (
        <div className="bg-white rounded-3xl p-4 border border-slate-200/90 shadow-2xs space-y-3 text-xs text-slate-700 leading-relaxed">
          <h3 className="text-xs font-extrabold text-slate-900 flex items-center gap-1.5">
            <Building2 className="w-4 h-4 text-[#941946]" />
            <span>{isAr ? 'عن المنشأة' : 'About'}</span>
          </h3>
          {detail.loading ? (
            <div className="space-y-2">
              <Skeleton className="h-3 w-full" />
              <Skeleton className="h-3 w-4/5" />
            </div>
          ) : (
            <p className="text-slate-600 leading-relaxed whitespace-pre-line">{facility?.description}</p>
          )}
        </div>
      )}

      {/* 6. Branches */}
      <BranchList
        first={facility?.branches}
        hasMore={facility?.has_more ?? false}
        loading={detail.loading}
        loadPage={(page) => api.facilityBranches(slug, { ...point, page, per_page: BRANCH_PAGE })}
        resetKey={`${slug}:${point.lat},${point.lng}`}
      />

      {/* 7. Similar places of the same type near the user */}
      {typeId && (similar.loading || (similar.data?.length ?? 0) > 0) && (
        <div className="space-y-2.5">
          <h3 className="text-sm font-black text-slate-900 flex items-center gap-1.5 px-1">
            <MapPin className="w-4 h-4 text-[#941946]" />
            <span>{isAr ? 'أماكن مشابهة قريبة منك' : 'Similar places near you'}</span>
          </h3>

          {similar.loading && <Skeleton className="h-24 w-full rounded-2xl" />}

          {(similar.data ?? []).map((place) => (
            <a
              key={place.id}
              href={routeHref({ facility: place.slug })}
              onClick={(e) => {
                if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
                e.preventDefault();
                navigate(routeHref({ facility: place.slug }));
              }}
              className="bg-white rounded-2xl border border-slate-200/90 shadow-2xs hover:shadow-md hover:border-[#941946]/40 transition-all p-2.5 flex items-center gap-3 group overflow-hidden"
            >
              <Thumb src={place.logo} alt={place.name} kind="facility" fit="contain" className="w-16 h-16 rounded-xl shrink-0 border border-slate-100" />

              <div className="flex-1 min-w-0 space-y-1">
                <p className="text-xs font-bold text-slate-900 group-hover:text-[#941946] transition-colors truncate">{place.name}</p>
                <div className="flex items-center justify-between gap-2">
                  <span className="flex items-center gap-1 text-[11px] font-bold text-rose-700 min-w-0">
                    <MapPin className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{formatKm(place.distance_km, isAr) ?? place.branch?.city ?? place.branch?.governorate}</span>
                  </span>
                  {place.discount != null && (
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 shrink-0">
                      {isAr ? `خصم ${place.discount}%` : `${place.discount}% OFF`}
                    </span>
                  )}
                </div>
              </div>
            </a>
          ))}
        </div>
      )}

      {/* 8. Show Medical Card CTA */}
      <div className="pt-1">
        <button
          onClick={onNavigateToCard}
          className="w-full py-3.5 bg-gradient-to-r from-[#941946] to-[#6d1132] text-white rounded-2xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-rose-950/20 active:scale-98 transition-all"
        >
          <CreditCard className="w-4 h-4 text-amber-300" />
          <span>{isAr ? 'عرض كرتي الطبي للاستفادة من الخصم الآن' : 'Show my medical card to get the discount'}</span>
        </button>
      </div>
    </div>
  );
};
