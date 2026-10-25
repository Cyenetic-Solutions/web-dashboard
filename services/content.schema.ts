import { z } from 'zod';

const text = z.string().trim().min(1).max(10000);
const short = (max: number) => z.string().trim().min(1, 'Required').max(max);
const optional = (max: number) => z.string().trim().max(max);
const https = z.url().startsWith('https://', 'Use an https:// URL');
/** The local dev API or MinIO (./run.sh) serves uploads from http://localhost; accepted only outside production builds. */
const allowLoopbackHttp = process.env.NODE_ENV !== 'production';
/** True for an https URL, or a loopback http URL during local development. */
export function isImageUrl(url: string) {
  return /^https:\/\//i.test(url) || (allowLoopbackHttp && /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?\//.test(url));
}
const imageUrl = z.url().refine(isImageUrl, 'Use an https:// URL');
export const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single hyphens').max(100);
export const kinds = ['services', 'posts', 'case-studies', 'reports', 'team'] as const;
export const kindSchema = z.enum(kinds);
/** Workflow states. `on_hold` and `approved` are editorial states that stay hidden from the public site like drafts. */
export const statusSchema = z.enum(['draft', 'in_review', 'on_hold', 'approved', 'scheduled', 'published', 'archived']);
/** States a Content Editor may save without publish permission. */
export const editorStatuses: readonly ContentStatus[] = ['draft', 'in_review', 'on_hold'];
export type ContentStatus = z.infer<typeof statusSchema>;

/** Public image reference with required alt text. */
export const imageSchema = z.object({ url: imageUrl, alt: short(200) }).strict();
export type ImageRef = z.infer<typeof imageSchema>;
const image = imageSchema.nullable().default(null);
const list = <T extends z.ZodType>(item: T, max: number) => z.array(item).max(max).default([]);
const tag = z.string().trim().toLowerCase().min(1).max(40);
const uniqueTags = (tags: string[]) => new Set(tags).size === tags.length;

const offering = z.object({ slug, title: text, description: text }).strict();
const service = offering.extend({ standards: z.array(text).max(30), subDomains: z.array(offering).max(100) })
  .refine((data) => new Set(data.subDomains.map((item) => item.slug)).size === data.subDomains.length, 'Duplicate sub-domain slugs');

const post = z.object({
  title: short(160), summary: short(500), cover_image: image,
  publish_date: z.iso.date('Use a valid date').nullable().default(null),
  content_markdown: text, category: short(60), tags: list(tag, 10).refine(uniqueTags, 'Tags must be unique'),
  author: optional(120).default(''), is_featured: z.boolean(),
  seo_title: optional(70).default(''), seo_description: optional(160).default(''),
}).strict();

/** Case-study testimonial shown as a person quote. */
export const testimonialSchema = z.object({ quote: short(500), name: short(120), designation: short(120), company: optional(120), photo: image }).strict();
/** Engagement item such as "Web Application Pentesting". */
export const engagementItemSchema = z.object({ title: short(120), description: optional(300) }).strict();
/** External review or reference link. */
export const reviewSchema = z.object({ name: short(120), url: https }).strict();
export const companySizes = ['1-10', '11-50', '51-200', '201-1000', '1000+'] as const;
// Not strict: records saved with the earlier four-part outline load and drop the retired keys on the next save.
const caseStudy = z.object({
  title: short(160), tagline: optional(200).default(''), cover_image: image,
  client_display_name: short(120), is_anonymized: z.boolean(),
  company_quote: optional(500).default(''), company_overview: optional(2000).default(''),
  company_address: optional(200).default(''), company_size: z.enum(companySizes).nullable().default(null),
  test_types: list(short(60), 12),
  requirement_markdown: optional(10000).default(''),
  requirement_points: list(short(300), 10),
  engagement_items: list(engagementItemSchema, 10),
  testimonials: list(testimonialSchema, 4),
  reviews: list(reviewSchema, 4),
}).superRefine((data, ctx) => {
  const need = (ok: boolean, path: string, message: string) => { if (!ok) ctx.addIssue({ code: 'custom', path: [path], message }); };
  need(data.tagline.length > 0, 'tagline', 'Required');
  need(data.company_overview.length > 0, 'company_overview', 'Required');
  need(data.requirement_markdown.length > 0, 'requirement_markdown', 'Required');
  need(data.requirement_points.length > 0, 'requirement_points', 'Add at least one requirement point');
  need(data.engagement_items.length > 0, 'engagement_items', 'Add at least one engagement item');
});

const report = z.object({ title: text, description: text, category: text, is_gated: z.boolean() }).strict();
/** Extra profile link such as GitHub or a personal site. */
export const profileLinkSchema = z.object({ label: short(40), url: https }).strict();
const team = z.object({
  title: short(120), designation: short(120), bio: text,
  image_url: imageUrl.nullable(), image_alt: optional(200).default(''), linkedin_url: https.nullable(),
  department: optional(80).default(''), certifications: list(short(40), 15), skills: list(short(40), 10),
  links: list(profileLinkSchema, 5), show_on_site: z.boolean().default(true),
  sort_order: z.number().int().nonnegative(),
}).strict();

const base = { slug, status: statusSchema, version: z.number().int().nonnegative() };
export const contentInput = z.discriminatedUnion('kind', [
  z.object({ ...base, kind: z.literal('services'), data: service }).strict(),
  z.object({ ...base, kind: z.literal('posts'), data: post }).strict(),
  z.object({ ...base, kind: z.literal('case-studies'), data: caseStudy }).strict(),
  z.object({ ...base, kind: z.literal('reports'), data: report }).strict(),
  z.object({ ...base, kind: z.literal('team'), data: team }).strict(),
]).refine((item) => item.kind !== 'services' || item.slug === item.data.slug, 'Domain slug must match record slug');
/** Validated CMS document; a version of zero creates a record. */
export type ContentInput = z.infer<typeof contentInput>;
/** Versioned CMS record and immutable audit snapshot contract. */
export type ContentRecord = ContentInput & { updatedAt: string };
export type ContentKind = z.infer<typeof kindSchema>;
export interface AuditEntry { id: string; actor: string; action: string; record: ContentRecord; createdAt: string }
