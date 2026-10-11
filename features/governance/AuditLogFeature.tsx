"use client";
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Pill } from '@/components/ui/Badge';
import DataList from '@/components/ui/DataList';
import Drawer from '@/components/ui/Drawer';
import { controlClass } from '@/components/ui/Field';
import PageHeader from '@/components/ui/PageHeader';
import { Async, EmptyState } from '@/components/ui/States';
import { formatDate, label } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { useResource } from '@/providers/useResource';
import { loadAuditLog, verifyChain, type AuditEntry } from '@/services/governance';

/** Append-only audit trail: dense mono table, detail drawer with the recorded diff and a hash-chain integrity check. No edit or delete controls exist. */
export default function AuditLogFeature() {
  const { call } = useAuth();
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<AuditEntry | null>(null);
  const [chain, setChain] = useState<{ ok: boolean; text: string } | null>(null);
  const state = useResource((t, s) => loadAuditLog(t, s, { q }), q);
  async function check() {
    setChain(null);
    try { const r = await call(verifyChain); setChain(r.valid ? { ok: true, text: `Chain intact — ${r.checked.toLocaleString()} entries verified` } : { ok: false, text: `Chain broken at entry ${r.firstBrokenId ?? 'unknown'}` }); }
    catch (e) { setChain({ ok: false, text: e instanceof Error ? e.message : 'Integrity check failed' }); }
  }
  return <>
    <PageHeader eyebrow="Governance" title="Audit log" description="Every change, sign-in, export and file access. Entries are append-only at the database level."
      actions={!state.data?.legacy && <Button variant="secondary" onClick={check}>Verify integrity</Button>} />
    {chain && <p role="status" className={`mb-4 border p-3 font-mono text-xs ${chain.ok ? 'border-success text-success' : 'border-danger text-danger'}`}>{chain.text}</p>}
    <input type="search" aria-label="Search audit log" placeholder="Search actor, action or resource" value={q} onChange={(e) => setQ(e.target.value)} className={`${controlClass} mb-4 sm:w-80`} />
    <Async state={state} module="Audit log">{({ entries, legacy }) => <>
      {legacy && <p className="mb-4 border-l-2 border-warning pl-3 text-xs text-muted">The connected API exposes the CMS audit trail only. Sign-ins, exports and integrity verification appear once the full audit module is deployed.</p>}
      {entries.length ? <DataList label="Audit entries" rows={entries} rowKey={(e) => e.id} onSelect={setSelected} columns={[
        { key: 'at', header: 'Timestamp', mono: true, cell: (e) => formatDate(e.createdAt, true) },
        { key: 'actor', header: 'Actor', primary: true, mono: true, cell: (e) => e.actorEmail ?? 'system' },
        { key: 'action', header: 'Action', cell: (e) => <Pill tone={/DELETE|FAILURE|REVOK/.test(e.action) ? 'danger' : /LOGIN|LOGOUT/.test(e.action) ? 'info' : 'neutral'}>{label(e.action)}</Pill> },
        { key: 'resource', header: 'Resource', mono: true, cell: (e) => `${e.resourceType}${e.resourceId ? ` / ${e.resourceId}` : ''}` },
        { key: 'summary', header: 'Summary', cell: (e) => e.summary ?? '—' }, { key: 'ip', header: 'IP', mono: true, hideOnMobile: true, cell: (e) => e.ipAddress ?? '—' },
      ]} /> : <EmptyState title="No audit entries match" />}</>}</Async>
    <Drawer open={!!selected} onClose={() => setSelected(null)} title="Audit entry">{selected && <div className="space-y-4">
      <dl className="grid grid-cols-2 gap-3 text-sm">{([['Action', label(selected.action)], ['Actor', selected.actorEmail ?? 'system'], ['Resource', selected.resourceType], ['Resource ID', selected.resourceId ?? '—'], ['IP', selected.ipAddress ?? '—'], ['At', formatDate(selected.createdAt, true)]] as const).map(([k, v]) =>
        <div key={k}><dt className="cye-label text-subtle">{k}</dt><dd className="mt-1 break-all font-mono text-xs">{v}</dd></div>)}</dl>
      {selected.summary && <p className="text-sm">{selected.summary}</p>}
      {selected.diff !== undefined && <div><h3 className="cye-label text-subtle">Recorded data</h3><pre className="mt-2 max-h-96 overflow-auto border border-line bg-surface-2 p-3 font-mono text-[11px]">{JSON.stringify(selected.diff, null, 2)}</pre></div>}
    </div>}</Drawer>
  </>;
}
