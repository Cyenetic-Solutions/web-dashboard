/* eslint-disable @next/next/no-img-element -- previews show editor-supplied https URLs; next/image would need every host allow-listed. */
import type { ReactNode } from 'react';
import { Pill, type Tone } from '@/components/ui/Badge';
import type { Column } from '@/components/ui/DataList';
import { formatDate, label } from '@/components/format';
import type { ContentRecord } from '@/services/api';
import type { ContentStatus } from '@/services/content.schema';

/** Status pill tones shared by the list and editor. */
export const statusTones: Record<ContentStatus, Tone> = {
  draft: 'neutral', in_review: 'info', on_hold: 'warning', approved: 'accent', scheduled: 'warning', published: 'success', archived: 'subtle',
};

/** Everything a staff member might search a record by: title, slug and the kind's descriptive fields. */
export function searchText(r: ContentRecord) {
  const parts: (string | null | undefined)[] = [r.data.title, r.slug];
  switch (r.kind) {
    case 'posts': parts.push(r.data.summary, r.data.category, r.data.author, ...r.data.tags); break;
    case 'case-studies': parts.push(r.data.tagline, r.data.client_display_name, r.data.company_address, ...r.data.test_types, ...r.data.engagement_items.map((e) => e.title)); break;
    case 'team': parts.push(r.data.designation, r.data.department, ...r.data.skills, ...r.data.certifications); break;
    case 'services': parts.push(r.data.description, ...r.data.subDomains.map((s) => s.title)); break;
    case 'reports': parts.push(r.data.description, r.data.category); break;
  }
  return parts.filter(Boolean).join(' ').toLowerCase();
}

/** Thumbnail URL and alt text for kinds that carry an image. */
function thumb(r: ContentRecord) {
  if (r.kind === 'posts' || r.kind === 'case-studies') return r.data.cover_image;
  if (r.kind === 'team' && r.data.image_url) return { url: r.data.image_url, alt: r.data.image_alt };
  return null;
}

/** Secondary line under the title. */
function subtitle(r: ContentRecord) {
  switch (r.kind) {
    case 'posts': return [r.data.category, r.data.tags.slice(0, 3).map((t) => `#${t}`).join(' ')].filter(Boolean).join(' · ');
    case 'case-studies': return [r.data.tagline, r.data.test_types.join(', ')].filter(Boolean).join(' · ');
    case 'team': return [r.data.designation, r.data.department, r.data.show_on_site ? '' : 'hidden from site'].filter(Boolean).join(' · ');
    default: return '';
  }
}

function TitleCell({ r }: { r: ContentRecord }) {
  const image = thumb(r);
  const hasImage = r.kind === 'posts' || r.kind === 'case-studies' || r.kind === 'team';
  return <span className="flex min-w-0 items-center gap-3">
    {hasImage && <span className={`grid shrink-0 place-items-center overflow-hidden border border-line bg-surface-2 ${r.kind === 'team' ? 'size-10' : 'h-10 w-16'}`}>
      {image ? <img src={image.url} alt={image.alt} className="size-full object-cover" /> : <span aria-hidden="true" className="font-mono text-[10px] text-subtle">—</span>}</span>}
    <span className="min-w-0">
      <span className="block font-medium">{r.data.title}{r.kind === 'posts' && r.data.is_featured && <span className="ml-2 text-accent" aria-label="Featured">★</span>}</span>
      {subtitle(r) && <span className="block truncate text-xs text-muted">{subtitle(r)}</span>}
    </span>
  </span>;
}

/** List columns for a collection; `actions` renders the per-row buttons. */
export function columns(actions: (r: ContentRecord) => ReactNode): Column<ContentRecord>[] {
  return [
    { key: 'title', header: 'Title', primary: true, cell: (r) => <TitleCell r={r} /> },
    { key: 'status', header: 'Status', cell: (r) => <Pill tone={statusTones[r.status]}>{label(r.status)}</Pill> },
    { key: 'date', header: 'Date', mono: true, cell: (r) => r.kind === 'posts' && r.data.publish_date ? formatDate(`${r.data.publish_date}T12:00:00`) : formatDate(r.updatedAt, true) },
    { key: 'version', header: 'Version', mono: true, hideOnMobile: true, cell: (r) => `v${r.version}` },
    { key: 'action', header: 'Actions', cell: actions },
  ];
}
