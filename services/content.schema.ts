import { z } from 'zod';

const text = z.string().trim().min(1).max(10000);
export const slug = z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(100);
export const kinds = ['services', 'posts', 'case-studies', 'reports', 'team'] as const;
export const kindSchema = z.enum(kinds);
export const statusSchema = z.enum(['draft', 'in_review', 'scheduled', 'published', 'archived']);
const offering = z.object({ slug, title: text, description: text }).strict();
const service = offering.extend({ standards: z.array(text).max(30), subDomains: z.array(offering).max(100) })
  .refine((data) => new Set(data.subDomains.map((item) => item.slug)).size === data.subDomains.length, 'Duplicate sub-domain slugs');
const post = z.object({ title: text, summary: text, content_markdown: text, category: text, is_featured: z.boolean() }).strict();
const caseStudy = z.object({ title: text, client_display_name: text, is_anonymized: z.boolean(), sector: text,
  engagement: text, challenge: text, scope: text, outcome: text,
  findings: z.object({ Critical: z.number().int().nonnegative(), High: z.number().int().nonnegative(),
    Medium: z.number().int().nonnegative(), Low: z.number().int().nonnegative() }).strict() }).strict();
const report = z.object({ title: text, description: text, category: text, is_gated: z.boolean() }).strict();
const team = z.object({ title: text, designation: text, bio: text,
  image_url: z.url().startsWith('https://').nullable(), linkedin_url: z.url().startsWith('https://').nullable(),
  sort_order: z.number().int().nonnegative() }).strict();
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
