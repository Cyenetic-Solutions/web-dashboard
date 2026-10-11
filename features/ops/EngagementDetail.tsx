"use client";
import { useState } from 'react';
import { LinkButton } from '@/components/ui/Button';
import { Pill } from '@/components/ui/Badge';
import { Select } from '@/components/ui/Field';
import PageHeader from '@/components/ui/PageHeader';
import { Async } from '@/components/ui/States';
import Tabs from '@/components/ui/Tabs';
import { label } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { useResource } from '@/providers/useResource';
import { getEngagement, listFindings, setEngagementStatus } from '@/services/ops';
import { engagementStatuses } from '@/services/ops.schema';
import DeliverablesPanel from './DeliverablesPanel';
import EngagementOverview from './EngagementOverview';
import FindingsMatrix from './FindingsMatrix';
import RetestQueue from './RetestQueue';

type Tab = 'overview' | 'findings' | 'retests' | 'deliverables';
/** Engagement header with status control and Overview · Findings · Retests · Deliverables tabs. */
export default function EngagementDetail({ id }: { id: string }) {
  const { call, can } = useAuth();
  const state = useResource((t, s) => getEngagement(id, t, s), id);
  const findings = useResource((t, s) => listFindings(t, s, { engagementId: id }), `f-${id}`);
  const [tab, setTab] = useState<Tab>('overview');
  const [error, setError] = useState('');
  return <Async state={state} module="Engagements" rows={6}>{(e) => <>
    <PageHeader eyebrow={`War-Room / ${e.code}`} title={e.projectName} description={<>{e.clientOrganization} · {label(e.auditType)} · {label(e.testingMode)} · Lead {e.leadAuditor?.fullName ?? 'unassigned'}</>}
      actions={<>{can('findings:write') && <LinkButton href={`/ops/engagements/${e.id}/findings/new`}>New finding</LinkButton>}</>} />
    <div className="mb-6 flex flex-wrap items-end gap-4">
      {can('engagements:write') ? <Select label="Engagement status" value={e.status} wrapperClass="w-full sm:w-56" options={engagementStatuses.map((s) => ({ value: s, label: label(s) }))}
        onChange={async (ev) => { const next = engagementStatuses.find((s) => s === ev.target.value); if (!next) return; setError(''); try { const saved = await call((t) => setEngagementStatus(e.id, next, t)); state.setData(() => saved); } catch (err) { setError(err instanceof Error ? err.message : 'Status change failed'); } }} />
        : <Pill>{label(e.status)}</Pill>}
      <div className="min-w-48 flex-1"><p className="cye-label text-muted">Progress {e.progressPercent}%</p><div className="mt-2 h-2 bg-surface-3"><div className="h-full bg-accent" style={{ width: `${e.progressPercent}%` }} /></div></div>
      {error && <p role="alert" className="w-full text-sm text-danger">{error}</p>}
    </div>
    <Tabs label="Engagement sections" value={tab} onChange={setTab} tabs={[{ value: 'overview', label: 'Overview' }, { value: 'findings', label: 'Findings' }, { value: 'retests', label: 'Retests' }, { value: 'deliverables', label: 'Deliverables & certificate' }]} />
    <div className="mt-6">
      {tab === 'overview' && <EngagementOverview engagement={e} onChange={(next) => state.setData(() => next)} />}
      {tab === 'findings' && <Async state={findings} module="Findings">{(list) => <FindingsMatrix findings={list} />}</Async>}
      {tab === 'retests' && <RetestQueue engagementId={e.id} />}
      {tab === 'deliverables' && <DeliverablesPanel engagement={e} verifiedCount={(findings.data ?? []).filter((f) => f.isVerified).length} />}
    </div>
  </>}</Async>;
}
