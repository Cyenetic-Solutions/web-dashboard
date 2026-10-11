"use client";
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Pill } from '@/components/ui/Badge';
import { Textarea } from '@/components/ui/Field';
import { Async } from '@/components/ui/States';
import { formatDate, label } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { useResource } from '@/providers/useResource';
import { listRetests, requestRetest } from '@/services/ops';
import { retestTone } from './ops.data';

/** Retest tickets for one finding with a request form. */
export default function RetestPanel({ findingId }: { findingId: string }) {
  const { call, can } = useAuth();
  const state = useResource((t, s) => listRetests(t, s, { findingId }), findingId);
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  async function submit() {
    setError('');
    try { const ticket = await call((t) => requestRetest(findingId, note.trim(), t)); state.setData((l) => [ticket, ...(l ?? [])]); setNote(''); }
    catch (e) { setError(e instanceof Error ? e.message : 'Could not request a retest'); }
  }
  return <section className="space-y-3 border border-line bg-surface p-4 sm:p-5"><h2 className="cye-label text-muted">Retest tickets</h2>
    <Async state={state} rows={2} module="Retests">{(tickets) => tickets.length ? <ul className="space-y-2">{tickets.map((t) => <li key={t.id} className="border border-line p-3 text-sm">
      <div className="flex items-center justify-between gap-2"><Pill tone={retestTone[t.status]}>{label(t.status)}</Pill><span className="font-mono text-[11px] text-subtle">{formatDate(t.updatedAt)}</span></div>
      {t.requestedNote && <p className="mt-2 text-xs text-muted">{t.requestedNote}</p>}{t.resultNote && <p className="mt-1 text-xs">Result: {t.resultNote}</p>}</li>)}</ul>
      : <p className="text-sm text-muted">No retests yet.</p>}</Async>
    {can('retests:request') && <div className="space-y-2 border-t border-line pt-3"><Textarea label="What was fixed?" rows={3} value={note} onChange={(e) => setNote(e.target.value)} />
      <Button type="button" size="sm" variant="secondary" disabled={!note.trim()} onClick={submit}>Request retest</Button>{error && <p role="alert" className="text-xs text-danger">{error}</p>}</div>}
  </section>;
}
