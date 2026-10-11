"use client";
import { useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import PageHeader from '@/components/ui/PageHeader';
import Tabs from '@/components/ui/Tabs';
import { useAuth } from '@/providers/AuthProvider';
import { passwordRules } from '@/services/auth';
import { changePassword, updateProfile } from '@/services/governance';
import SessionsPanel from './SessionsPanel';

type Tab = 'profile' | 'security' | 'sessions';
/** Own profile, password, sign-in method and active sessions. */
export default function AccountFeature() {
  const [tab, setTab] = useState<Tab>('profile');
  return <>
    <PageHeader eyebrow="Account" title="Account & security" />
    <Tabs label="Account sections" value={tab} onChange={setTab} tabs={[{ value: 'profile', label: 'Profile' }, { value: 'security', label: 'Security' }, { value: 'sessions', label: 'Sessions' }]} />
    <div className="mt-6 max-w-2xl">{tab === 'profile' ? <Profile /> : tab === 'security' ? <Security /> : <SessionsPanel />}</div>
  </>;
}

function Profile() {
  const { session, call } = useAuth();
  const [name, setName] = useState(session?.name ?? '');
  const [message, setMessage] = useState('');
  async function submit(e: FormEvent) { e.preventDefault(); try { await call((t) => updateProfile(name.trim(), t)); setMessage('Profile saved'); } catch (err) { setMessage(err instanceof Error ? err.message : 'Save failed'); } }
  return <form onSubmit={submit} className="space-y-4 border border-line bg-surface p-5">
    <Input label="Full name" required value={name} onChange={(e) => setName(e.target.value)} />
    <Input label="Email" readOnly value={session?.email ?? ''} hint="Ask a Super Admin to change your sign-in email." />
    <Input label="Role" readOnly value={session?.role ?? ''} />
    <Button type="submit">Save profile</Button><p role="status" className="text-sm text-muted">{message}</p></form>;
}

function Security() {
  const { call, session } = useAuth();
  const [current, setCurrent] = useState(''); const [next, setNext] = useState('');
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  async function submit(e: FormEvent) {
    e.preventDefault();
    if (!passwordRules(next, session?.email).every((r) => r.ok)) { setMessage({ ok: false, text: 'The new password does not meet every requirement.' }); return; }
    try { await call((t) => changePassword(current, next, t)); setCurrent(''); setNext(''); setMessage({ ok: true, text: 'Password changed. Other sessions were signed out.' }); }
    catch (err) { setMessage({ ok: false, text: err instanceof Error ? err.message : 'Change failed' }); }
  }
  return <div className="space-y-4">
    <section className="border border-line bg-surface p-5"><h2 className="cye-label text-muted">Second factor</h2>
      <p className="mt-2 text-sm">Email one-time code <span className="ml-2 font-mono text-xs text-success">● Active</span></p>
      <p className="mt-1 text-xs text-muted">Every sign-in sends a 6-digit code to {session?.email ?? 'your work email'}. No authenticator app is used.</p>
      <Button type="button" variant="secondary" size="sm" disabled title="Coming soon" className="mt-4">Add security key (coming soon)</Button></section>
    <form onSubmit={submit} className="space-y-4 border border-line bg-surface p-5"><h2 className="cye-label text-muted">Change password</h2>
      <Input label="Current password" type="password" autoComplete="current-password" required value={current} onChange={(e) => setCurrent(e.target.value)} />
      <Input label="New password" type="password" autoComplete="new-password" required value={next} onChange={(e) => setNext(e.target.value)} hint="At least 12 characters with mixed case and a number or symbol." />
      <Button type="submit">Change password</Button>{message && <p role="status" className={`text-sm ${message.ok ? 'text-success' : 'text-danger'}`}>{message.text}</p>}</form>
  </div>;
}
