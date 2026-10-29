import { absoluteUrl, apiDelete, apiGetAuth, apiPatch, apiPost } from './http';

export type ApprovalStatus = 'pending' | 'approved' | 'rejected';

/** A person on the member's card, as the server sees them (pending and rejected ones included). */
export interface FamilyPerson {
  id: number;
  name: string;
  relationship: string | null;
  relationship_label: string | null;
  is_active: boolean;
  approval_status: ApprovalStatus;
  rejection_reason: string | null;
}

/** The card's people, plus whether the signed-in member may add children (the backend: a male member). */
export const fetchFamily = (token: string) =>
  apiGetAuth<{ data: { family_members: FamilyPerson[]; can_add_children?: boolean } }>('/family', token).then((r) => ({
    members: r.data.family_members,
    canAddChildren: r.data.can_add_children === true,
  }));

/** A father adds a child by FIRST name only: the backend appends his own name. Needs the birth date or a phone (one of phone / birth date / National ID is mandatory for every relative). A phone typed here is saved UNVERIFIED: the relative's first sign-in code verifies it. Waits for staff approval. */
export const addFamilyChild = (token: string, body: { first_name: string; relationship: 'son' | 'daughter'; date_of_birth?: string; phone?: string }) =>
  apiPost<{ data: { family_member: FamilyPerson } }>('/family/children', body, undefined, token);

/**
 * Sends a relative for staff approval. `body` carries name, relationship, national_id and the
 * three images (id_front, id_back, photo) — all required. Throws `ApiError` (422 carries `errors`).
 */
export const addFamilyMember = (token: string, body: FormData) =>
  apiPost<{ data: { family_member: FamilyPerson } }>('/family/members', body, undefined, token);

/** One person of a family circle, with what the whole family may see of each other. */
export interface FamilyCirclePerson {
  id: number;
  name: string | null;
  phone: string | null;
  /** False for a phone typed in by the primary member that no SMS code has proven yet. */
  phone_verified?: boolean;
  avatar_url?: string | null;
  membership_number: string;
  /** The holder of the primary card. */
  is_primary: boolean;
  is_me: boolean;
  relationship: string | null;
  relationship_label: string | null;
  is_active: boolean;
  approval_status: ApprovalStatus | null;
  rejection_reason?: string | null;
  /** The card owner may complete / photograph / remove this person (never themselves). */
  editable?: boolean;
  /** Only on the card owner's own family; null for anyone else's view. */
  national_id?: string | null;
  date_of_birth?: string | null;
  points: number;
  badges: { title: string; icon: string | null; quiz: string | null }[];
}

export interface FamilyOverview {
  role: 'primary' | 'relative' | null;
  /** The card the member belongs to now (a relative's: the primary holder first). */
  current: FamilyCirclePerson[];
  /** The card a paying relative came from — still visible after becoming primary. */
  former: FamilyCirclePerson[];
  can_add_relatives: boolean;
}

export const fetchFamilyOverview = (token: string) => apiGetAuth<{ data: FamilyOverview }>('/family/overview', token).then((r) => r.data);

/**
 * The card owner completes a relative's data. A relative still waiting for staff can be edited freely; an approved one only
 * gets its EMPTY phone / birth date / National ID filled (the backend answers 422 for the rest). A new phone is saved unverified.
 */
export const updateRelative = (token: string, id: number, body: { name?: string; phone?: string | null; date_of_birth?: string | null; national_id?: string | null }) =>
  apiPatch<{ data: { family_member: FamilyPerson } }>(`/family/relatives/${id}`, body, token).then((r) => r.data.family_member);

/** The card owner removes one of their relatives (any relation, waiting or approved). */
export const deleteRelative = (token: string, id: number) => apiDelete<{ success: boolean }>(`/family/relatives/${id}`, token);

/** Sets the profile photo of one of the owner's relatives (an image up to 2 MB); resolves to its URL. */
export const uploadRelativeAvatar = (token: string, id: number, file: File) => {
  const form = new FormData();
  form.append('avatar', file);
  return apiPost<{ data: { avatar_url: string | null } }>(`/family/relatives/${id}/avatar`, form, undefined, token).then((r) => absoluteUrl(r.data.avatar_url));
};
