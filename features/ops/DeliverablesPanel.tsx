"use client";
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Pill } from '@/components/ui/Badge';
import Drawer from '@/components/ui/Drawer';
import { Input } from '@/components/ui/Field';
import { Async, EmptyState } from '@/components/ui/States';
import { formatDate, label } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { useResource } from '@/providers/useResource';
import { finalizeDeliverable, generateDeliverable, listDeliverables } from '@/services/ops';
import type { Engagement } from '@/services/ops.schema';
import IssueCertificate from './IssueCertificate';

type Kind = 'EXECUTIVE' | 'TECHNICAL' | 'RETEST';
/** Generated reports (watermarked PDF + SHA-256) and certificate issuance for completed engagements. */
export default function DeliverablesPanel({ engagement: e, verifiedCount }: { engagement: Engagement; verifiedCount: number }) {
  const { call, can } = useAuth();
  const state = useResource((t, s) => listDeliverables(e.id, t, s), e.id);
  const [kind, setKind] = useState<Kind | null>(null);
  const [watermark, setWatermark] = useState(`CONFIDENTIAL — ${e.clientOrganization} — ${new Date().toISOString().slice(0, 10)}`);
  const [error, setError] = useState('');
  async function generate() {
    if (!kind) return; setError('');
    try { const d = await call((t) => generateDeliverable(e.id, kind, watermark, t)); state.setData((l) => [d, ...(l ?? [])]); setKind(null); } catch (err) { setError(err instanceof Error ? err.message : 'Generation failed'); }
  }
  async function finalize(id: string) { await call((t) => finalizeDeliverable(e.id, id, t)); state.setData((l) => l?.map((d) => ({ ...d, isFinal: d.id === id }))); }
  return <div className="space-y-6">
    {can('deliverables:generate') && <div className="flex flex-wrap gap-2">{(['EXECUTIVE', 'TECHNICAL', 'RETEST'] as const).map((k) => <Button key={k} variant="secondary" onClick={() => setKind(k)}>Generate {label(k)} report</Button>)}</div>}
    <Async state={state} module="Deliverables">{(list) => list.length ? <ul className="space-y-2">{list.map((d) => <li key={d.id} className="flex flex-wrap items-center gap-3 border border-line bg-surface p-4 text-sm">
      <span className="font-medium">{label(d.kind)} v{d.version}</span><Pill tone={d.status === 'READY' ? 'success' : d.status === 'FAILED' ? 'danger' : 'warning'}>{label(d.status)}</Pill>
      {d.isFinal && <Pill tone="accent">Final</Pill>}<span className="text-muted">{d.findingCount} findings</span>
      {d.sha256 && <button type="button" onClick={() => void navigator.clipboard.writeText(d.sha256 ?? '')} title="Copy SHA-256" className="font-mono text-xs text-muted hover:text-ink">sha256 {d.sha256.slice(0, 12)}… ⧉</button>}
      <span className="ml-auto font-mono text-[11px] text-subtle">{d.generatedBy ?? 'System'} · {formatDate(d.createdAt, true)}</span>
      {d.status === 'READY' && !d.isFinal && can('deliverables:generate') && <Button size="sm" variant="ghost" onClick={() => void finalize(d.id)}>Mark as final</Button>}
      {d.errorMessage && <p className="w-full text-xs text-danger">{d.errorMessage}</p>}</li>)}</ul>
      : <EmptyState title="No reports generated">Generate an executive or technical report once findings are verified.</EmptyState>}</Async>
    {can('certificates:issue') && <IssueCertificate engagement={e} eligible={e.status === 'COMPLETED' && (state.data ?? []).some((d) => d.status === 'READY')} />}
    <Drawer open={!!kind} onClose={() => setKind(null)} title={`Generate ${kind ? label(kind) : ''} report`} footer={<><Button variant="ghost" onClick={() => setKind(null)}>Cancel</Button><Button onClick={generate} disabled={!verifiedCount}>Generate PDF</Button></>}>
      <div className="space-y-4"><p className="text-sm">This report will include <strong>{verifiedCount}</strong> verified finding{verifiedCount === 1 ? '' : 's'}. Unverified and draft findings are excluded.</p>
        <Input label="Watermark text" value={watermark} maxLength={200} onChange={(ev) => setWatermark(ev.target.value)} hint="Printed diagonally on every page." />
        {!verifiedCount && <p className="text-sm text-warning">Verify at least one finding first.</p>}{error && <p role="alert" className="text-sm text-danger">{error}</p>}</div>
    </Drawer>
  </div>;
}
