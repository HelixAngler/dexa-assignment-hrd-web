import { apiFetch, ApiError } from './api';

/** Base path of the identity API on the same origin. */
export const IDENTITY_BASE = '/api/identity';

/** The two roles the product knows about. */
export type Role = 'employee' | 'hrd';

/** Self-service profile fields returned by the profile endpoint. */
export interface Profile {
  name: string;
  email: string;
  position: string;
  phone: string;
  photoUrl: string | null;
}

/**
 * What the app needs to know about the signed-in user: the role that decides
 * whether this console may open at all, the forced-change flag, plus the
 * profile fields when the probe returned them. Profile fields stay optional
 * because a sign-in response only carries the two flags.
 */
export interface Session {
  role: Role;
  mustChangePassword: boolean;
  name?: string;
  email?: string;
  position?: string;
  phone?: string;
  photoUrl?: string | null;
}

/** Flags returned by a successful sign-in. */
export interface LoginResult {
  role: Role;
  mustChangePassword: boolean;
}

/**
 * Role flags remembered by this tab's sign-in form. They are no longer what
 * bootstraps the console: the profile probe answers with the session's own
 * role, so a tab that only shares the session cookie (a fresh tab, or one
 * opened by a sign-in that happened elsewhere) still knows which console it
 * may open. The stored copy survives as a legacy path for a profile payload
 * that does not carry the flags yet, and for the forced-change flag, which
 * only sign-in and the password screens set. This app keeps them under its
 * own key so it never reads the flags the employee app remembers for the
 * same origin.
 */
interface SessionMeta {
  role: Role;
  mustChangePassword: boolean;
}

/** Session-storage slot holding {@link SessionMeta}; cleared on sign-out. */
const META_STORAGE_KEY = 'hrd-session-meta';

/**
 * Role assumed when a live session cookie exists but neither the profile nor
 * the remembered flags name one: the console only opens for HRD accounts, so
 * anything unknown is treated as an employee session and lands on the
 * access-denied view.
 */
const FALLBACK_ROLE: Role = 'employee';

/** Profile payload shape: fields may be absent, flags are optional extras. */
type ProfileProbe = Partial<Profile> & Partial<LoginResult>;

function readMeta(): SessionMeta | null {
  try {
    const raw = window.sessionStorage.getItem(META_STORAGE_KEY);
    if (raw === null) {
      return null;
    }
    const parsed: unknown = JSON.parse(raw);
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'role' in parsed &&
      'mustChangePassword' in parsed
    ) {
      const meta = parsed as SessionMeta;
      if (
        (meta.role === 'employee' || meta.role === 'hrd') &&
        typeof meta.mustChangePassword === 'boolean'
      ) {
        return meta;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function writeMeta(meta: SessionMeta): void {
  try {
    window.sessionStorage.setItem(META_STORAGE_KEY, JSON.stringify(meta));
  } catch {
    // Storage may be unavailable; routing then relies on the probe payload.
  }
}

function clearMeta(): void {
  try {
    window.sessionStorage.removeItem(META_STORAGE_KEY);
  } catch {
    // Storage may be unavailable; nothing remembered, nothing to clear.
  }
}

/**
 * Signs in with company email and password. Success remembers the returned
 * role flags for later bootstraps; failure rejects with a typed `ApiError`
 * carrying the status, machine code and, on a rejected credential, the
 * attempts still left.
 */
export async function login(email: string, password: string): Promise<LoginResult> {
  const result = await apiFetch<LoginResult>(`${IDENTITY_BASE}/auth/login`, {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });
  writeMeta({ role: result.role, mustChangePassword: result.mustChangePassword });
  return result;
}

/**
 * Ends the server session. A transport failure cannot be reported to the
 * server, so the local session data is dropped either way and the call
 * resolves instead of leaving the UI stuck on a signed-in state.
 */
export async function logout(): Promise<void> {
  try {
    await apiFetch<null>(`${IDENTITY_BASE}/auth/logout`, { method: 'POST' });
  } catch {
    // The cookie is HttpOnly and expires server-side regardless.
  } finally {
    clearMeta();
  }
}

/**
 * Bootstraps the session by probing the profile endpoint: a 401 means nobody
 * is signed in (`null`), any other failure rejects so callers do not mistake
 * a network problem for an expired session. The probe payload decides the
 * role whenever it carries one — that is the path every session takes, with
 * or without anything this tab previously remembered. The stored flags are
 * consulted only when the payload omits them, and when nothing at all knows
 * the role the console denies by design.
 */
export async function fetchSession(): Promise<Session | null> {
  let profile: ProfileProbe;
  try {
    profile = await apiFetch<ProfileProbe>(`${IDENTITY_BASE}/profile`);
  } catch (error) {
    if (error instanceof ApiError && error.status === 401) {
      return null;
    }
    throw error;
  }

  const meta = readMeta();
  const session: Session = {
    role: profile.role ?? meta?.role ?? FALLBACK_ROLE,
    mustChangePassword: profile.mustChangePassword ?? meta?.mustChangePassword ?? false,
  };
  if (profile.name !== undefined) session.name = profile.name;
  if (profile.email !== undefined) session.email = profile.email;
  if (profile.position !== undefined) session.position = profile.position;
  if (profile.phone !== undefined) session.phone = profile.phone;
  if (profile.photoUrl !== undefined) session.photoUrl = profile.photoUrl;
  return session;
}

/**
 * Replaces the temporary first-login password. On success the remembered
 * change flag is cleared immediately, so the very next session probe reports
 * a signed-in user who may go anywhere in this console.
 */
export async function setFirstPassword(
  newPassword: string,
  confirmPassword: string,
): Promise<void> {
  await apiFetch<null>(`${IDENTITY_BASE}/auth/password/set-first`, {
    method: 'POST',
    body: JSON.stringify({ newPassword, confirmPassword }),
  });
  const meta = readMeta();
  if (meta !== null) {
    writeMeta({ ...meta, mustChangePassword: false });
  }
}
