"use client";
import { useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import { Pill, type Tone } from '@/components/ui/Badge';
import DataList from '@/components/ui/DataList';
import Drawer from '@/components/ui/Drawer';
import { controlClass, Input } from '@/components/ui/Field';
import { TagInput } from '@/components/ui/Inputs';
import PageHeader from '@/components/ui/PageHeader';
import { Async, EmptyState } from '@/components/ui/States';
import Tabs from '@/components/ui/Tabs';
import { saveBlob } from '@/components/download';
import { formatDate, label } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { useResource } from '@/providers/useResource';
import { addSubscriber, listSubscribers, setSubscriberStatus, subscriberStatuses, type Subscriber } from '@/services/crm';
import { requestBlob } from '@/services/http';

const tones: Record<Subscriber['status'], Tone> = { PENDING: 'warning', CONFIRMED: 'success', UNSUBSCRIBED: 'subtle', BOUNCED: 'danger' };
type Filter = '' | Subscriber['status'];

/** Subscriber management only; campaign sending is not part of this build. */
export default function NewsletterFeature() {
  const { call, can } = useAuth();
  const [status, setStatus] = useState<Filter>('');
  const [q, setQ] = useState('');
  const [adding, setAdding] = useState(false);
  const state = useResource((t, s) => listSubscribers(t, s, { status, q }), `${status}|${q}`);
  async function unsubscribe(s: Subscriber) { const next = await call((t) => setSubscriberStatus(s.id, 'UNSUBSCRIBED', t)); state.setData((l) => l?.map((i) => (i.id === s.id ? next : i))); }
  return <>
    <PageHeader eyebrow="Growth & CRM" title="Newsletter" description="Double opt-in subscribers. Sending campaigns needs the mail worker and is not available yet."
      actions={<>{can('crm:export') && <Button variant="secondary" onClick={async () => saveBlob(await call((t) => requestBlob('/api/v1/admin/newsletter/export.csv', t)), 'subscribers.csv')}>Export CSV</Button>}
        {can('crm:write') && <Button onClick={() => setAdding(true)}>Add subscriber</Button>}</>} />
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end"><div className="min-w-0 flex-1"><Tabs label="Status" value={status} onChange={setStatus}
      tabs={[{ value: '', label: 'All' }, ...subscriberStatuses.map((s) => ({ value: s, label: label(s) }))]} /></div>
      <input type="search" aria-label="Search subscribers" placeholder="Search email or name" value={q} onChange={(e) => setQ(e.target.value)} className={`${controlClass} md:w-64`} /></div>
    <Async state={state} module="Newsletter subscribers">{(rows) => rows.length ? <DataList label="Subscribers" rows={rows} rowKey={(r) => r.id} columns={[
      { key: 'email', header: 'Email', primary: true, mono: true, cell: (r) => r.email }, { key: 'name', header: 'Name', cell: (r) => r.fullName ?? '—' },
      { key: 'status', header: 'Status', cell: (r) => <Pill tone={tones[r.status]}>{label(r.status)}</Pill> }, { key: 'source', header: 'Source', cell: (r) => r.source ?? '—' },
      { key: 'tags', header: 'Tags', cell: (r) => r.tags.join(', ') || '—' }, { key: 'since', header: 'Subscribed', mono: true, cell: (r) => formatDate(r.subscribedAt) },
      { key: 'act', header: 'Action', cell: (r) => can('crm:write') && r.status !== 'UNSUBSCRIBED' ? <button type="button" onClick={() => void unsubscribe(r)} className="min-h-9 text-xs text-danger">Unsubscribe</button> : '—' }]} />
      : <EmptyState title="No subscribers found">Sign-ups from the public site appear here after they confirm by email.</EmptyState>}</Async>
    <AddSubscriber open={adding} onClose={() => setAdding(false)} onAdded={(s) => { state.setData((l) => [s, ...(l ?? [])]); setAdding(false); }} />
  </>;
}

function AddSubscriber({ open, onClose, onAdded }: { open: boolean; onClose: () => void; onAdded: (s: Subscriber) => void }) {
  const { call } = useAuth();
  const [email, setEmail] = useState(''); const [fullName, setFullName] = useState(''); const [tags, setTags] = useState<string[]>([]);
  const [error, setError] = useState('');
  async function submit(e: FormEvent) { e.preventDefault(); setError(''); try { onAdded(await call((t) => addSubscriber({ email, fullName: fullName || undefined, tags }, t))); setEmail(''); setFullName(''); setTags([]); } catch (err) { setError(err instanceof Error ? err.message : 'Could not add'); } }
  return <Drawer open={open} onClose={onClose} title="Add subscriber"><form onSubmit={submit} className="space-y-4">
    <Input label="Email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
    <Input label="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} />
    <TagInput label="Tags" value={tags} onChange={setTags} />
    <p className="text-xs text-muted">Only add people who have given consent. Manual entries are saved as confirmed.</p>
    <p role="alert" className="text-sm text-danger">{error}</p><Button type="submit" className="w-full">Add subscriber</Button></form></Drawer>;
}
