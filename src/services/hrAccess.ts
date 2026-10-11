import { apiFetch } from './api';
import { IDENTITY_BASE } from './employees';

/** Proposal kinds the four-eyes flow governs. */
export type HrAccessRequestType =
  | 'add_hr'
  | 'deactivate_hr'
  | 'reactivate_hr'
  | 'reset_password'
  | 'update_hr';

/** Proposal lifecycle: pending until exactly one decision or a withdrawal. */
export type HrAccessRequestState =
  | 'pending'
  | 'approved'
  | 'rejected'
  | 'withdrawn';

/** Snapshot of the HR account that proposed or decided a row. */
export interface HrAccessPerson {
  id: string;
  name: string;
  email: string;
}

/** Snapshot of the HR account a deactivation proposal points at. */
export interface HrAccessTarget {
  id: string;
  name: string;
  email: string;
  status: string;
}

/** One proposal as the API returns it on every list and decision answer. */
export interface HrAccessRequest {
  id: string;
  type: HrAccessRequestType;
  state: HrAccessRequestState;
  proposedName: string | null;
  proposedEmail: string | null;
  proposedPosition: string | null;
  proposedPhone: string | null;
  targetEmployeeId: string | null;
  target: HrAccessTarget | null;
  maker: HrAccessPerson;
  checker: HrAccessPerson | null;
  decisionNote: string | null;
  decidedAt: string | null;
  createdAt: string;
  updatedAt: string;
  /** Display hint: the viewer may decide only someone else's pending row. */
  canDecide: boolean;
  /**
   * Display hint: the signed-in viewer is the account this row removes, so
   * the server will refuse any decision from it and the UI withholds the
   * buttons outright. Absent on rows the server does not treat as self-targeted.
   */
  viewerIsTarget?: boolean;
}

/** Envelope of the list answer; the section only needs the rows. */
interface HrAccessListBody {
  items: HrAccessRequest[];
  total: number;
}

/** The four profile fields an `add_hr` proposal carries. */
export interface HrAccessAddInput {
  type: 'add_hr';
  name: string;
  email: string;
  position: string;
  phone: string;
}

/** The account a `deactivate_hr` proposal points at; nothing else is sent. */
export interface HrAccessDeactivateInput {
  type: 'deactivate_hr';
  targetEmployeeId: string;
}

/** The account a `reactivate_hr` proposal points at; same shape as deactivate. */
export interface HrAccessReactivateInput {
  type: 'reactivate_hr';
  targetEmployeeId: string;
}

/** The account a `reset_password` proposal points at; same shape as deactivate. */
export interface HrAccessResetPasswordInput {
  type: 'reset_password';
  targetEmployeeId: string;
}

/**
 * Profile columns a `update_hr` proposal carries alongside its target: only
 * the fields the maker actually changed are sent, so an untouched column is
 * never part of the proposal.
 */
export interface HrAccessUpdateInput {
  type: 'update_hr';
  targetEmployeeId: string;
  name?: string;
  position?: string;
  phone?: string;
}

/** Either proposal kind; the `type` discriminator picks the shape. */
export type HrAccessCreateInput =
  | HrAccessAddInput
  | HrAccessDeactivateInput
  | HrAccessReactivateInput
  | HrAccessResetPasswordInput
  | HrAccessUpdateInput;

/**
 * A decision answer: the proposal plus, for `add_hr` and `reset_password`,
 * the one-time password.
 * It lives only in this response — no endpoint can hand it back later, so the
 * caller must show it immediately and drop it.
 */
export interface HrAccessDecision extends HrAccessRequest {
  temporaryPassword?: string;
}

/** Reads the proposals, optionally narrowed by state or kind, newest first. */
export async function listHrAccessRequests(
  state?: HrAccessRequestState,
  type?: HrAccessRequestType,
): Promise<HrAccessRequest[]> {
  const params = new URLSearchParams();
  if (state !== undefined) {
    params.set('state', state);
  }
  if (type !== undefined) {
    params.set('type', type);
  }
  const query = params.toString();
  const body = await apiFetch<HrAccessListBody | null>(
    `${IDENTITY_BASE}/hr-access-requests${query === '' ? '' : `?${query}`}`,
  );
  return Array.isArray(body?.items) ? body.items : [];
}

/**
 * Files a new proposal: `add_hr` carries the four profile fields, `update_hr`
 * the target account plus whichever profile columns changed, and
 * `deactivate_hr` / `reactivate_hr` / `reset_password` only the target
 * account. A duplicate email answers with `EMAIL_TAKEN`; the server also
 * refuses a target whose current status does not fit the kind — the UI cannot
 * make that check, so it only ever offers the kind the loaded status allows.
 */
export async function createHrAccessRequest(
  input: HrAccessCreateInput,
): Promise<HrAccessRequest> {
  return apiFetch<HrAccessRequest>(`${IDENTITY_BASE}/hr-access-requests`, {
    method: 'POST',
    body: JSON.stringify(input),
  });
}

/**
 * Approves someone else's proposal. The optional note is the checker's own
 * comment; the account password only ever arrives in this answer.
 */
export async function approveHrAccessRequest(
  id: string,
  note?: string,
): Promise<HrAccessDecision> {
  return apiFetch<HrAccessDecision>(
    `${IDENTITY_BASE}/hr-access-requests/${encodeURIComponent(id)}/approve`,
    {
      method: 'POST',
      body: JSON.stringify({ note }),
    },
  );
}

/** Rejects someone else's proposal; the server refuses an empty reason. */
export async function rejectHrAccessRequest(
  id: string,
  note: string,
): Promise<HrAccessRequest> {
  return apiFetch<HrAccessRequest>(
    `${IDENTITY_BASE}/hr-access-requests/${encodeURIComponent(id)}/reject`,
    {
      method: 'POST',
      body: JSON.stringify({ note }),
    },
  );
}

/** Withdraws the viewer's own pending proposal; accounts are never touched. */
export async function withdrawHrAccessRequest(
  id: string,
): Promise<HrAccessRequest> {
  return apiFetch<HrAccessRequest>(
    `${IDENTITY_BASE}/hr-access-requests/${encodeURIComponent(id)}/withdraw`,
    { method: 'POST' },
  );
}
