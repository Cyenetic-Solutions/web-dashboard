import type { ContentInput, ContentKind } from '@/services/content.schema';
/** Editable starter payloads mirror the backend contracts; no fabricated records are persisted. */
export function newDocument(kind: ContentKind): ContentInput {
  const base = { slug: 'new-record', status: 'draft', version: 0 } as const;
  switch (kind) {
    case 'services': return { ...base, kind, data: { slug: 'new-record', title: 'New domain', description: 'Describe this domain', standards: ['PTES'], subDomains: [] } };
    case 'posts': return { ...base, kind, data: { title: 'New article', summary: 'Article subtitle', cover_image: null, publish_date: null, content_markdown: 'Write the article here',
      category: 'Research', tags: [], author: '', is_featured: false, seo_title: '', seo_description: '' } };
    case 'case-studies': return { ...base, kind, data: { title: 'New case study', tagline: '', cover_image: null, client_display_name: 'Approved moniker', is_anonymized: true,
      company_quote: '', company_overview: '', company_address: '', company_size: null, test_types: [], requirement_markdown: '',
      requirement_points: [''], engagement_items: [], testimonials: [], reviews: [] } };
    case 'reports': return { ...base, kind, data: { title: 'New report', description: 'Report description', category: 'Research', is_gated: true } };
    case 'team': return { ...base, kind, data: { title: 'Full name', designation: 'Role', bio: 'Biography', image_url: null, image_alt: '', linkedin_url: null,
      department: '', certifications: [], skills: [], links: [], show_on_site: true, sort_order: 0 } };
  }
}

/** Display copy for each CMS collection. */
export const contentMeta: Record<ContentKind, { title: string; singular: string; description: string }> = {
  posts: { title: 'Blog', singular: 'post', description: 'Articles, writeups and advisories. At most two published posts can be featured.' },
  'case-studies': { title: 'Case studies', singular: 'case study', description: 'Client stories: company profile, requirements, engagement, person quotes and review links.' },
  reports: { title: 'Reports & insights', singular: 'report', description: 'Whitepapers, pentest guides and checklists with download gates.' },
  team: { title: 'Team', singular: 'team member', description: 'Profiles shown on the public site, in the order listed here.' },
  services: { title: 'Service domains', singular: 'domain', description: 'Editable service catalog. Domains and sub-domains are records, so no fixed count and no deploy is needed.' },
};
