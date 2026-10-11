"use client";
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, authenticate, type Session } from '@/services/api';
import { logout, refreshSession } from '@/services/auth';
import { can as roleCan, type Permission } from '@/services/permissions';

type Status = 'restoring' | 'anonymous' | 'authenticated';
interface AuthState {
  status: Status; token: string | null; session: Session | null;
  /** Verifies an access token with the API, then stores it in memory only. */
  signIn: (token: string) => Promise<void>;
  signOut: () => Promise<void>;
  /** Runs an authorized call; a 401 triggers one cookie refresh and retry, then signs out. */
  call: <T>(run: (token: string) => Promise<T>) => Promise<T>;
  can: (permission: Permission) => boolean;
}
const AuthContext = createContext<AuthState | null>(null);

/** Keeps bearer credentials in memory; the HttpOnly refresh cookie restores a session after reload. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<{ token: string; session: Session } | null>(null);
  const [status, setStatus] = useState<Status>('restoring');
  const tokenRef = useRef<string | null>(null);
  const refreshing = useRef<Promise<string | null> | null>(null);

  const signIn = useCallback(async (token: string) => {
    const session = await authenticate(token);
    tokenRef.current = token; setAuth({ token, session }); setStatus('authenticated');
  }, []);
  const clear = useCallback(() => { tokenRef.current = null; setAuth(null); setStatus('anonymous'); }, []);
  const refresh = useCallback(() => {
    refreshing.current ??= refreshSession().then(async ({ accessToken }) => { await signIn(accessToken); return accessToken; })
      .catch(() => null).finally(() => { refreshing.current = null; });
    return refreshing.current;
  }, [signIn]);

  useEffect(() => { let live = true; refresh().then((token) => { if (live && !token) setStatus((s) => (s === 'restoring' ? 'anonymous' : s)); }); return () => { live = false; }; }, [refresh]);

  const signOut = useCallback(async () => { const token = tokenRef.current; clear(); try { await logout(token); } catch { /* session already cleared locally */ } }, [clear]);
  const call = useCallback(async <T,>(run: (token: string) => Promise<T>) => {
    const token = tokenRef.current;
    if (!token) throw new ApiError(401, 'Session expired. Sign in again.', 'UNAUTHENTICATED');
    try { return await run(token); } catch (error) {
      if (!(error instanceof ApiError) || error.status !== 401) throw error;
      const next = await refresh();
      if (!next) { clear(); throw error; }
      return run(next);
    }
  }, [refresh, clear]);
  const value = useMemo<AuthState>(() => ({ status, token: auth?.token ?? null, session: auth?.session ?? null, signIn, signOut, call,
    can: (permission) => roleCan(auth?.session.role, permission) }), [status, auth, signIn, signOut, call]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
/** Accesses the single session injection point. */
export function useAuth() { const auth = useContext(AuthContext); if (!auth) throw new Error('AuthProvider missing'); return auth; }
