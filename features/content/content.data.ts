import type { ContentInput, ContentKind } from '@/services/content.schema';
/** Editable starter payloads mirror the backend contracts; no fabricated records are persisted. */
export function newDocument(kind: ContentKind): ContentInput {
  const base = { slug: 'new-record', status: 'draft', version: 0 } as const;
  switch (kind) {
    case 'services': return { ...base, kind, data: { slug: 'new-record', title: 'New domain', description: 'Describe this domain', standards: ['PTES'], subDomains: [] } };
    case 'posts': return { ...base, kind, data: { title: 'New article', summary: 'Article summary', content_markdown: 'Write the article here', category: 'Research', is_featured: false } };
    case 'case-studies': return { ...base, kind, data: { title: 'New case study', client_display_name: 'Approved moniker', is_anonymized: true, sector: 'Technology', engagement: 'Engagement', challenge: 'Challenge', scope: 'Scope', outcome: 'Outcome', findings: { Critical: 0, High: 0, Medium: 0, Low: 0 } } };
    case 'reports': return { ...base, kind, data: { title: 'New report', description: 'Report description', category: 'Research', is_gated: true } };
    case 'team': return { ...base, kind, data: { title: 'Full name', designation: 'Role', bio: 'Biography', image_url: null, linkedin_url: null, sort_order: 0 } };
  }
}
