import { Input, Textarea } from '@/components/ui/Field';
import type { FormProps } from './types';

const nullable = (text: string) => (text.trim() ? text.trim() : null);
/** Team profile: name, designation, bio, links and display order. */
export default function TeamForm({ value, onChange, errors }: FormProps<'team'>) {
  return <div className="grid gap-5 sm:grid-cols-2">
    <Input label="Full name" required value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} error={errors.title} />
    <Input label="Designation" required value={value.designation} onChange={(e) => onChange({ ...value, designation: e.target.value })} error={errors.designation} hint="e.g. Chief Executive Officer" />
    <Textarea label="Bio" required rows={6} maxLength={1200} value={value.bio} onChange={(e) => onChange({ ...value, bio: e.target.value })} error={errors.bio} wrapperClass="sm:col-span-2" />
    <Input label="Photo URL" type="url" placeholder="https://" value={value.image_url ?? ''} onChange={(e) => onChange({ ...value, image_url: nullable(e.target.value) })} error={errors.image_url} hint="HTTPS only. Uploads arrive with the storage service." />
    <Input label="LinkedIn URL" type="url" placeholder="https://www.linkedin.com/in/…" value={value.linkedin_url ?? ''} onChange={(e) => onChange({ ...value, linkedin_url: nullable(e.target.value) })} error={errors.linkedin_url} />
    <Input label="Sort order" type="number" min={0} value={value.sort_order} onChange={(e) => onChange({ ...value, sort_order: Math.max(0, Math.round(Number(e.target.value) || 0)) })} error={errors.sort_order} hint="Lower numbers appear first." />
  </div>;
}
