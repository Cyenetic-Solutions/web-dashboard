import { Input, Select, Textarea } from '@/components/ui/Field';
import { Segmented, TagInput } from '@/components/ui/Inputs';
import MarkdownEditor from '@/components/ui/MarkdownEditor';
import { companySizes } from '@/services/content.schema';
import ImageField from '../ImageField';
import CaseStudyPeople from './CaseStudyPeople';
import Section from './Section';
import { CaseStudyEngagement, CaseStudyRequirements } from './CaseStudyLists';
import type { FormProps } from './types';

const sections = [['cs-basics', 'Basics'], ['cs-company', 'Company'], ['cs-requirements', 'Requirements'], ['cs-engagement', 'Engagement'], ['cs-people', 'Quotes'], ['cs-reviews', 'Reviews']] as const;

/** Case study: basics, company profile, requirements, engagement overview, person quotes and review links. */
export default function CaseStudyForm({ value, onChange, errors }: FormProps<'case-studies'>) {
  const set = (patch: Partial<typeof value>) => onChange({ ...value, ...patch });
  return <div className="space-y-8">
    <nav aria-label="Case study sections" className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1 pb-2">
      {sections.map(([id, label], i) => <a key={id} href={`#${id}`} className="shrink-0 px-2 py-1 font-mono text-[11px] uppercase tracking-wider text-muted hover:text-accent-strong">{i + 1}. {label}</a>)}
    </nav>
    <Section id="cs-basics" n={1} title="Basics">
      <Input label="Title" required maxLength={160} value={value.title} onChange={(e) => set({ title: e.target.value })} error={errors.title} className="text-lg" />
      <Input label="Tagline" required maxLength={200} value={value.tagline} onChange={(e) => set({ tagline: e.target.value })} error={errors.tagline}
        hint="One line under the title, e.g. “Securing a fintech's web and Android apps before launch”." />
      <ImageField label="Cover image" purpose="case-cover" prefix="cover_image" errors={errors} value={value.cover_image} onChange={(cover_image) => set({ cover_image })} />
    </Section>
    <Section id="cs-company" n={2} title="Company">
      <div className="grid gap-5 sm:grid-cols-2">
        <Segmented label="Client display" value={value.is_anonymized ? 'moniker' : 'brand'} onChange={(mode) => set({ is_anonymized: mode === 'moniker' })}
          options={[{ value: 'moniker', label: 'Moniker' }, { value: 'brand', label: 'Public brand' }]} />
        <Input label={value.is_anonymized ? 'Client moniker' : 'Company name'} required maxLength={120} value={value.client_display_name} onChange={(e) => set({ client_display_name: e.target.value })}
          error={errors.client_display_name} hint={value.is_anonymized ? 'Published publicly. Remove the real name from every text field yourself; nothing is auto-redacted.' : 'Only use with written client approval.'} />
      </div>
      <Textarea label="Company quote" rows={2} maxLength={500} value={value.company_quote} onChange={(e) => set({ company_quote: e.target.value })} error={errors.company_quote}
        hint="Shown as a pull quote." />
      <Textarea label="Company overview" required rows={4} maxLength={2000} value={value.company_overview} onChange={(e) => set({ company_overview: e.target.value })} error={errors.company_overview} />
      <div className="grid gap-5 sm:grid-cols-2">
        <Input label="Address" maxLength={200} value={value.company_address} onChange={(e) => set({ company_address: e.target.value })} error={errors.company_address}
          hint="City and country is usually enough." />
        <Select label="Company size" value={value.company_size ?? ''} onChange={(e) => set({ company_size: companySizes.find((s) => s === e.target.value) ?? null })}
          options={[{ value: '', label: 'Not specified' }, ...companySizes.map((s) => ({ value: s, label: `${s} employees` }))]} />
      </div>
      <div>
        <TagInput label="Test type" max={12} value={value.test_types} onChange={(test_types) => set({ test_types })}
          hint="e.g. Web Application, Android, API, Network. Press Enter to add." />
        {errors.test_types && <p className="mt-1 text-xs text-danger">{errors.test_types}</p>}
      </div>
    </Section>
    <Section id="cs-requirements" n={3} title="Requirements">
      <MarkdownEditor label="Company requirement" required rows={10} value={value.requirement_markdown} onChange={(requirement_markdown) => set({ requirement_markdown })}
        error={errors.requirement_markdown} hint="Markdown" />
      <CaseStudyRequirements value={value} set={set} errors={errors} />
    </Section>
    <Section id="cs-engagement" n={4} title="Engagement overview">
      <CaseStudyEngagement value={value} set={set} errors={errors} />
    </Section>
    <CaseStudyPeople value={value} set={set} errors={errors} />
  </div>;
}
