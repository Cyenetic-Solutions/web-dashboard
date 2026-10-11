import { Input, Switch, Textarea } from '@/components/ui/Field';
import { TagInput } from '@/components/ui/Inputs';
import MarkdownEditor from '@/components/ui/MarkdownEditor';
import ImageField, { useImageUpload } from '../ImageField';
import type { FormProps } from './types';

const categories = ['Research', 'Advisory', 'Writeup', 'Guide', 'News', 'Case notes'];

/** Blog post: title, subtitle, cover, publish date, Markdown body with inline images, category, tags, author, featured flag and SEO. */
export default function PostForm({ value, onChange, errors }: FormProps<'posts'>) {
  const set = (patch: Partial<typeof value>) => onChange({ ...value, ...patch });
  const inlineImage = useImageUpload('blog-cover');
  return <div className="space-y-6">
    <Input label="Title" required maxLength={160} value={value.title} onChange={(e) => set({ title: e.target.value })} error={errors.title} className="text-lg" />
    <Textarea label="Subtitle" required rows={2} maxLength={500} value={value.summary} onChange={(e) => set({ summary: e.target.value })} error={errors.summary}
      hint="Shown under the title and on blog cards." />
    <ImageField label="Cover image" purpose="blog-cover" prefix="cover_image" errors={errors} value={value.cover_image} onChange={(cover_image) => set({ cover_image })}
      hint="JPG, PNG or WebP, up to 5 MB. 1200×630 or larger works best." />
    <MarkdownEditor label="Description" required rows={20} value={value.content_markdown} onChange={(content_markdown) => set({ content_markdown })}
      error={errors.content_markdown} onImage={inlineImage} hint="Markdown. Paste or drop images to add them inline" />
    <div className="grid gap-5 sm:grid-cols-2">
      <Input label="Category" required list="post-categories" maxLength={60} value={value.category} onChange={(e) => set({ category: e.target.value })} error={errors.category}
        hint="Pick one or type a new category." />
      <datalist id="post-categories">{categories.map((c) => <option key={c} value={c} />)}</datalist>
      <Input label="Publish date" type="date" value={value.publish_date ?? ''} onChange={(e) => set({ publish_date: e.target.value || null })} error={errors.publish_date}
        hint="Date shown on the article." />
      <Input label="Author" maxLength={120} value={value.author} onChange={(e) => set({ author: e.target.value })} error={errors.author} hint="Name shown in the byline." />
      <div className="border border-line bg-surface-2 px-3"><Switch label="Featured" hint="Shown in the blog hero. At most two published posts can be featured." checked={value.is_featured} onChange={(is_featured) => set({ is_featured })} /></div>
    </div>
    <div>
      <TagInput label="Tags" max={10} value={value.tags} onChange={(tags) => set({ tags: tags.map((t) => t.toLowerCase()) })} hint="Up to 10. Press Enter or comma to add." />
      {errors.tags && <p className="mt-1 text-xs text-danger">{errors.tags}</p>}
    </div>
    <fieldset className="min-w-0 space-y-4 border border-line p-4">
      <legend className="px-1 text-sm font-medium">Search & social</legend>
      <Input label="Meta title" maxLength={70} value={value.seo_title} onChange={(e) => set({ seo_title: e.target.value })} error={errors.seo_title}
        hint={`${value.seo_title.length} / 70. Leave blank to use the title.`} />
      <Textarea label="Meta description" rows={2} maxLength={160} value={value.seo_description} onChange={(e) => set({ seo_description: e.target.value })} error={errors.seo_description}
        hint="Leave blank to use the subtitle." />
      <div aria-label="Search result preview" className="border border-line bg-surface-2 p-3 text-sm">
        <p className="truncate text-info">{value.seo_title || value.title}</p>
        <p className="line-clamp-2 text-xs text-muted">{value.seo_description || value.summary}</p>
      </div>
    </fieldset>
  </div>;
}
