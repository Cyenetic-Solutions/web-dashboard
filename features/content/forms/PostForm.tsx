import { Input, Switch, Textarea } from '@/components/ui/Field';
import type { FormProps } from './types';

/** Blog & advisory post: title, summary, Markdown body, category and featured flag (max two published featured). */
export default function PostForm({ value, onChange, errors }: FormProps<'posts'>) {
  const words = value.content_markdown.trim().split(/\s+/).filter(Boolean).length;
  return <div className="space-y-5">
    <Input label="Title" required value={value.title} onChange={(e) => onChange({ ...value, title: e.target.value })} error={errors.title} className="text-lg" />
    <Textarea label="Summary" required rows={3} maxLength={500} value={value.summary} onChange={(e) => onChange({ ...value, summary: e.target.value })} error={errors.summary} />
    <Textarea label="Body (Markdown)" required rows={18} spellCheck value={value.content_markdown} onChange={(e) => onChange({ ...value, content_markdown: e.target.value })}
      error={errors.content_markdown} hint={`${words} words · about ${Math.max(1, Math.round(words / 200))} min read`} className="font-mono text-[13px] leading-6" />
    <div className="grid gap-5 sm:grid-cols-2">
      <Input label="Category" required value={value.category} onChange={(e) => onChange({ ...value, category: e.target.value })} error={errors.category} hint="e.g. Advisory, Research, Writeup" />
      <div className="border border-line bg-surface-2 px-3"><Switch label="Featured on blog hero" hint="The API allows at most two published featured posts." checked={value.is_featured} onChange={(is_featured) => onChange({ ...value, is_featured })} /></div>
    </div>
  </div>;
}
