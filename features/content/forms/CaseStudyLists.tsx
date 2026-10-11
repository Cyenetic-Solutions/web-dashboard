import Button from '@/components/ui/Button';
import { Input } from '@/components/ui/Field';
import Repeater from '@/components/ui/Repeater';
import type { DataOf } from './types';

type Data = DataOf<'case-studies'>;
/** Props for a case-study sub-section: the payload, a patch setter and Zod errors keyed by path. */
export interface PartProps { value: Data; set: (patch: Partial<Data>) => void; errors: Record<string, string> }

const engagementSuggestions = ['Web Application Pentesting', 'Android Application Pentesting', 'iOS Application Pentesting', 'API Security Testing', 'Network Pentesting', 'Cloud Configuration Review'];

/** Requirement specification: short bullet points, 4–5 recommended. */
export function CaseStudyRequirements({ value, set, errors }: PartProps) {
  return <Repeater legend="Requirement specification" items={value.requirement_points} onChange={(requirement_points) => set({ requirement_points })} max={10}
    create={() => ''} addLabel="Add point" error={errors.requirement_points} itemLabel={(p, i) => p || `Point ${i + 1}`}
    hint="4–5 short points work best, e.g. “Validating the security posture of their web & Android applications”."
    render={(point, update, i) => <Input label={`Point ${i + 1}`} required maxLength={300} value={point} onChange={(e) => update(e.target.value)} error={errors[`requirement_points.${i}`]} />} />;
}

/** Engagement overview: the services delivered, with quick-add suggestions. */
export function CaseStudyEngagement({ value, set, errors }: PartProps) {
  const items = value.engagement_items;
  const titles = new Set(items.map((item) => item.title.trim().toLowerCase()));
  const suggestions = engagementSuggestions.filter((s) => !titles.has(s.toLowerCase()));
  return <div className="space-y-4">
    <Repeater legend="Engagement items" items={items} onChange={(engagement_items) => set({ engagement_items })} max={10}
      create={() => ({ title: '', description: '' })} addLabel="Add engagement item" error={errors.engagement_items} itemLabel={(item, i) => item.title || `Item ${i + 1}`}
      render={(item, update, i) => <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Service" required maxLength={120} value={item.title} onChange={(e) => update({ ...item, title: e.target.value })} error={errors[`engagement_items.${i}.title`]} />
        <Input label="Short description" maxLength={300} value={item.description} onChange={(e) => update({ ...item, description: e.target.value })} error={errors[`engagement_items.${i}.description`]} />
      </div>} />
    {suggestions.length > 0 && items.length < 10 && <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs text-muted">Quick add:</span>
      {suggestions.map((title) => <Button key={title} type="button" variant="ghost" size="sm" onClick={() => set({ engagement_items: [...items, { title, description: '' }] })}>+ {title}</Button>)}
    </div>}
  </div>;
}
