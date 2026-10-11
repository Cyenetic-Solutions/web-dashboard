"use client";
import Link from 'next/link';
import { useState } from 'react';
import { Pill, SeverityBadge, severityBar } from '@/components/ui/Badge';
import DataList from '@/components/ui/DataList';
import { EmptyState } from '@/components/ui/States';
import Tabs from '@/components/ui/Tabs';
import { formatDate, label } from '@/components/format';
import { findingStatuses, severities, type Finding } from '@/services/ops.schema';
import { findingTone, retestTone } from './ops.data';

/** Findings as a dense table (cards on mobile) or a severity × status heatmap whose cells filter the table. */
export default function FindingsMatrix({ findings }: { findings: Finding[] }) {
  const [view, setView] = useState<'table' | 'matrix'>('table');
  const [cell, setCell] = useState<{ severity: Finding['severity']; status: Finding['status'] } | null>(null);
  const rows = cell ? findings.filter((f) => f.severity === cell.severity && f.status === cell.status) : findings;
  const max = Math.max(1, ...severities.flatMap((s) => findingStatuses.map((st) => findings.filter((f) => f.severity === s && f.status === st).length)));
  if (!findings.length) return <EmptyState title="No findings">Findings logged by auditors appear here with CVSS scores and retest state.</EmptyState>;
  return <div className="space-y-4">
    <div className="flex flex-wrap items-center justify-between gap-3"><div className="w-full sm:w-64"><Tabs label="Findings view" value={view} onChange={setView} tabs={[{ value: 'table', label: 'Table' }, { value: 'matrix', label: 'Severity matrix' }]} /></div>
      {cell && <button type="button" onClick={() => setCell(null)} className="min-h-11 font-mono text-xs text-accent-strong">Clear filter: {label(cell.severity)} × {label(cell.status)} ✕</button>}</div>
    {view === 'matrix' && <div className="overflow-x-auto border border-line"><table className="w-full min-w-[640px] border-collapse text-center text-xs" aria-label="Severity by status">
      <thead><tr><th scope="col" className="cye-label border-b border-line p-2 text-left text-muted">Severity</th>{findingStatuses.map((st) => <th key={st} scope="col" className="cye-label border-b border-line p-2 text-muted">{label(st)}</th>)}</tr></thead>
      <tbody>{severities.map((s) => <tr key={s}><th scope="row" className="border-b border-line p-2 text-left"><SeverityBadge value={s} /></th>{findingStatuses.map((st) => {
        const n = findings.filter((f) => f.severity === s && f.status === st).length;
        return <td key={st} className="border-b border-l border-line p-0"><button type="button" disabled={!n} onClick={() => { setCell({ severity: s, status: st }); setView('table'); }} aria-label={`${n} ${label(s)} ${label(st)}`}
          className="block h-11 w-full font-mono disabled:text-subtle" style={n ? { background: `color-mix(in srgb, var(--accent) ${Math.round((n / max) * 45) + 8}%, transparent)` } : undefined}>{n}</button></td>;
      })}</tr>)}</tbody></table></div>}
    {view === 'table' && <DataList label="Findings" rows={rows} rowKey={(f) => f.id} stripe={(f) => severityBar[f.severity]} columns={[
      { key: 'ref', header: 'Ref', mono: true, cell: (f) => <Link href={`/ops/findings/${f.id}`} className="text-accent-strong hover:underline">{f.engagementCode ? `${f.engagementCode} · ` : ''}{f.referenceCode}</Link> },
      { key: 'title', header: 'Title', primary: true, cell: (f) => <Link href={`/ops/findings/${f.id}`} className="font-medium hover:text-accent-strong">{f.title}</Link> },
      { key: 'sev', header: 'Severity', cell: (f) => <SeverityBadge value={f.severity} score={f.cvssScore} /> },
      { key: 'endpoint', header: 'Endpoint', mono: true, className: 'max-w-56 truncate', cell: (f) => f.affectedEndpoint.split('\n')[0] },
      { key: 'status', header: 'Status', cell: (f) => <Pill tone={findingTone[f.status]}>{label(f.status)}</Pill> },
      { key: 'verified', header: 'Verified', cell: (f) => (f.isVerified ? <span className="text-success">✓ Verified</span> : <span className="text-subtle">Unverified</span>) },
      { key: 'retest', header: 'Retest', cell: (f) => (f.retestStatus ? <Pill tone={retestTone[f.retestStatus]}>{label(f.retestStatus)}</Pill> : '—') },
      { key: 'updated', header: 'Updated', mono: true, hideOnMobile: true, cell: (f) => formatDate(f.updatedAt) },
    ]} />}
  </div>;
}
