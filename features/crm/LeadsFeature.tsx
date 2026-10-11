"use client";
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Pill } from '@/components/ui/Badge';
import { AreaChart, ChartCard } from '@/components/ui/Charts';
import DataList from '@/components/ui/DataList';
import KpiCard from '@/components/ui/KpiCard';
import PageHeader from '@/components/ui/PageHeader';
import { Async, EmptyState } from '@/components/ui/States';
import Tabs from '@/components/ui/Tabs';
import { saveBlob } from '@/components/download';
import { formatDate, initials } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { useResource } from '@/providers/useResource';
import { loadLeads } from '@/services/crm';
import { query, requestBlob } from '@/services/http';

const ranges = [{ value: '7', label: '7 d' }, { value: '30', label: '30 d' }, { value: '90', label: '90 d' }] as const;
type Range = (typeof ranges)[number]['value'];

/** Report download (lead magnet) analytics: KPIs, daily trend, leads table and company aggregation, with audited CSV export. */
export default function LeadsFeature() {
  const { call, can } = useAuth();
  const [range, setRange] = useState<Range>('30');
  const [now] = useState(() => Date.now());
  const [tab, setTab] = useState<'leads' | 'companies'>('leads');
  const from = new Date(now - Number(range) * 86400000).toISOString().slice(0, 10);
  const state = useResource((t, s) => loadLeads(t, s, from), from);
  const [exportError, setExportError] = useState('');
  async function exportCsv() {
    setExportError('');
    try { saveBlob(await call((t) => requestBlob(`/api/v1/admin/report-leads/export.csv${query({ from })}`, t)), `report-leads-${from}.csv`); }
    catch (e) { setExportError(e instanceof Error ? e.message : 'Export failed'); }
  }
  return <>
    <PageHeader eyebrow="Growth & CRM" title="Report downloads" description="Who downloaded gated reports, enriched by email domain. Exports are recorded in the audit log."
      actions={can('crm:export') && <Button variant="secondary" onClick={exportCsv}>Export CSV</Button>} />
    {exportError && <p role="alert" className="mb-3 text-sm text-danger">{exportError}</p>}
    <div className="mb-4 w-full sm:w-72"><Tabs label="Date range" value={range} onChange={setRange} tabs={ranges} /></div>
    <Async state={state} module="Report lead analytics">{({ leads, domains }) => {
      const corporate = leads.filter((l) => l.isCorporate).length;
      const byReport = leads.reduce<Record<string, number>>((acc, l) => ({ ...acc, [l.reportTitle]: (acc[l.reportTitle] ?? 0) + 1 }), {});
      const top = Object.entries(byReport).sort((a, b) => b[1] - a[1])[0];
      const days = Array.from({ length: Number(range) }, (_, i) => new Date(now - (Number(range) - 1 - i) * 86400000).toISOString().slice(0, 10));
      return <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3 xl:grid-cols-4">
          <KpiCard label="Leads" value={leads.length} /><KpiCard label="Companies" value={domains.length} />
          <KpiCard label="Corporate" value={leads.length ? Math.round((corporate / leads.length) * 100) : 0} suffix="%" />
          <div className="border border-line bg-surface p-4 sm:p-5"><p className="cye-label text-muted">Top report</p><p className="mt-3 line-clamp-2 font-semibold">{top?.[0] ?? '—'}</p><p className="mt-1 font-mono text-xs text-muted">{top?.[1] ?? 0} downloads</p></div>
        </div>
        <ChartCard title="Downloads per day"><AreaChart label="Downloads per day" data={days.map((d) => ({ label: d.slice(5), value: leads.filter((l) => l.downloadedAt.startsWith(d)).length }))} /></ChartCard>
        <Tabs label="View" value={tab} onChange={setTab} tabs={[{ value: 'leads', label: `Leads ${leads.length}` }, { value: 'companies', label: `Companies ${domains.length}` }]} />
        {tab === 'leads' ? (leads.length ? <DataList label="Leads" rows={leads} rowKey={(l) => l.id} columns={[
          { key: 'name', header: 'Name', primary: true, cell: (l) => l.fullName }, { key: 'email', header: 'Work email', mono: true, cell: (l) => l.email },
          { key: 'company', header: 'Company', cell: (l) => l.companyName ?? '—' }, { key: 'corp', header: 'Type', cell: (l) => <Pill tone={l.isCorporate ? 'success' : 'subtle'}>{l.isCorporate ? 'Corporate' : 'Free mail'}</Pill> },
          { key: 'report', header: 'Report', cell: (l) => l.reportTitle }, { key: 'at', header: 'Downloaded', mono: true, cell: (l) => formatDate(l.downloadedAt, true) }]} />
          : <EmptyState title="No downloads in this range" />)
          : (domains.length ? <DataList label="Companies" rows={domains} rowKey={(d) => d.domain} columns={[
            { key: 'domain', header: 'Domain', primary: true, cell: (d) => <span className="flex items-center gap-2"><span aria-hidden="true" className="grid size-7 place-items-center bg-surface-3 font-mono text-[10px]">{initials(d.domain.replace(/\./g, ' '))}</span><span className="font-mono text-xs">{d.domain}</span></span> },
            { key: 'leads', header: 'Leads', mono: true, cell: (d) => d.leads }, { key: 'reports', header: 'Reports', cell: (d) => d.reports.join(', ') },
            { key: 'last', header: 'Last activity', mono: true, cell: (d) => formatDate(d.lastDownload, true) }]} />
            : <EmptyState title="No companies in this range" />)}
      </div>;
    }}</Async>
  </>;
}
