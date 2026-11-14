"use client";
import { createContext, useCallback, useContext, useMemo, useRef, useState, type ReactNode } from 'react';
import { ApiError, authenticate, type Session } from '@/services/api';
import { logout, refreshSession, type TokenPair } from '@/services/auth';
import { can as roleCan, type Permission } from '@/services/permissions';

type Status = 'anonymous' | 'authenticated';
interface AuthState {
  status: Status; token: string | null; session: Session | null;
  /** Verifies the access token with the API, then keeps both tokens in memory only. */
  signIn: (tokens: TokenPair) => Promise<void>;
  signOut: () => Promise<void>;
  /** Runs an authorized call; a 401 triggers one refresh-token rotation and retry, then signs out. */
  call: <T>(run: (token: string) => Promise<T>) => Promise<T>;
  can: (permission: Permission) => boolean;
}
const AuthContext = createContext<AuthState | null>(null);

/**
 * Keeps bearer and refresh tokens in tab memory. The live API returns the refresh token in the response body
 * (no HttpOnly cookie yet, see API_need_fix.md), so a page reload signs the user out rather than persisting it in storage.
 */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<{ token: string; session: Session } | null>(null);
  const [status, setStatus] = useState<Status>('anonymous');
  const tokenRef = useRef<string | null>(null);
  const refreshRef = useRef<string | null>(null);
  const refreshing = useRef<Promise<string | null> | null>(null);

  const signIn = useCallback(async ({ accessToken, refreshToken }: TokenPair) => {
    const session = await authenticate(accessToken);
    tokenRef.current = accessToken; refreshRef.current = refreshToken;
    setAuth({ token: accessToken, session }); setStatus('authenticated');
  }, []);
  const clear = useCallback(() => { tokenRef.current = null; refreshRef.current = null; setAuth(null); setStatus('anonymous'); }, []);
  const refresh = useCallback(() => {
    const current = refreshRef.current;
    if (!current) return Promise.resolve(null);
    refreshing.current ??= refreshSession(current).then(async (pair) => { await signIn(pair); return pair.accessToken; })
      .catch(() => null).finally(() => { refreshing.current = null; });
    return refreshing.current;
  }, [signIn]);

  const signOut = useCallback(async () => {
    const current = refreshRef.current; clear();
    if (current) { try { await logout(current); } catch { /* session already cleared locally */ } }
  }, [clear]);
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
