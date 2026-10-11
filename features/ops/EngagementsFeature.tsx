"use client";
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import { Pill, severityBar } from '@/components/ui/Badge';
import DataList from '@/components/ui/DataList';
import Drawer from '@/components/ui/Drawer';
import { controlClass, Input, Textarea } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Inputs';
import PageHeader from '@/components/ui/PageHeader';
import { Async, EmptyState } from '@/components/ui/States';
import { formatDate, label } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { useResource } from '@/providers/useResource';
import { createEngagement, listEngagements } from '@/services/ops';
import { engagementStatuses, severities, testingModes, type Engagement } from '@/services/ops.schema';
import { engagementTone, modeHint } from './ops.data';

/** Engagement tracker: code, client, type, mode, status, lead, progress and open-severity bar. */
export default function EngagementsFeature() {
  const { can } = useAuth();
  const [status, setStatus] = useState('');
  const [creating, setCreating] = useState(false);
  const state = useResource((t, s) => listEngagements(t, s, { status }), status);
  return <>
    <PageHeader eyebrow="War-Room" title="Engagements" description="Active testing projects. Security Auditors only see engagements they lead or are members of."
      actions={can('engagements:write') && <Button onClick={() => setCreating(true)}>New engagement</Button>} />
    <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={`${controlClass} mb-4 sm:w-56`}><option value="">All statuses</option>{engagementStatuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
    <Async state={state} module="Engagements">{(rows) => rows.length ? <DataList label="Engagements" rows={rows} rowKey={(r) => r.id} columns={[
      { key: 'code', header: 'Code', mono: true, cell: (r) => <Link href={`/ops/engagements/${r.id}`} className="text-accent-strong hover:underline">{r.code}</Link> },
      { key: 'name', header: 'Project', primary: true, cell: (r) => <Link href={`/ops/engagements/${r.id}`} className="font-medium hover:text-accent-strong">{r.projectName}<span className="block text-xs font-normal text-muted">{r.clientOrganization}</span></Link> },
      { key: 'type', header: 'Type', cell: (r) => <span className="text-xs">{label(r.auditType)} · {label(r.testingMode)}</span> },
      { key: 'status', header: 'Status', cell: (r) => <Pill tone={engagementTone[r.status]}>{label(r.status)}</Pill> },
      { key: 'lead', header: 'Lead', cell: (r) => r.leadAuditor?.fullName ?? '—' },
      { key: 'progress', header: 'Progress', cell: (r) => <span className="flex items-center gap-2"><span className="h-1.5 w-20 bg-surface-3"><span className="block h-full bg-accent" style={{ width: `${r.progressPercent}%` }} /></span><span className="font-mono text-xs">{r.progressPercent}%</span></span> },
      { key: 'open', header: 'Open findings', cell: (r) => <SeverityStack counts={r.openBySeverity ?? {}} /> },
      { key: 'dates', header: 'Dates', mono: true, cell: (r) => `${formatDate(r.startDate)} → ${formatDate(r.endDate)}` },
    ]} /> : <EmptyState title="No engagements">Create one here or convert a won inquiry from the pipeline.</EmptyState>}</Async>
    <NewEngagement open={creating} onClose={() => setCreating(false)} />
  </>;
}

function SeverityStack({ counts }: { counts: Partial<Record<(typeof severities)[number], number>> }) {
  const total = severities.reduce((s, k) => s + (counts[k] ?? 0), 0);
  if (!total) return <span className="text-xs text-subtle">None</span>;
  return <span className="flex h-2 w-28 overflow-hidden bg-surface-3" role="img" aria-label={severities.map((k) => `${counts[k] ?? 0} ${k.toLowerCase()}`).join(', ')}>
    {severities.map((k) => counts[k] ? <span key={k} className={severityBar[k]} style={{ width: `${((counts[k] ?? 0) / total) * 100}%` }} /> : null)}</span>;
}

function NewEngagement({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { call } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<{ projectName: string; clientOrganization: string; auditType: string; testingMode: Engagement['testingMode']; startDate: string; endDate: string; rulesOfEngagement: string }>(
    { projectName: '', clientOrganization: '', auditType: 'WEB_APP', testingMode: 'GREY_BOX', startDate: '', endDate: '', rulesOfEngagement: '' });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setPending(true); setError('');
    try { const created = await call((t) => createEngagement({ ...form, endDate: form.endDate || undefined }, t)); router.push(`/ops/engagements/${created.id}`); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not create engagement'); } finally { setPending(false); }
  }
  return <Drawer open={open} onClose={onClose} title="New engagement"><form onSubmit={submit} className="space-y-4">
    <Input label="Project name" required value={form.projectName} onChange={(e) => setForm({ ...form, projectName: e.target.value })} />
    <Input label="Client organization" required value={form.clientOrganization} onChange={(e) => setForm({ ...form, clientOrganization: e.target.value })} />
    <Input label="Audit type" required className="font-mono" value={form.auditType} onChange={(e) => setForm({ ...form, auditType: e.target.value.toUpperCase().replace(/\s+/g, '_') })} hint="e.g. WEB_APP, API, CLOUD, ACTIVE_DIRECTORY" />
    <Segmented label="Testing mode" value={form.testingMode} onChange={(testingMode) => setForm({ ...form, testingMode })} options={testingModes.map((m) => ({ value: m, label: label(m), hint: modeHint[m] }))} />
    <div className="grid gap-4 sm:grid-cols-2"><Input label="Start date" type="date" required value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
      <Input label="End date" type="date" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} /></div>
    <Textarea label="Rules of engagement" rows={4} value={form.rulesOfEngagement} onChange={(e) => setForm({ ...form, rulesOfEngagement: e.target.value })} />
    <p role="alert" className="text-sm text-danger">{error}</p><Button type="submit" loading={pending} className="w-full">Create engagement</Button></form></Drawer>;
}
