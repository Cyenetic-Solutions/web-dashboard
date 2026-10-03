"use client";
import { createContext, useContext, useState, type ReactNode } from 'react';
import { authenticate, type Session } from '@/services/api';

interface AuthState { token: string | null; session: Session | null; signIn: (token: string) => Promise<void>; signOut: () => void }
const AuthContext = createContext<AuthState | null>(null);
/** Keeps bearer credentials in memory only; refresh intentionally signs the operator out. */
export function AuthProvider({ children }: { children: ReactNode }) {
  const [auth, setAuth] = useState<{ token: string; session: Session } | null>(null);
  async function signIn(token: string) { const session = await authenticate(token); setAuth({ token, session }); }
  return <AuthContext.Provider value={{ token: auth?.token ?? null, session: auth?.session ?? null, signIn, signOut: () => setAuth(null) }}>{children}</AuthContext.Provider>;
}
/** Accesses the single session injection point. */
export function useAuth() { const auth = useContext(AuthContext); if (!auth) throw new Error('AuthProvider missing'); return auth; }
