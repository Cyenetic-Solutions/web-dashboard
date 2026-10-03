"use client";
import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { demoLogin } from '@/services/api';

/** Bootstrap sign-in supports a verified IdP token and an explicitly enabled local demo. */
export default function LoginPage() {
  const [credential, setCredential] = useState('');
  const [demo, setDemo] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const { signIn } = useAuth();
  const router = useRouter();
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError('');
    try { const token = demo ? (await demoLogin(credential)).token : credential; await signIn(token); setCredential(''); router.push('/'); }
    catch (error) { setError(error instanceof Error ? error.message : 'Sign-in failed'); }
    finally { setPending(false); }
  }
  return <section className="mx-auto max-w-xl border border-white/20 p-8"><h1 className="font-display text-4xl uppercase">Staff access</h1><p className="my-5 text-white/60">Connect a short-lived token from your MFA identity provider. Credentials stay in this tab’s memory. Interactive identity-provider login is not configured yet.</p>
    <form onSubmit={submit} className="space-y-5"><label className="block">{demo ? 'Local demo key' : 'MFA access token'}<input autoComplete="off" type="password" required value={credential} onChange={(event) => setCredential(event.target.value)} className="mt-2 block w-full rounded-none border border-white/20 bg-neutral-900 p-3" /></label>
      {process.env.NEXT_PUBLIC_DEMO_MODE === 'true' && <label className="flex items-center gap-3 text-sm"><input type="checkbox" checked={demo} onChange={(event) => setDemo(event.target.checked)} />Use local demo (no real MFA)</label>}
      <button disabled={pending} className="min-h-12 bg-cye-orange px-6 font-mono text-xs uppercase text-black disabled:opacity-50">{pending ? 'Connecting…' : 'Connect session'}</button><p role="alert" className="text-sm text-cye-orange">{error}</p>
    </form></section>;
}
