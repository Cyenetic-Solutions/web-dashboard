"use client";
import { useState } from 'react';
import { controlClass } from '@/components/ui/Field';
import PageHeader from '@/components/ui/PageHeader';
import { Async } from '@/components/ui/States';
import { label } from '@/components/format';
import { useResource } from '@/providers/useResource';
import { listFindings } from '@/services/ops';
import { findingStatuses, severities } from '@/services/ops.schema';
import FindingsMatrix from './FindingsMatrix';

/** Global findings matrix across every engagement the caller may read. */
export default function FindingsFeature() {
  const [severity, setSeverity] = useState('');
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');
  const state = useResource((t, s) => listFindings(t, s, { severity, status, q }), `${severity}|${status}|${q}`);
  return <>
    <PageHeader eyebrow="War-Room" title="Findings" description="CVSS-scored findings across your engagements. Only verified findings go into reports." />
    <div className="mb-4 grid gap-3 sm:grid-cols-3">
      <select aria-label="Severity" value={severity} onChange={(e) => setSeverity(e.target.value)} className={controlClass}><option value="">All severities</option>{severities.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
      <select aria-label="Status" value={status} onChange={(e) => setStatus(e.target.value)} className={controlClass}><option value="">All statuses</option>{findingStatuses.map((s) => <option key={s} value={s}>{label(s)}</option>)}</select>
      <input type="search" aria-label="Search findings" placeholder="Search title or endpoint" value={q} onChange={(e) => setQ(e.target.value)} className={controlClass} />
    </div>
    <Async state={state} module="Findings">{(findings) => <FindingsMatrix findings={findings} />}</Async>
  </>;
}
