import { apiGetAuth, apiPost } from './http';

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

/** A father adds a child by FIRST name only: the backend appends his own name. Waits for staff approval. */
export const addFamilyChild = (token: string, body: { first_name: string; relationship: 'son' | 'daughter' }) =>
  apiPost<{ data: { family_member: FamilyPerson } }>('/family/children', body, undefined, token);

/**
 * Sends a relative for staff approval. `body` carries name, relationship, national_id and the
 * three images (id_front, id_back, photo) — all required. Throws `ApiError` (422 carries `errors`).
 */
export const addFamilyMember = (token: string, body: FormData) =>
  apiPost<{ data: { family_member: FamilyPerson } }>('/family/members', body, undefined, token);
