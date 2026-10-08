import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import {
  fetchSession as probeSession,
  login as requestLogin,
  logout as requestLogout,
  type Session,
} from './auth';

/** Lifecycle of the session probe seen by the whole UI. */
export type SessionStatus = 'loading' | 'anon' | 'authed';

export interface SessionValue {
  /** The signed-in user, or `null` while anonymous. */
  session: Session | null;
  /** `loading` until the first probe settles, then `anon` or `authed`. */
  status: SessionStatus;
  /** Re-runs the probe; used after actions that change the session flags. */
  refresh: () => Promise<void>;
  /** Signs in; resolves with the resulting session, rejects typed errors. */
  login: (email: string, password: string) => Promise<Session>;
  /** Signs out; always leaves the app anonymous, even if the call fails. */
  logout: () => Promise<void>;
}

/**
 * Exported so tests can hand the tree a fixed session without going through
 * the network; application code should use {@link useSession} instead.
 */
export const SessionContext = createContext<SessionValue | null>(null);

export interface SessionProviderProps {
  children: ReactNode;
}

/**
 * Owns the session for the console: probes the profile once on mount,
 * exposes sign-in/sign-out, and re-probes on demand. A probe that fails for
 * any reason other than "signed in" resolves to anonymous — the login screen
 * reports trouble again as soon as the user tries to sign in — so the app
 * never hangs on the loading state.
 */
export function SessionProvider({ children }: SessionProviderProps) {
  const [session, setSession] = useState<Session | null>(null);
  const [status, setStatus] = useState<SessionStatus>('loading');

  const refresh = useCallback(async () => {
    try {
      const next = await probeSession();
      setSession(next);
      setStatus(next === null ? 'anon' : 'authed');
    } catch {
      setSession(null);
      setStatus('anon');
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const flags = await requestLogin(email, password);
    let next: Session;
    try {
      next = (await probeSession()) ?? { ...flags };
    } catch {
      // The sign-in itself worked; keep the flags even if the profile
      // probe could not run so the forced-change routing still applies.
      next = { ...flags };
    }
    setSession(next);
    setStatus('authed');
    return next;
  }, []);

  const logout = useCallback(async () => {
    await requestLogout();
    setSession(null);
    setStatus('anon');
  }, []);

  const value = useMemo<SessionValue>(
    () => ({ session, status, refresh, login, logout }),
    [session, status, refresh, login, logout],
  );

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

/** Access the current session and the auth actions. */
export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (value === null) {
    throw new Error('useSession must be used inside <SessionProvider>.');
  }
  return value;
}
