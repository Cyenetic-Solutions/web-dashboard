"use client";
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { ApiError } from '@/services/http';
import { acceptInvite, passwordRules, resetPassword } from '@/services/auth';
import PasswordRules from './PasswordRules';

/** Shared form for accepting an invite or completing a reset with an emailed single-use token. */
export default function SetPassword({ token, mode }: { token: string; mode: 'invite' | 'reset' }) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [state, setState] = useState<'idle' | 'pending' | 'done'>('idle');
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    if (!passwordRules(password).every((r) => r.ok)) { setError('The password does not meet every requirement.'); return; }
    if (password !== confirm) { setError('The passwords do not match.'); return; }
    setState('pending');
    try { await (mode === 'invite' ? acceptInvite : resetPassword)(token, password); setState('done'); }
    catch (err) { setState('idle'); setError(err instanceof ApiError && (err.status === 404 || err.status === 410) ? 'This link is invalid or has expired. Request a new one.' : err instanceof Error ? err.message : 'Request failed'); }
  }
  if (state === 'done') return <div className="space-y-4"><p className="cye-label text-success">{mode === 'invite' ? 'Account activated' : 'Password updated'}</p>
    <h1 className="font-display text-4xl uppercase">You&apos;re set</h1><p className="text-sm text-muted">Sign in with your email and new password. We&apos;ll email you a one-time code to finish.</p>
    <Link href="/login" className="inline-block min-h-11 py-3 text-sm text-accent-strong">Go to sign in →</Link></div>;
  return <form onSubmit={submit} className="space-y-5"><p className="cye-label text-accent-strong">{mode === 'invite' ? 'Staff invitation' : 'Account recovery'}</p>
    <h1 className="font-display text-4xl uppercase">{mode === 'invite' ? 'Set your password' : 'Choose a new password'}</h1>
    <div><Input label="New password" type="password" autoComplete="new-password" required value={password} onChange={(e) => setPassword(e.target.value)} /><PasswordRules password={password} /></div>
    <Input label="Confirm password" type="password" autoComplete="new-password" required value={confirm} onChange={(e) => setConfirm(e.target.value)} />
    <p role="alert" className="min-h-5 text-sm text-danger">{error}</p>
    <Button type="submit" size="lg" loading={state === 'pending'} className="w-full">{mode === 'invite' ? 'Activate account' : 'Update password'}</Button></form>;
}
