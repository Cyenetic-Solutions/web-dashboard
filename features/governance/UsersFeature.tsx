"use client";
import { useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import { Pill, type Tone } from '@/components/ui/Badge';
import DataList from '@/components/ui/DataList';
import Drawer from '@/components/ui/Drawer';
import { controlClass, Input, Select } from '@/components/ui/Field';
import PageHeader from '@/components/ui/PageHeader';
import { Async, EmptyState } from '@/components/ui/States';
import { formatDate, initials, label } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { useResource } from '@/providers/useResource';
import { staffRoles } from '@/services/api';
import { inviteUser, listUsers, type StaffUser } from '@/services/governance';
import PermissionMatrix from './PermissionMatrix';
import UserActions from './UserActions';

const statusTone: Record<StaffUser['status'], Tone> = { INVITED: 'warning', ACTIVE: 'success', SUSPENDED: 'danger' };
/** Staff users, invitations and role management (Super Admin only; enforced by the API). */
export default function UsersFeature() {
  const [q, setQ] = useState('');
  const [inviting, setInviting] = useState(false);
  const [selected, setSelected] = useState<StaffUser | null>(null);
  const state = useResource((t, s) => listUsers(t, s, { q }), q);
  const replace = (u: StaffUser) => { state.setData((l) => l?.map((i) => (i.id === u.id ? u : i))); setSelected(u); };
  return <>
    <PageHeader eyebrow="Governance" title="Users & roles" description="Every staff account signs in with a password plus a one-time code emailed to them." actions={<Button onClick={() => setInviting(true)}>Invite user</Button>} />
    <input type="search" aria-label="Search users" placeholder="Search name or email" value={q} onChange={(e) => setQ(e.target.value)} className={`${controlClass} mb-4 sm:w-72`} />
    <Async state={state} module="User management">{(rows) => rows.length ? <DataList label="Users" rows={rows} rowKey={(u) => u.id} onSelect={setSelected} columns={[
      { key: 'name', header: 'Name', primary: true, cell: (u) => <span className="flex items-center gap-2"><span aria-hidden="true" className="grid size-8 shrink-0 place-items-center bg-surface-3 font-mono text-[11px]">{initials(u.fullName)}</span>{u.fullName}</span> },
      { key: 'email', header: 'Email', mono: true, cell: (u) => u.email }, { key: 'role', header: 'Role', cell: (u) => <Pill tone="accent">{u.role}</Pill> },
      { key: 'status', header: 'Status', cell: (u) => <Pill tone={statusTone[u.status]}>{label(u.status)}</Pill> },
      { key: 'login', header: 'Last sign-in', mono: true, cell: (u) => formatDate(u.lastLoginAt, true) },
    ]} /> : <EmptyState title="No users found" />}</Async>
    <div className="mt-8"><PermissionMatrix /></div>
    <Invite open={inviting} onClose={() => setInviting(false)} onInvited={(u) => { state.setData((l) => [u, ...(l ?? [])]); setInviting(false); }} />
    <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.fullName ?? 'User'}>{selected && <UserActions user={selected} onChange={replace} />}</Drawer>
  </>;
}

function Invite({ open, onClose, onInvited }: { open: boolean; onClose: () => void; onInvited: (u: StaffUser) => void }) {
  const { call } = useAuth();
  const [form, setForm] = useState<{ email: string; fullName: string; role: StaffUser['role'] }>({ email: '', fullName: '', role: 'Content Editor' });
  const [error, setError] = useState('');
  async function submit(e: FormEvent) { e.preventDefault(); setError(''); try { onInvited(await call((t) => inviteUser(form, t))); setForm({ email: '', fullName: '', role: 'Content Editor' }); } catch (err) { setError(err instanceof Error ? err.message : 'Invite failed'); } }
  return <Drawer open={open} onClose={onClose} title="Invite user"><form onSubmit={submit} className="space-y-4">
    <Input label="Full name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
    <Input label="Work email" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
    <Select label="Role" value={form.role} onChange={(e) => setForm({ ...form, role: staffRoles.find((r) => r === e.target.value) ?? form.role })} options={staffRoles.map((r) => ({ value: r, label: r }))} />
    <p className="text-xs text-muted">The API emails an activation link valid for 48 hours. After setting a password they sign in with an emailed one-time code.</p>
    <p role="alert" className="text-sm text-danger">{error}</p><Button type="submit" className="w-full">Send invitation</Button></form></Drawer>;
}
