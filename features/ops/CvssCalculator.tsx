"use client";
import { useState } from 'react';
import { SeverityBadge } from '@/components/ui/Badge';
import { Input, Select } from '@/components/ui/Field';
import { Segmented } from '@/components/ui/Inputs';
import { cvss31Metrics, format31, parse31, parse40, score31, severityOf, type Metric31, type Severity, type Vector31 } from '@/services/cvss';
import { severities } from '@/services/ops.schema';

/** CVSS state owned by the finding editor. */
export interface CvssValue { version: 'V3_1' | 'V4_0'; vector: string | null; score: number | null; severity: Severity; overrideReason: string | null }
const fallback: Vector31 = { AV: 'N', AC: 'L', PR: 'N', UI: 'N', S: 'U', C: 'N', I: 'N', A: 'N' };
const metricKeys = Object.keys(cvss31Metrics).filter((k): k is Metric31 => k in cvss31Metrics);

/** v3.1 segmented base metrics with live score/vector (paste fills buttons); v4.0 vector validation with manual score. Severity override needs a reason. */
export default function CvssCalculator({ value, onChange }: { value: CvssValue; onChange: (value: CvssValue) => void }) {
  const vector31 = (value.vector && parse31(value.vector)) || fallback;
  const [paste, setPaste] = useState('');
  const [override, setOverride] = useState(!!value.overrideReason);
  const derived = value.score === null ? 'INFO' : severityOf(value.score);
  function set31(next: Vector31) { const score = score31(next); onChange({ ...value, version: 'V3_1', vector: format31(next), score, severity: override ? value.severity : severityOf(score) }); }
  function set40(vector: string, score: number | null) { onChange({ ...value, version: 'V4_0', vector, score, severity: override || score === null ? value.severity : severityOf(score) }); }
  const v40ok = value.version === 'V4_0' && !!value.vector && !!parse40(value.vector);
  return <section aria-label="CVSS calculator" className="space-y-4 border border-line bg-surface p-4 sm:p-5">
    <div className="flex flex-wrap items-center justify-between gap-3"><h2 className="cye-label text-muted">CVSS</h2>
      <div className="flex items-center gap-3"><span className="font-display text-4xl leading-none">{value.score?.toFixed(1) ?? '—'}</span><SeverityBadge value={value.severity} /></div></div>
    <Segmented label="Version" value={value.version} onChange={(v) => (v === 'V3_1' ? set31(vector31) : set40(value.version === 'V4_0' ? value.vector ?? '' : '', null))}
      options={[{ value: 'V3_1', label: 'v3.1' }, { value: 'V4_0', label: 'v4.0' }]} />
    {value.version === 'V3_1' ? <>
      <div className="grid gap-3 sm:grid-cols-2">{metricKeys.map((m) => {
        const values = cvss31Metrics[m].values;
        const options = Object.entries(values).map(([code, text]) => ({ value: code, label: `${code} · ${text}` }));
        return <Segmented key={m} label={`${cvss31Metrics[m].label} (${m})`} value={String(vector31[m])} options={options}
          onChange={(code) => { const next = parse31(format31({ ...vector31, [m]: code })); if (next) set31(next); }} />;
      })}</div>
      <p className="break-all border border-line bg-surface-2 px-3 py-2 font-mono text-xs" aria-label="Vector string">{format31(vector31)}</p>
      <Input label="Paste a vector" placeholder="CVSS:3.1/AV:N/AC:L/…" className="font-mono" value={paste} onChange={(e) => { setPaste(e.target.value); const v = parse31(e.target.value); if (v) set31(v); }}
        error={paste && !parse31(paste) ? 'Not a complete CVSS 3.1 base vector' : undefined} />
    </> : <div className="grid gap-3 sm:grid-cols-[1fr_140px]">
      <Input label="CVSS 4.0 vector" className="font-mono" placeholder="CVSS:4.0/AV:N/AC:L/AT:N/PR:N/UI:N/VC:H/VI:H/VA:H/SC:N/SI:N/SA:N" value={value.vector ?? ''}
        onChange={(e) => set40(e.target.value, value.score)} error={value.vector && !v40ok ? 'Missing or invalid mandatory base metrics (AV AC AT PR UI VC VI VA SC SI SA)' : undefined} />
      <Input label="Score" type="number" min={0} max={10} step={0.1} value={value.score ?? ''} onChange={(e) => set40(value.vector ?? '', e.target.value === '' ? null : Math.min(10, Math.max(0, Math.round(Number(e.target.value) * 10) / 10)))}
        hint={<a href="https://www.first.org/cvss/calculator/4.0" target="_blank" rel="noreferrer noopener" className="underline">FIRST calculator</a>} />
    </div>}
    {!override ? <button type="button" onClick={() => setOverride(true)} className="min-h-11 text-sm text-accent-strong">Override severity</button>
      : <div className="grid gap-3 border-t border-line pt-4 sm:grid-cols-[180px_1fr]">
        <Select label="Severity" value={value.severity} options={severities.map((s) => ({ value: s, label: s.toLowerCase() }))} onChange={(e) => onChange({ ...value, severity: severities.find((s) => s === e.target.value) ?? derived })} />
        <Input label="Override reason" required value={value.overrideReason ?? ''} onChange={(e) => onChange({ ...value, overrideReason: e.target.value })} hint={`Calculated: ${derived.toLowerCase()}`} />
        <button type="button" onClick={() => { setOverride(false); onChange({ ...value, severity: derived, overrideReason: null }); }} className="min-h-11 text-left text-sm text-muted sm:col-span-2">Remove override</button></div>}
  </section>;
}
