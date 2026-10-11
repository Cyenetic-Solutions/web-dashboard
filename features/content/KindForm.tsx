import type { ContentInput } from '@/services/content.schema';
import CaseStudyForm from './forms/CaseStudyForm';
import PostForm from './forms/PostForm';
import ReportForm from './forms/ReportForm';
import ServiceForm from './forms/ServiceForm';
import TeamForm from './forms/TeamForm';

/** Selects the product form for a content kind while keeping the discriminated union intact. */
export default function KindForm({ input, onChange, errors }: { input: ContentInput; onChange: (input: ContentInput) => void; errors: Record<string, string> }) {
  switch (input.kind) {
    case 'posts': return <PostForm value={input.data} errors={errors} onChange={(data) => onChange({ ...input, data })} />;
    case 'case-studies': return <CaseStudyForm value={input.data} errors={errors} onChange={(data) => onChange({ ...input, data })} />;
    case 'reports': return <ReportForm value={input.data} errors={errors} onChange={(data) => onChange({ ...input, data })} />;
    case 'team': return <TeamForm value={input.data} errors={errors} onChange={(data) => onChange({ ...input, data })} />;
    case 'services': return <ServiceForm value={input.data} errors={errors} onChange={(data) => onChange({ ...input, data: { ...data, slug: input.slug } })} />;
  }
}
