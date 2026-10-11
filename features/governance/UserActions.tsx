"use client";
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Select } from '@/components/ui/Field';
import { formatDate, label } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { staffRoles } from '@/services/api';
import { resendInvite, setUserRole, setUserStatus, type StaffUser } from '@/services/governance';

/** Role change, suspend/reactivate and invite resend. The API blocks self-demotion and removing the last Super Admin. */
export default function UserActions({ user, onChange }: { user: StaffUser; onChange: (u: StaffUser) => void }) {
  const { call, session } = useAuth();
  const [role, setRole] = useState(user.role);
  const [message, setMessage] = useState('');
  const self = session?.sub === user.id;
  async function run(action: () => Promise<StaffUser | void>, done: string) {
    setMessage('');
    try { const result = await action(); if (result) onChange(result); setMessage(done); } catch (e) { setMessage(e instanceof Error ? e.message : 'Action failed'); }
  }
  return <div className="space-y-6">
    <dl className="grid grid-cols-2 gap-3 text-sm"><div><dt className="cye-label text-subtle">Email</dt><dd className="mt-1 break-all font-mono text-xs">{user.email}</dd></div>
      <div><dt className="cye-label text-subtle">Status</dt><dd className="mt-1">{label(user.status)}</dd></div>
      <div><dt className="cye-label text-subtle">Last sign-in</dt><dd className="mt-1 font-mono text-xs">{formatDate(user.lastLoginAt, true)}</dd></div>
      <div><dt className="cye-label text-subtle">Created</dt><dd className="mt-1 font-mono text-xs">{formatDate(user.createdAt)}</dd></div></dl>
    <div className="space-y-2"><Select label="Role" disabled={self} value={role} onChange={(e) => setRole(staffRoles.find((r) => r === e.target.value) ?? role)} options={staffRoles.map((r) => ({ value: r, label: r }))}
      hint={self ? 'You cannot change your own role.' : undefined} />
      <Button size="sm" variant="secondary" disabled={self || role === user.role} onClick={() => { if (window.confirm(`Change ${user.fullName} to ${role}?`)) void run(() => call((t) => setUserRole(user.id, role, t)), 'Role updated'); }}>Save role</Button></div>
    <div className="flex flex-wrap gap-2 border-t border-line pt-4">
      {user.status === 'ACTIVE' && <Button variant="danger" size="sm" disabled={self} onClick={() => { if (window.confirm('Suspend this user and revoke all sessions?')) void run(() => call((t) => setUserStatus(user.id, 'SUSPENDED', t)), 'User suspended'); }}>Suspend</Button>}
      {user.status === 'SUSPENDED' && <Button size="sm" onClick={() => void run(() => call((t) => setUserStatus(user.id, 'ACTIVE', t)), 'User reactivated')}>Reactivate</Button>}
      {user.status === 'INVITED' && <Button size="sm" variant="secondary" onClick={() => void run(() => call((t) => resendInvite(user.id, t)), 'Invitation email re-sent')}>Resend invite</Button>}
    </div>
    <p role="status" className="text-sm text-muted">{message}</p>
  </div>;
}
