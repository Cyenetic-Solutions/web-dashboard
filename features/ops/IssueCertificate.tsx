"use client";
import { useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { useAuth } from '@/providers/AuthProvider';
import { issueCertificate, verifyUrl } from '@/services/ops';
import type { Certificate, Engagement } from '@/services/ops.schema';

/** Certificate issuance form; only completed engagements with a READY deliverable are eligible (API-enforced). */
export default function IssueCertificate({ engagement, eligible }: { engagement: Engagement; eligible: boolean }) {
  const { call } = useAuth();
  const [name, setName] = useState(engagement.clientOrganization);
  const [scope, setScope] = useState('');
  const [issued, setIssued] = useState<Certificate | null>(null);
  const [error, setError] = useState('');
  async function submit(e: FormEvent) { e.preventDefault(); setError(''); try { setIssued(await call((t) => issueCertificate(engagement.id, { clientDisplayName: name, scopeSummary: scope }, t))); } catch (err) { setError(err instanceof Error ? err.message : 'Could not issue'); } }
  if (issued) return <section className="border border-success bg-surface p-5"><p className="cye-label text-success">Certificate issued</p><p className="mt-2 font-display text-3xl">{issued.certificateCode}</p>
    <p className="mt-2 break-all font-mono text-xs text-muted">sha256 {issued.sha256Checksum}</p><p className="mt-2 break-all font-mono text-xs">{verifyUrl(issued.certificateCode)}</p></section>;
  return <form onSubmit={submit} className="space-y-4 border border-line bg-surface p-4 sm:p-5"><h2 className="cye-label text-muted">Audit certificate</h2>
    {!eligible ? <p className="text-sm text-muted">Available when the engagement is Completed and has a ready report.</p> : <>
      <Input label="Client display name" required value={name} onChange={(e) => setName(e.target.value)} hint="A moniker is allowed; it is shown on the public verify page." />
      <Textarea label="Scope summary" required rows={3} maxLength={500} value={scope} onChange={(e) => setScope(e.target.value)} />
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}<Button type="submit">Issue certificate</Button></>}
  </form>;
}
