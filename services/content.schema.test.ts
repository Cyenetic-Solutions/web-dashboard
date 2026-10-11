import { describe, expect, it } from 'vitest';
import { contentInput } from './content.schema';

const caseStudy = (data: Record<string, unknown>) => ({ kind: 'case-studies', slug: 'fintech-app', status: 'draft', version: 1, data });
const complete = {
  title: 'Securing a fintech app', tagline: 'Web and Android testing before launch', cover_image: null, client_display_name: 'Tier-1 Asian Bank', is_anonymized: true,
  company_quote: '', company_overview: 'Regional digital bank.', company_address: 'Dhaka, Bangladesh', company_size: '201-1000', test_types: ['Web Application', 'Android'],
  requirement_markdown: 'They needed **independent** assurance.', requirement_points: ['Validating the security posture of their web & Android applications'],
  engagement_items: [{ title: 'Web Application Pentesting', description: '' }], testimonials: [], reviews: [{ name: 'Clutch', url: 'https://clutch.co/profile/cyenetic' }],
};

describe('case study contract', () => {
  it('accepts a complete case study', () => {
    expect(contentInput.safeParse(caseStudy(complete)).success).toBe(true);
  });
  it('requires tagline, overview, requirement text, at least one point and one engagement item', () => {
    const result = contentInput.safeParse(caseStudy({ ...complete, tagline: '', company_overview: '', requirement_markdown: '', requirement_points: [], engagement_items: [] }));
    expect(result.success).toBe(false);
    const paths = result.error?.issues.map((i) => i.path.join('.'));
    expect(paths).toEqual(expect.arrayContaining(['data.tagline', 'data.company_overview', 'data.requirement_markdown', 'data.requirement_points', 'data.engagement_items']));
  });
  it('caps people and reviews at four and only accepts https review links', () => {
    const person = { quote: 'Thorough work.', name: 'A. Rahman', designation: 'CISO', company: '', photo: null };
    expect(contentInput.safeParse(caseStudy({ ...complete, testimonials: Array(5).fill(person) })).success).toBe(false);
    expect(contentInput.safeParse(caseStudy({ ...complete, reviews: [{ name: 'Old', url: 'http://example.com' }] })).success).toBe(false);
  });
  it('loads a record saved with the earlier four-part outline and drops the retired keys', () => {
    const legacy = { title: 'Old', client_display_name: 'Moniker', is_anonymized: true, sector: 'Finance', engagement: 'e', challenge: 'c', scope: 's', outcome: 'o', findings: { Critical: 1, High: 0, Medium: 0, Low: 0 } };
    const parsed = contentInput.parse({ ...caseStudy(legacy), data: { ...legacy, tagline: 't', company_overview: 'o', requirement_markdown: 'r', requirement_points: ['p'], engagement_items: [{ title: 'Web', description: '' }] } });
    expect(parsed.data).not.toHaveProperty('challenge');
    expect(parsed.data).toMatchObject({ test_types: [], reviews: [], company_size: null });
  });
});

describe('post contract', () => {
  const post = { title: 'OAuth pitfalls', summary: 'What we keep finding', content_markdown: 'Body', category: 'Research', is_featured: false };
  it('fills defaults for posts saved before covers, tags and SEO existed', () => {
    const parsed = contentInput.parse({ kind: 'posts', slug: 'oauth', status: 'published', version: 3, data: post });
    expect(parsed.data).toMatchObject({ cover_image: null, publish_date: null, tags: [], author: '', seo_title: '' });
  });
  it('rejects duplicate tags, more than ten tags and a cover without alt text', () => {
    const parse = (data: Record<string, unknown>) => contentInput.safeParse({ kind: 'posts', slug: 'oauth', status: 'draft', version: 0, data: { ...post, ...data } }).success;
    expect(parse({ tags: ['oauth', 'OAuth'] })).toBe(false);
    expect(parse({ tags: Array.from({ length: 11 }, (_, i) => `t${i}`) })).toBe(false);
    expect(parse({ cover_image: { url: 'https://cdn.example.com/a.png', alt: '' } })).toBe(false);
    expect(parse({ cover_image: { url: 'https://cdn.example.com/a.png', alt: 'Diagram' }, publish_date: '2026-10-11' })).toBe(true);
  });
});
