import { apiGet, apiGetAuth, apiPost, apiPut, apiUrl } from './http';
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

/** Whether this phone already holds a card (no code is sent). Used to offer the free trial to a new number. */
export const phoneHasCard = (phone: string) => apiPost<{ data: { has_card: boolean } }>('/mobile/auth/phone-check', { phone }).then((r) => r.data.has_card);

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

  const url = URL.createObjectURL(await res.blob());
  const a = document.createElement('a');
  a.href = url;
  a.download = `deilar-card-${number}-${side}.png`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}


/** The signed-in member's own details. */
export interface Profile {
  name: string | null;
  email: string | null;
  phone: string | null;
  nationalId: string | null;
  governorateId: number | null;
  cityId: number | null;
  /** False when the member has no membership row at all, so there is nowhere to save an area. */
  hasMembership: boolean;
}

interface ProfileResponse {
  data: {
    user: { name: string | null; email: string | null; phone: string | null; membership: { national_id: string | null; governorate_id: number | null; city_id: number | null } | null };
  };
}

export const fetchProfile = (token: string): Promise<Profile> =>
  apiGetAuth<ProfileResponse>('/profile', token).then(({ data: { user } }) => ({
    name: user.name,
    email: user.email,
    phone: user.phone,
    nationalId: user.membership?.national_id ?? null,
    governorateId: user.membership?.governorate_id ?? null,
    cityId: user.membership?.city_id ?? null,
    hasMembership: !!user.membership,
  }));

/** Saves the editable details. The phone is the login, so it is never changed from here. Throws `ApiError` (422 carries `errors`). */
export const updateProfile = (token: string, body: { name: string; email: string | null; national_id: string | null; governorate_id: number | null }) =>
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
