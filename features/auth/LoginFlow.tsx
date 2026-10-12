"use client";
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import type { OtpChallenge } from '@/services/auth';
import CredentialsStep from './CredentialsStep';
import OtpStep from './OtpStep';

/** Two-factor sign-in: password, then an emailed one-time code. The challenge token lives only in component memory. */
export default function LoginFlow() {
  const { signIn, status } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const [pending, setPending] = useState<{ challenge: OtpChallenge; email: string } | null>(null);
  const next = params.get('next');
  const target = next && next.startsWith('/') && !next.startsWith('//') ? next : '/';
  useEffect(() => { if (status === 'authenticated') router.replace(target); }, [status, router, target]);
  async function finish(token: string) { await signIn(token); router.replace(target); }
  return pending
    ? <OtpStep challenge={pending.challenge} email={pending.email} onVerified={finish} onRestart={() => setPending(null)} />
    : <CredentialsStep onChallenge={(challenge, email) => setPending({ challenge, email })} />;
}
