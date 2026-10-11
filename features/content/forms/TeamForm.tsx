import { Input, Switch, Textarea } from '@/components/ui/Field';
import { TagInput } from '@/components/ui/Inputs';
import Repeater from '@/components/ui/Repeater';
import ImageField from '../ImageField';
import type { FormProps } from './types';

const nullable = (text: string) => (text.trim() ? text.trim() : null);
const departments = ['Leadership', 'Offensive Security', 'Engineering', 'Research', 'Operations', 'Sales'];

/** Team profile: name, post, photo, department, bio, certifications, skills, links, visibility and display order. */
export default function TeamForm({ value, onChange, errors }: FormProps<'team'>) {
  const set = (patch: Partial<typeof value>) => onChange({ ...value, ...patch });
  const photo = value.image_url ? { url: value.image_url, alt: value.image_alt } : null;
  return <div className="space-y-6">
    <div className="grid gap-5 sm:grid-cols-2">
      <Input label="Full name" required maxLength={120} value={value.title} onChange={(e) => set({ title: e.target.value })} error={errors.title} />
      <Input label="Post" required maxLength={120} value={value.designation} onChange={(e) => set({ designation: e.target.value })} error={errors.designation} hint="e.g. Lead Penetration Tester" />
      <Input label="Department" list="team-departments" maxLength={80} value={value.department} onChange={(e) => set({ department: e.target.value })} error={errors.department} />
      <datalist id="team-departments">{departments.map((d) => <option key={d} value={d} />)}</datalist>
      <Input label="Sort order" type="number" min={0} value={value.sort_order} onChange={(e) => set({ sort_order: Math.max(0, Math.round(Number(e.target.value) || 0)) })} error={errors.sort_order}
        hint="Lower numbers appear first. You can also reorder from the list." />
    </div>
    <ImageField label="Photo" purpose="team-photo" prefix="photo" errors={{ 'photo.url': errors.image_url, 'photo.alt': errors.image_alt }} value={photo} maxBytes={2 * 1024 * 1024}
      hint="Square JPG, PNG or WebP, up to 2 MB, at least 400×400." onChange={(next) => set({ image_url: next?.url ?? null, image_alt: next?.alt ?? '' })} />
    <Textarea label="Bio" required rows={6} maxLength={1200} value={value.bio} onChange={(e) => set({ bio: e.target.value })} error={errors.bio} />
    <div className="grid gap-5 sm:grid-cols-2">
      <TagInput label="Certifications" max={15} value={value.certifications} onChange={(certifications) => set({ certifications })} hint="e.g. OSCP, OSWE, CREST CRT" />
      <TagInput label="Skills" max={10} value={value.skills} onChange={(skills) => set({ skills })} hint="Up to 10. Press Enter to add." />
    </div>
    <Input label="LinkedIn URL" type="url" placeholder="https://www.linkedin.com/in/…" value={value.linkedin_url ?? ''} onChange={(e) => set({ linkedin_url: nullable(e.target.value) })} error={errors.linkedin_url} />
    <Repeater legend="Other links" items={value.links} onChange={(links) => set({ links })} max={5} create={() => ({ label: '', url: '' })} addLabel="Add link"
      hint="GitHub, X, personal site or a talk." error={errors.links} itemLabel={(l, i) => l.label || `Link ${i + 1}`}
      render={(link, update, i) => <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Label" required maxLength={40} value={link.label} onChange={(e) => update({ ...link, label: e.target.value })} error={errors[`links.${i}.label`]} />
        <Input label="URL" required type="url" placeholder="https://" value={link.url} onChange={(e) => update({ ...link, url: e.target.value.trim() })} error={errors[`links.${i}.url`]} />
      </div>} />
    <div className="border border-line bg-surface-2 px-3"><Switch label="Show on public site" hint="Turn off to keep the profile without listing it." checked={value.show_on_site} onChange={(show_on_site) => set({ show_on_site })} /></div>
    <p className="text-xs text-muted">Team profiles are public. Do not add phone numbers, home addresses or other private details.</p>
  </div>;
}
