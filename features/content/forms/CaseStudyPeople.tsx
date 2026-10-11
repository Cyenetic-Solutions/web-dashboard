import { Input, Textarea } from '@/components/ui/Field';
import Repeater from '@/components/ui/Repeater';
import ImageField from '../ImageField';
import type { PartProps } from './CaseStudyLists';
import Section from './Section';

/** Person quotes (up to four) and review links (up to four). */
export default function CaseStudyPeople({ value, set, errors }: PartProps) {
  return <>
    <Section id="cs-people" n={5} title="Person quotes">
      <Repeater legend="People" items={value.testimonials} onChange={(testimonials) => set({ testimonials })} max={4} hint="3–4 people work best."
        create={() => ({ quote: '', name: '', designation: '', company: '', photo: null })} addLabel="Add person" error={errors.testimonials}
        itemLabel={(p, i) => p.name || `Person ${i + 1}`}
        render={(p, update, i) => <div className="space-y-4">
          <Textarea label="Quote" required rows={3} maxLength={500} value={p.quote} onChange={(e) => update({ ...p, quote: e.target.value })} error={errors[`testimonials.${i}.quote`]} />
          <div className="grid gap-4 sm:grid-cols-3">
            <Input label="Name" required maxLength={120} value={p.name} onChange={(e) => update({ ...p, name: e.target.value })} error={errors[`testimonials.${i}.name`]} />
            <Input label="Role" required maxLength={120} value={p.designation} onChange={(e) => update({ ...p, designation: e.target.value })} error={errors[`testimonials.${i}.designation`]}
              hint="e.g. CISO" />
            <Input label="Company" maxLength={120} value={p.company} onChange={(e) => update({ ...p, company: e.target.value })} error={errors[`testimonials.${i}.company`]} />
          </div>
          <ImageField label="Photo (optional)" purpose="case-cover" prefix={`testimonials.${i}.photo`} errors={errors} value={p.photo} onChange={(photo) => update({ ...p, photo })}
            maxBytes={2 * 1024 * 1024} hint="Square JPG, PNG or WebP, up to 2 MB." />
        </div>} />
    </Section>
    <Section id="cs-reviews" n={6} title="Reviews">
      <Repeater legend="Review links" items={value.reviews} onChange={(reviews) => set({ reviews })} max={4} hint="Links to public reviews, e.g. Clutch or G2."
        create={() => ({ name: '', url: '' })} addLabel="Add review" error={errors.reviews} itemLabel={(r, i) => r.name || `Review ${i + 1}`}
        render={(r, update, i) => <div className="grid gap-4 sm:grid-cols-2">
          <Input label="Name" required maxLength={120} value={r.name} onChange={(e) => update({ ...r, name: e.target.value })} error={errors[`reviews.${i}.name`]} />
          <Input label="URL" required type="url" placeholder="https://" value={r.url} onChange={(e) => update({ ...r, url: e.target.value.trim() })} error={errors[`reviews.${i}.url`]} />
        </div>} />
    </Section>
  </>;
}
