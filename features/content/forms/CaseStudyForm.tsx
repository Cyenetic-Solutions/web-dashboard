import { Input, Textarea } from '@/components/ui/Field';
import { NumberStepper, Segmented } from '@/components/ui/Inputs';
import type { FormProps } from './types';

const sections = [['engagement', 'Engagement'], ['challenge', 'Challenge'], ['scope', 'Scope'], ['outcome', 'Outcome']] as const;
const counters = [['Critical', 'bg-cvss-critical'], ['High', 'bg-cvss-high'], ['Medium', 'bg-cvss-medium'], ['Low', 'bg-cvss-low']] as const;

/** Case study with the required four-part outline, client display mode and severity counters. */
export default function CaseStudyForm({ value, onChange, errors }: FormProps<'case-studies'>) {
  const total = Object.values(value.findings).reduce((sum, n) => sum + n, 0);
  return <div className="space-y-6">
    <div className="grid gap-5 sm:grid-cols-2">
      <Input label="Title" required value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} error={errors.title} wrapperClass="sm:col-span-2" />
      <Input label="Sector" required value={value.sector} onChange={(e) => onChange({ ...value, sector: e.target.value })} error={errors.sector} hint="e.g. Finance & Banking" />
      <Segmented label="Client display" value={value.is_anonymized ? 'moniker' : 'brand'} onChange={(mode) => onChange({ ...value, is_anonymized: mode === 'moniker' })}
        options={[{ value: 'moniker', label: 'Moniker' }, { value: 'brand', label: 'Public brand' }]} />
      <Input label={value.is_anonymized ? 'Client moniker' : 'Client name'} required value={value.client_display_name} onChange={(e) => onChange({ ...value, client_display_name: e.target.value })}
        error={errors.client_display_name} wrapperClass="sm:col-span-2" hint={value.is_anonymized ? 'Published publicly. Choose an approved pseudonym such as "Tier-1 Asian Bank". The prose below is not auto-redacted.' : 'Only use with written client approval.'} />
    </div>
    {sections.map(([key, title]) => <Textarea key={key} label={title} required rows={5} value={value[key]} onChange={(e) => onChange({ ...value, [key]: e.target.value })} error={errors[key]} />)}
    <fieldset><legend className="mb-2 flex w-full items-baseline justify-between text-sm font-medium">Severity counters <span className="font-mono text-xs text-muted">Total {total}</span></legend>
      <div className="grid grid-cols-2 gap-2 lg:grid-cols-4">{counters.map(([key, color]) => <NumberStepper key={key} label={key} accent={color} value={value.findings[key]}
        onChange={(n) => onChange({ ...value, findings: { ...value.findings, [key]: n } })} />)}</div></fieldset>
  </div>;
}
