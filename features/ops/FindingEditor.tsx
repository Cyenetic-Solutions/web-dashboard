"use client";
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import { Input, Select, Switch, Textarea } from '@/components/ui/Field';
import { TagInput } from '@/components/ui/Inputs';
import { label } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { ApiError } from '@/services/http';
import { saveFinding, verifyFinding } from '@/services/ops';
import { findingStatuses, type Finding, type FindingInput } from '@/services/ops.schema';
import CvssCalculator, { type CvssValue } from './CvssCalculator';
import RetestPanel from './RetestPanel';

const empty: FindingInput = { title: '', description: '', severity: 'INFO', cvssVersion: 'V3_1', cvssVector: null, cvssScore: null, severityOverrideReason: null, cweId: null, affectedEndpoint: '', pocText: null, remediationGuidance: null, references: [], status: 'DRAFT' };
const toInput = (f: Finding): FindingInput => ({ title: f.title, description: f.description, severity: f.severity, cvssVersion: f.cvssVersion, cvssVector: f.cvssVector ?? null, cvssScore: f.cvssScore ?? null,
  severityOverrideReason: f.severityOverrideReason ?? null, cweId: f.cweId ?? null, affectedEndpoint: f.affectedEndpoint, pocText: f.pocText ?? null, remediationGuidance: f.remediationGuidance ?? null, references: f.references, status: f.status });

/** Finding editor: details, CVSS panel, PoC/remediation, status, verification and retest tickets. */
export default function FindingEditor({ finding, engagementId }: { finding?: Finding; engagementId?: string }) {
  const { call, can } = useAuth();
  const router = useRouter();
  const [current, setCurrent] = useState(finding);
  const [input, setInput] = useState<FindingInput>(finding ? toInput(finding) : empty);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, setPending] = useState(false);
  const editable = can('findings:write');
  const set = (patch: Partial<FindingInput>) => setInput((i) => ({ ...i, ...patch }));
  const cvss: CvssValue = { version: input.cvssVersion, vector: input.cvssVector, score: input.cvssScore, severity: input.severity, overrideReason: input.severityOverrideReason };
  async function submit(event: FormEvent) {
    event.preventDefault(); setMessage(null);
    const local: Record<string, string> = {};
    if (!input.title.trim()) local.title = 'Required';
    if (!input.affectedEndpoint.trim()) local.affectedEndpoint = 'Required';
    if (input.cweId && !/^CWE-\d+$/.test(input.cweId)) local.cweId = 'Use the format CWE-###';
    if (input.severityOverrideReason === '') local.severityOverrideReason = 'Give a reason for the override';
    setErrors(local); if (Object.keys(local).length) { setMessage({ ok: false, text: 'Fix the highlighted fields.' }); return; }
    setPending(true);
    try {
      const saved = await call((t) => saveFinding(input, t, { id: current?.id, engagementId }));
      setCurrent(saved); setInput(toInput(saved)); setMessage({ ok: true, text: `Saved ${saved.referenceCode}` });
      if (!current) router.replace(`/ops/findings/${saved.id}`);
    } catch (e) { if (e instanceof ApiError) setErrors(Object.fromEntries(Object.entries(e.fieldErrors).map(([k, v]) => [k, v[0] ?? 'Invalid']))); setMessage({ ok: false, text: e instanceof Error ? e.message : 'Save failed' }); }
    finally { setPending(false); }
  }
  async function verify(next: boolean) { if (!current) return; try { setCurrent(await call((t) => verifyFinding(current.id, next, t))); } catch (e) { setMessage({ ok: false, text: e instanceof Error ? e.message : 'Could not change verification' }); } }
  return <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(300px,1fr)]">
    <fieldset disabled={!editable || pending} className="min-w-0 space-y-6"><legend className="sr-only">Finding</legend>
      <div className="grid gap-5 border border-line bg-surface p-4 sm:grid-cols-2 sm:p-6">
        <Input label="Title" required value={input.title} onChange={(e) => set({ title: e.target.value })} error={errors.title} wrapperClass="sm:col-span-2" />
        <Input label="Reference" readOnly className="font-mono" value={current?.referenceCode ?? 'Assigned on save'} />
        <Input label="CWE ID" className="font-mono" placeholder="CWE-89" value={input.cweId ?? ''} onChange={(e) => set({ cweId: e.target.value.trim() || null })} error={errors.cweId} />
        <Textarea label="Affected endpoint(s)" required rows={3} className="font-mono text-xs" value={input.affectedEndpoint} onChange={(e) => set({ affectedEndpoint: e.target.value })} error={errors.affectedEndpoint} wrapperClass="sm:col-span-2" hint="One per line" />
      </div>
      <CvssCalculator value={cvss} onChange={(v) => set({ cvssVersion: v.version, cvssVector: v.vector, cvssScore: v.score, severity: v.severity, severityOverrideReason: v.overrideReason })} />
      <div className="space-y-5 border border-line bg-surface p-4 sm:p-6">
        <Textarea label="Description" rows={6} value={input.description} onChange={(e) => set({ description: e.target.value })} />
        <Textarea label="Proof of concept / steps to reproduce (Markdown)" rows={8} className="font-mono text-xs" value={input.pocText ?? ''} onChange={(e) => set({ pocText: e.target.value || null })} />
        <Textarea label="Remediation guidance" rows={5} value={input.remediationGuidance ?? ''} onChange={(e) => set({ remediationGuidance: e.target.value || null })} />
        <TagInput label="References" value={input.references} onChange={(references) => set({ references })} hint="Paste URLs and press Enter" />
        <p className="border-l-2 border-line-strong pl-3 text-xs text-muted">Screenshots and proof videos attach through the media service into private storage. They are available once the API&apos;s upload module is connected.</p>
      </div>
    </fieldset>
    <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
      <div className="space-y-4 border border-line bg-surface p-4 sm:p-5">
        <Select label="Status" disabled={!editable} value={input.status} onChange={(e) => set({ status: findingStatuses.find((s) => s === e.target.value) ?? input.status })}
          options={findingStatuses.filter((s) => s !== 'FIXED_VERIFIED' || input.status === s).map((s) => ({ value: s, label: label(s) }))} hint="Fixed & verified is set only by a passed retest." />
        {current && <Switch label="Verified" hint="Only verified findings are included in reports." disabled={!editable} checked={current.isVerified} onChange={(v) => void verify(v)} />}
        {editable && <Button type="submit" size="lg" loading={pending} className="w-full">{current ? 'Save finding' : 'Create finding'}</Button>}
        <p role="status" className={`min-h-5 text-sm ${message?.ok ? 'text-success' : 'text-danger'}`}>{message?.text}</p>
      </div>
      {current && <RetestPanel findingId={current.id} />}
    </aside>
  </form>;
}
