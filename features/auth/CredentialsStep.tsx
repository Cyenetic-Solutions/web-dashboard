"use client";
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { ApiError } from '@/services/http';
import { emailSchema, startLogin, type OtpChallenge } from '@/services/auth';

/** Factor 1: email + password. On success the API emails a one-time code and returns an opaque challenge. */
export default function CredentialsStep({ onChallenge }: { onChallenge: (challenge: OtpChallenge, email: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError(''); setPending(true);
    try {
      const parsed = emailSchema.safeParse(email);
      if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Enter a valid email'); return; }
      onChallenge(await startLogin(parsed.data, password), parsed.data);
      setPassword('');
    } catch (err) {
      if (err instanceof ApiError && err.status === 429) setError('Too many attempts. Wait a few minutes before trying again.');
      else if (err instanceof ApiError && (err.status === 401 || err.status === 423)) setError('Invalid email or password.');
      else setError(err instanceof Error ? err.message : 'Sign-in failed');
    } finally { setPending(false); }
  }
  return <form onSubmit={submit} noValidate className="space-y-5">
    <div><p className="cye-label text-accent-strong">Step 1 of 2 · Credentials</p><h1 className="mt-2 font-display text-4xl uppercase">Staff sign in</h1>
      <p className="mt-2 text-sm text-muted">After your password is checked we email a 6-digit code to your work address. No authenticator app is needed.</p></div>
    <Input label="Work email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
    <Input label="Password" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
    <p role="alert" className="min-h-5 text-sm text-danger">{error}</p>
    <Button type="submit" size="lg" loading={pending} className="w-full">Continue</Button>
    <p className="text-center text-sm"><Link href="/forgot-password" className="text-accent-strong underline-offset-4 hover:underline">Forgot password?</Link></p>
  </form>;
}
