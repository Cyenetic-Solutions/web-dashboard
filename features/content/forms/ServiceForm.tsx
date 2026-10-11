import Button from '@/components/ui/Button';
import { Input, Textarea } from '@/components/ui/Field';
import { TagInput } from '@/components/ui/Inputs';
import type { FormProps } from './types';

/** Service domain with any number of sub-domains; no fixed catalog count. */
export default function ServiceForm({ value, onChange, errors }: FormProps<'services'>) {
  const subs = value.subDomains;
  const setSub = (i: number, patch: Partial<(typeof subs)[number]>) => onChange({ ...value, subDomains: subs.map((s, j) => (j === i ? { ...s, ...patch } : s)) });
  return <div className="space-y-5">
    <Input label="Domain title" required value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} error={errors.title} />
    <Textarea label="Description" required rows={4} value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} error={errors.description} />
    <TagInput label="Standards" value={value.standards} onChange={(standards) => onChange({ ...value, standards })} hint="e.g. OWASP ASVS, PTES, NIST 800-115. Press Enter to add." />
    <fieldset className="space-y-3"><legend className="mb-1 flex w-full items-center justify-between text-sm font-medium">Sub-domains <span className="font-mono text-xs text-muted">{subs.length}</span></legend>
      {errors.subDomains && <p className="text-xs text-danger">{errors.subDomains}</p>}
      {subs.map((sub, i) => <div key={i} className="grid gap-3 border border-line bg-surface-2 p-4 sm:grid-cols-2">
        <Input label="Title" required value={sub.title} onChange={(e) => setSub(i, { title: e.target.value })} error={errors[`subDomains.${i}.title`]} />
        <Input label="Slug" required className="font-mono" value={sub.slug} onChange={(e) => setSub(i, { slug: e.target.value })} error={errors[`subDomains.${i}.slug`]} />
        <Textarea label="Description" required rows={2} value={sub.description} onChange={(e) => setSub(i, { description: e.target.value })} error={errors[`subDomains.${i}.description`]} wrapperClass="sm:col-span-2" />
        <div className="sm:col-span-2"><Button type="button" variant="danger" size="sm" onClick={() => onChange({ ...value, subDomains: subs.filter((_, j) => j !== i) })}>Remove sub-domain</Button></div>
      </div>)}
      <Button type="button" variant="secondary" onClick={() => onChange({ ...value, subDomains: [...subs, { slug: '', title: '', description: '' }] })}>+ Add sub-domain</Button>
    </fieldset>
  </div>;
}
