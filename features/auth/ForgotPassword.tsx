"use client";
import Link from 'next/link';
import { useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import { emailSchema, forgotPassword } from '@/services/auth';

/** Requests a reset email; the response never reveals whether the account exists. */
export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'pending' | 'sent'>('idle');
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setError('');
    const parsed = emailSchema.safeParse(email);
    if (!parsed.success) { setError(parsed.error.issues[0]?.message ?? 'Enter a valid email'); return; }
    setState('pending');
    try { await forgotPassword(parsed.data); setState('sent'); } catch (err) { setError(err instanceof Error ? err.message : 'Request failed'); setState('idle'); }
  }
  if (state === 'sent') return <div className="space-y-4"><p className="cye-label text-success">Request received</p><h1 className="font-display text-4xl uppercase">Check your email</h1>
    <p className="text-sm text-muted">If <span className="font-mono text-ink">{email}</span> belongs to a staff account, a reset link is on its way. The link expires soon and can be used once.</p>
    <Link href="/login" className="inline-block min-h-11 py-3 text-sm text-accent-strong">← Back to sign in</Link></div>;
  return <form onSubmit={submit} noValidate className="space-y-5"><p className="cye-label text-accent-strong">Account recovery</p><h1 className="font-display text-4xl uppercase">Reset password</h1>
    <p className="text-sm text-muted">Enter your work email and we&apos;ll send a reset link.</p>
    <Input label="Work email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} error={error || undefined} />
    <Button type="submit" size="lg" loading={state === 'pending'} className="w-full">Send reset link</Button>
    <Link href="/login" className="block min-h-11 py-3 text-center text-sm text-muted hover:text-ink">← Back to sign in</Link></form>;
}
