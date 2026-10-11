"use client";
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Pill } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Field';
import { Async } from '@/components/ui/States';
import { age, formatDate, label, money } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { useResource } from '@/providers/useResource';
import { addNote, listNotes, type Inquiry } from '@/services/crm';
import { stageMeta } from './crm.data';

/** Inquiry drawer: contact, requested scope, estimator payload, commercials and the notes timeline. */
export default function InquiryDetail({ item, onConvert }: { item: Inquiry; onConvert?: () => void }) {
  const { call, can } = useAuth();
  const notes = useResource((t, s) => listNotes(item.id, t, s), item.id);
  const [draft, setDraft] = useState('');
  const [pending, setPending] = useState(false);
  async function post() {
    if (!draft.trim()) return; setPending(true);
    try { const note = await call((t) => addNote(item.id, draft.trim(), t)); notes.setData((n) => [note, ...(n ?? [])]); setDraft(''); } finally { setPending(false); }
  }
  const facts: [string, string][] = [['Email', item.workEmail], ['Phone', item.phone ?? '—'], ['Preferred channel', item.preferredContact ?? '—'], ['Company', item.company ?? '—'],
    ['Sector', item.sector ? label(item.sector) : '—'], ['Service', item.serviceType ? label(item.serviceType) : '—'], ['Budget', item.budgetRange ?? '—'],
    ['Desired start', formatDate(item.desiredStartDate)], ['Deal value', money(item.dealValue, item.currency ?? 'USD')], ['Received', `${formatDate(item.createdAt, true)} (${age(item.createdAt)} ago)`]];
  return <div className="space-y-6">
    <div className="flex flex-wrap items-center gap-2"><Pill tone={stageMeta[item.status].tone}>{stageMeta[item.status].label}</Pill><Pill tone="subtle">{label(item.source)}</Pill>
      {item.assignedTo && <span className="text-xs text-muted">Owner: {item.assignedTo.fullName}</span>}</div>
    <dl className="grid grid-cols-2 gap-3 text-sm">{facts.map(([k, v]) => <div key={k} className="min-w-0"><dt className="cye-label text-subtle">{k}</dt><dd className="mt-0.5 break-words">{v}</dd></div>)}</dl>
    {item.lostReason && <p className="border-l-2 border-danger pl-3 text-sm"><span className="cye-label text-danger">Lost reason</span><br />{item.lostReason}</p>}
    {item.targetEnvironment && <section><h3 className="cye-label text-subtle">Target environment</h3><p className="mt-1 text-sm">{item.targetEnvironment}</p></section>}
    {item.scopeDetails && <section><h3 className="cye-label text-subtle">Scope details</h3><pre className="mt-1 whitespace-pre-wrap border border-line bg-surface-2 p-3 font-mono text-xs">{item.scopeDetails}</pre></section>}
    {item.estimatorPayload && <section><h3 className="cye-label text-subtle">Estimator configuration</h3>
      <table className="mt-1 w-full text-sm"><tbody>{Object.entries(item.estimatorPayload).map(([k, v]) => <tr key={k} className="border-b border-line"><th scope="row" className="py-1.5 pr-3 text-left font-normal text-muted">{k}</th><td className="py-1.5 font-mono text-xs">{typeof v === 'object' ? JSON.stringify(v) : String(v)}</td></tr>)}</tbody></table>
      <details className="mt-2"><summary className="cursor-pointer text-xs text-muted">Raw JSON</summary><pre className="mt-1 overflow-x-auto bg-surface-2 p-3 font-mono text-[11px]">{JSON.stringify(item.estimatorPayload, null, 2)}</pre></details></section>}
    {onConvert && can('engagements:write') && !item.convertedEngagementId && item.status === 'RETAINER_WON' && <Button onClick={onConvert} className="w-full">Convert to engagement</Button>}
    <section><h3 className="cye-label text-subtle">Notes</h3>
      {can('crm:write') && <div className="mt-2 space-y-2"><Textarea label="Add a note" rows={3} value={draft} onChange={(e) => setDraft(e.target.value)} /><Button size="sm" variant="secondary" loading={pending} onClick={post} disabled={!draft.trim()}>Post note</Button></div>}
      <div className="mt-3"><Async state={notes} rows={2}>{(list) => list.length ? <ol className="space-y-3">{list.map((n) => <li key={n.id} className="border-l-2 border-line-strong pl-3">
        <p className="whitespace-pre-wrap text-sm">{n.body}</p><p className="mt-0.5 font-mono text-[11px] text-subtle">{n.authorName ?? 'System'} · {formatDate(n.createdAt, true)}</p></li>)}</ol>
        : <p className="text-sm text-muted">No notes yet.</p>}</Async></div></section>
  </div>;
}
