import { saveImage } from '../utils/saveImage';
import { apiGet, apiGetAuth, apiPost, apiPut, apiUrl, absoluteUrl } from './http';
import type { CardStatus } from './membership';

export interface OtpSent {
  phone_masked: string;
  registering: boolean;
  code_length: number;
  expires_in: number;
  resend_after: number;
}

export interface Verified {
  token: string;
  user: { id: number; name: string | null; phone: string | null };
  membership: { membership_number: string; is_active: boolean; expiration_date: string | null } | null;
}

/** Asks the backend to text a code to `phone`. Throws `ApiError` (`reason`: invalid_phone, cooldown, not_configured, send_failed). */
export const requestOtp = (phone: string) => apiPost<{ data: OtpSent }>('/mobile/auth/otp', { phone }).then((r) => r.data);

/** Trades phone + code for a token. Throws `ApiError` (`reason`: invalid_code, expired, too_many_attempts, unknown_phone). */
export const verifyOtp = (phone: string, code: string) => apiPost<{ data: Verified }>('/mobile/auth/otp/verify', { phone, code }).then((r) => r.data);

/**
 * Whether this phone is already known — it holds a card, or is registered (an account with no card yet). No code is sent.
 * A known phone is signed in with its code; only a stranger is offered the free card first.
 */
export const phoneHasCard = (phone: string) =>
  apiPost<{ data: { has_card: boolean; registered?: boolean } }>('/mobile/auth/phone-check', { phone }).then((r) => r.data.has_card || r.data.registered === true);

export const signOut = (token: string) => apiPost('/auth/logout', {}, undefined, token);

/** What the card screen draws; deliberately without contact details. */
export interface CardData {
  number: string;
  active: boolean;
  valid_from: string | null;
  valid_to: string | null;
  holder: string;
  members: { id: number; name: string; relationship: string }[];
  /** trial / expired / active, the price and how to pay or call. Absent on a backend older than trial cards. */
  status?: CardStatus;
}

export const fetchCard = (number: string, signal?: AbortSignal) =>
  apiGet<CardData>(`/mobile/card/${encodeURIComponent(number)}`, {}, { signal, ttl: 30_000 });

/**
 * The real card artwork the admin's template renders for this member (PNG).
 * Plain image URLs: the browser loads and caches them; the back is only asked
 * for when someone flips the card, as the server renders it on demand.
 */
export const cardImageUrl = (number: string, side: 'front' | 'back') =>
  apiUrl(`/memberships/${encodeURIComponent(number)}/card${side === 'back' ? '/back' : ''}?mode=full`);

/** Saves the real card image as a file. Rejects if it cannot be fetched, so the caller can fall back. */
export async function downloadCardImageFile(number: string, side: 'front' | 'back'): Promise<void> {
  const res = await fetch(cardImageUrl(number, side));
  if (!res.ok) throw new Error(`Card image unavailable (${res.status})`);

  await saveImage(await res.blob(), `deilar-card-${number}-${side}.png`);
}


/** The signed-in member's own details. */
export interface Profile {
  name: string | null;
  email: string | null;
  phone: string | null;
  /** The profile photo's address, or null when none was uploaded. */
  avatarUrl: string | null;
  nationalId: string | null;
  gender: 'male' | 'female' | null;
  /** `YYYY-MM-DD`, or null when not given. */
  dob: string | null;
  jobTitle: string | null;
  companyName: string | null;
  /** How complete the profile is, as the backend counts it (`RegistrationProgress`) — never counted here. */
  progress: { percent: number; missing: string[] } | null;
  governorateId: number | null;
  cityId: number | null;
  /** False when the member has no membership row at all, so there is nowhere to save an area. */
  hasMembership: boolean;
  /** The latest national-ID change request, if the member ever filed one. */
  idChange: { status: 'pending' | 'approved' | 'rejected'; new_national_id: string; review_note: string | null } | null;
}

interface ProfileResponse {
  data: {
    user: { name: string | null; email: string | null; phone: string | null; avatar_url?: string | null; gender?: string | null; date_of_birth?: string | null; membership: { national_id: string | null; job_title?: string | null; company_name?: string | null; governorate_id: number | null; city_id: number | null } | null };
    registration?: { overall?: { percent: number; missing: string[] } };
    national_id_change?: Profile['idChange'];
  };
}

export const fetchProfile = (token: string): Promise<Profile> =>
  apiGetAuth<ProfileResponse>('/profile', token).then(({ data: { user, national_id_change, registration } }) => ({
    name: user.name,
    email: user.email,
    phone: user.phone,
    avatarUrl: absoluteUrl(user.avatar_url),
    nationalId: user.membership?.national_id ?? null,
    dob: user.date_of_birth ?? null,
    jobTitle: user.membership?.job_title ?? null,
    companyName: user.membership?.company_name ?? null,
    progress: registration?.overall ? { percent: registration.overall.percent, missing: registration.overall.missing } : null,
    gender: user.gender === 'male' || user.gender === 'female' ? user.gender : null,
    governorateId: user.membership?.governorate_id ?? null,
    cityId: user.membership?.city_id ?? null,
    hasMembership: !!user.membership,
    idChange: national_id_change ?? null,
  }));

/** Saves the editable details. The phone is the login, so it is never changed from here. Throws `ApiError` (422 carries `errors`). */
export const updateProfile = (token: string, body: { name: string; email: string | null; gender?: 'male' | 'female' | null; date_of_birth?: string | null; job_title?: string | null; company_name?: string | null; national_id?: string | null; governorate_id: number | null; city_id?: number | null }) =>
  apiPut('/profile', body, token);

/** Saves the governorate (and city) on the member's card — the permanent copy of the area picked on this device. */
export const saveMemberArea = (token: string, body: { governorate_id: number; city_id: number | null }) => apiPut('/profile', body, token);

/** The delivery address saved on the signed-in member's card (home first), or null. Only ever sent to the signed-in member. */
export interface SavedAddress {
  type: 'home' | 'work' | 'other' | null;
  street: string | null;
  governorate: string | null;
  city: string | null;
  building_number: string | null;
  floor_number: string | null;
  apartment_number: string | null;
  special_mark: string | null;
}

export const fetchSavedAddress = (token: string) => apiGetAuth<{ address: SavedAddress | null }>('/mobile/me', token).then((r) => r.address);

export type AddressType = 'home' | 'work' | 'other';

/** One address on the member's card, as the backend returns it (names in the current language). */
export interface MemberAddress {
  id: number;
  type: AddressType;
  street: string | null;
  building_number: string | null;
  floor_number: string | null;
  apartment_number: string | null;
  special_mark: string | null;
  governorate_id: number | null;
  governorate_name: string | null;
  city_id: number | null;
  city_name: string | null;
}

/** The addresses on the member's card (one per type). The same rows show in the admin dashboard on the member's page. */
export const fetchAddresses = (token: string) =>
  apiGetAuth<{ data: { addresses: MemberAddress[] } }>('/addresses', token).then((r) => r.data.addresses);

/** Saves (adds or updates) the address of one type. The governorate is required by the backend; the city is optional. */
export const saveAddress = (token: string, body: {
  type: AddressType; governorate_id: number; city_id: number | null; street: string;
  building_number?: string; floor_number?: string; apartment_number?: string; special_mark?: string;
}) => apiPost('/addresses', body, undefined, token);

/** Saves the member's home address on the card (used by the personal-details form). */
export const saveHomeAddress = (token: string, body: { governorate_id: number; city_id: number | null; street: string; building_number?: string }) =>
  saveAddress(token, { type: 'home', ...body });

/** Uploads the profile photo (an image up to 2 MB). */
export const uploadAvatar = (token: string, file: File) => {
  const form = new FormData();
  form.append('avatar', file);
  return apiPost<{ data: { avatar_url: string | null } }>('/profile/avatar', form, undefined, token).then((r) => absoluteUrl(r.data.avatar_url));
};
