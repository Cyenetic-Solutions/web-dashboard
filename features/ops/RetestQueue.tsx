"use client";
import Link from 'next/link';
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Pill, SeverityBadge } from '@/components/ui/Badge';
import Drawer from '@/components/ui/Drawer';
import { Select, Textarea } from '@/components/ui/Field';
import { Async, EmptyState } from '@/components/ui/States';
import { formatDate, label } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { useResource } from '@/providers/useResource';
import { listRetests, updateRetest } from '@/services/ops';
import { retestStatuses, type Retest } from '@/services/ops.schema';
import { retestTone } from './ops.data';

const lanes = retestStatuses.filter((s) => s !== 'CANCELLED');
/** Retest queue grouped by status; Passed/Failed require a result note and drive the finding lifecycle server-side. */
export default function RetestQueue({ engagementId }: { engagementId?: string }) {
  const { call, can } = useAuth();
  const state = useResource((t, s) => listRetests(t, s, { engagementId }), engagementId ?? 'all');
  const [editing, setEditing] = useState<Retest | null>(null);
  const [status, setStatus] = useState<Retest['status']>('REQUESTED');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const needsNote = status === 'PASSED' || status === 'FAILED';
  async function save() {
    if (!editing) return; setError('');
    try { const saved = await call((t) => updateRetest(editing.id, { status, resultNote: note.trim() || undefined }, t)); state.setData((l) => l?.map((r) => (r.id === saved.id ? saved : r))); setEditing(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Update failed'); }
  }
  return <Async state={state} module="Retests">{(tickets) => tickets.length ? <>
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">{lanes.map((lane) => <section key={lane} aria-label={label(lane)} className="border border-line bg-surface">
      <h2 className="cye-label flex justify-between border-b border-line px-3 py-2.5">{label(lane)}<span className="text-subtle">{tickets.filter((t) => t.status === lane).length}</span></h2>
      <ul className="space-y-2 p-2">{tickets.filter((t) => t.status === lane).map((t) => <li key={t.id} className="border border-line bg-surface-2 p-3 text-sm">
        <p className="flex items-center justify-between gap-2 font-mono text-[11px]"><Link href={`/ops/findings/${t.findingId}`} className="text-accent-strong">{t.engagementCode} · {t.findingRef}</Link><SeverityBadge value={t.severity} /></p>
        <p className="mt-1 font-medium">{t.findingTitle}</p>
        <p className="mt-2 font-mono text-[11px] text-subtle">{t.assignedTo?.fullName ?? 'Unassigned'} · {formatDate(t.scheduledFor)}</p>
        {can('retests:resolve') && <button type="button" onClick={() => { setEditing(t); setStatus(t.status); setNote(t.resultNote ?? ''); }} className="mt-2 min-h-9 font-mono text-xs uppercase text-accent-strong">Update →</button>}
      </li>)}</ul></section>)}</div>
    <Drawer open={!!editing} onClose={() => setEditing(null)} title={editing ? `Retest ${editing.findingRef}` : 'Retest'} footer={<><Button variant="ghost" onClick={() => setEditing(null)}>Cancel</Button><Button disabled={needsNote && !note.trim()} onClick={save}>Save</Button></>}>
      {editing && <div className="space-y-4"><p className="text-sm">{editing.findingTitle}</p><Pill tone={retestTone[editing.status]}>{label(editing.status)}</Pill>
        {editing.requestedNote && <p className="border-l-2 border-line-strong pl-3 text-sm text-muted">{editing.requestedNote}</p>}
        <Select label="New status" value={status} onChange={(e) => setStatus(retestStatuses.find((s) => s === e.target.value) ?? status)} options={retestStatuses.map((s) => ({ value: s, label: label(s) }))}
          hint="Passed marks the finding fixed & verified. Failed reopens it." />
        <Textarea label="Result note" required={needsNote} rows={4} value={note} onChange={(e) => setNote(e.target.value)} />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}</div>}
    </Drawer>
  </> : <EmptyState title="No retests">Retest requests from findings land here.</EmptyState>}</Async>;
}
