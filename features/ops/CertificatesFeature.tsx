"use client";
import { useState } from 'react';
import Button from '@/components/ui/Button';
import { Pill } from '@/components/ui/Badge';
import DataList from '@/components/ui/DataList';
import Drawer from '@/components/ui/Drawer';
import { Input, Textarea } from '@/components/ui/Field';
import PageHeader from '@/components/ui/PageHeader';
import { Async, EmptyState } from '@/components/ui/States';
import { formatDate } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { useResource } from '@/providers/useResource';
import { listCertificates, revokeCertificate, verifyUrl } from '@/services/ops';
import type { Certificate } from '@/services/ops.schema';

/** Certificate registry; certificates are never deleted, only revoked after typing the code. */
export default function CertificatesFeature() {
  const { call, can } = useAuth();
  const state = useResource(listCertificates, 'certs');
  const [target, setTarget] = useState<Certificate | null>(null);
  const [confirm, setConfirm] = useState(''); const [reason, setReason] = useState(''); const [error, setError] = useState('');
  async function revoke() {
    if (!target) return; setError('');
    try { const saved = await call((t) => revokeCertificate(target.id, reason.trim(), t)); state.setData((l) => l?.map((c) => (c.id === saved.id ? saved : c))); setTarget(null); }
    catch (e) { setError(e instanceof Error ? e.message : 'Revoke failed'); }
  }
  return <>
    <PageHeader eyebrow="War-Room" title="Certificates" description="Issued audit certificates and their public verification links." />
    <Async state={state} module="Certificate registry">{(rows) => rows.length ? <DataList label="Certificates" rows={rows} rowKey={(c) => c.id} columns={[
      { key: 'code', header: 'Code', primary: true, mono: true, cell: (c) => c.certificateCode }, { key: 'eng', header: 'Engagement', mono: true, cell: (c) => c.engagementCode },
      { key: 'client', header: 'Client', cell: (c) => c.clientDisplayName }, { key: 'period', header: 'Testing period', mono: true, cell: (c) => `${formatDate(c.testingPeriodStart)} → ${formatDate(c.testingPeriodEnd)}` },
      { key: 'state', header: 'State', cell: (c) => <Pill tone={c.revokedAt ? 'danger' : 'success'}>{c.revokedAt ? 'Revoked' : 'Valid'}</Pill> },
      { key: 'verify', header: 'Verify URL', mono: true, cell: (c) => <button type="button" onClick={() => void navigator.clipboard.writeText(verifyUrl(c.certificateCode))} className="text-left text-xs text-accent-strong">Copy link ⧉</button> },
      { key: 'act', header: 'Action', cell: (c) => !c.revokedAt && can('certificates:issue') ? <button type="button" onClick={() => { setTarget(c); setConfirm(''); setReason(''); }} className="min-h-9 text-xs text-danger">Revoke</button> : '—' },
    ]} /> : <EmptyState title="No certificates issued">Certificates are issued from a completed engagement&apos;s Deliverables tab.</EmptyState>}</Async>
    <Drawer open={!!target} onClose={() => setTarget(null)} title="Revoke certificate" footer={<><Button variant="ghost" onClick={() => setTarget(null)}>Cancel</Button>
      <Button variant="danger" disabled={confirm !== target?.certificateCode || !reason.trim()} onClick={revoke}>Revoke</Button></>}>
      {target && <div className="space-y-4"><p className="text-sm">Revocation is permanent and shown on the public verify page.</p>
        <Textarea label="Reason" required rows={3} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} />
        <Input label={`Type ${target.certificateCode} to confirm`} className="font-mono" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
        {error && <p role="alert" className="text-sm text-danger">{error}</p>}</div>}
    </Drawer>
  </>;
}
