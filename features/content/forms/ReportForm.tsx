import { Input, Switch, Textarea } from '@/components/ui/Field';
import type { FormProps } from './types';

/** Report metadata and gate flag. PDF upload is shown disabled until private storage exists. */
export default function ReportForm({ value, onChange, errors }: FormProps<'reports'>) {
  return <div className="space-y-5">
    <div aria-disabled="true" className="border border-dashed border-line-strong p-6 text-center">
      <p className="font-mono text-2xl text-subtle" aria-hidden="true">⇪</p><p className="mt-2 text-sm font-medium">PDF upload unavailable</p>
      <p className="mx-auto mt-1 max-w-md text-xs text-muted">Private R2/S3 storage, scanning and thumbnail generation are not connected to the API yet, so files cannot be attached. Metadata is saved normally.</p></div>
    <Input label="Title" required value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} error={errors.title} />
    <Textarea label="Description" required rows={6} value={value.description} onChange={(e) => onChange({ ...value, description: e.target.value })} error={errors.description} hint="Shown on the gated preview page." />
    <div className="grid gap-5 sm:grid-cols-2">
      <Input label="Category" required value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })} error={errors.category} hint="Whitepaper, Pentest guide or Security checklist" />
      <div className="border border-line bg-surface-2 px-3"><Switch label="Email-gated download" hint="Visitors submit a work email before downloading." checked={value.is_gated} onChange={(is_gated) => onChange({ ...value, is_gated })} /></div>
    </div>
  </div>;
}
