"use client";
import { useMemo, useState } from 'react';
import Button from '@/components/ui/Button';
import { Pill, type Tone } from '@/components/ui/Badge';
import DataList from '@/components/ui/DataList';
import { controlClass } from '@/components/ui/Field';
import PageHeader from '@/components/ui/PageHeader';
import { Async, EmptyState } from '@/components/ui/States';
import Tabs from '@/components/ui/Tabs';
import { formatDate } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { useResource } from '@/providers/useResource';
import { listContent, saveContent, type ContentRecord } from '@/services/api';
import { statusSchema, type ContentInput, type ContentKind } from '@/services/content.schema';
import { contentMeta, newDocument } from './content.data';
import ContentEditor from './ContentEditor';

const tones: Record<ContentInput['status'], Tone> = { draft: 'neutral', in_review: 'info', scheduled: 'warning', published: 'success', archived: 'subtle' };
type Filter = 'all' | ContentInput['status'];

/** CMS collection: status tabs with counts, search, responsive list and the product editor. */
export default function ContentFeature({ kind }: { kind: ContentKind }) {
  const { call, can } = useAuth();
  const meta = contentMeta[kind];
  const state = useResource((token, signal) => listContent(kind, token, signal), kind);
  const [editing, setEditing] = useState<{ input: ContentInput; updatedAt?: string; id: number } | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const canEdit = can('content:write');
  const canPublish = can('content:publish');
  const editable = (r: ContentRecord) => canEdit && (canPublish || r.status === 'draft' || r.status === 'in_review');
  async function save(input: ContentInput) {
    const saved = await call((token) => saveContent(input, token));
    state.setData((items) => [...(items ?? []).filter((item) => item.slug !== saved.slug), saved]);
    return saved;
  }
  const records = useMemo(() => state.data ?? [], [state.data]);
  const counts = useMemo(() => Object.fromEntries(statusSchema.options.map((s) => [s, records.filter((r) => r.status === s).length])), [records]);
  const rows = records.filter((r) => (filter === 'all' || r.status === filter) && `${r.data.title} ${r.slug}`.toLowerCase().includes(q.toLowerCase()))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const open = (input: ContentInput, updatedAt?: string) => setEditing({ input, updatedAt, id: Date.now() });

  if (editing) return <>
    <PageHeader eyebrow={`Content Studio / ${meta.title}`} title={editing.input.version ? `Edit ${meta.singular}` : `New ${meta.singular}`} description={<span className="font-mono">{editing.input.slug}</span>} />
    <ContentEditor key={editing.id} initial={editing.input} updatedAt={editing.updatedAt} canPublish={canPublish} onSave={save} onClose={() => setEditing(null)} />
  </>;
  return <>
    <PageHeader eyebrow="Content Studio" title={meta.title} description={meta.description}
      actions={canEdit && <Button onClick={() => open(newDocument(kind))}>New {meta.singular}</Button>} />
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
      <div className="min-w-0 flex-1"><Tabs label="Filter by status" value={filter} onChange={setFilter}
        tabs={[{ value: 'all', label: `All ${records.length}` }, ...statusSchema.options.map((s) => ({ value: s, label: `${s.replace('_', ' ')} ${counts[s] ?? 0}` }))]} /></div>
      <input type="search" aria-label={`Search ${meta.title}`} placeholder="Search title or slug" value={q} onChange={(e) => setQ(e.target.value)} className={`${controlClass} md:w-64`} />
    </div>
    <Async state={state} module={meta.title}>{() => rows.length ? <DataList label={meta.title} rows={rows} rowKey={(r) => r.slug}
      onSelect={(r) => { if (editable(r)) open(r, r.updatedAt); }}
      columns={[
        { key: 'title', header: 'Title', primary: true, cell: (r) => <span className="font-medium">{r.data.title}{r.kind === 'posts' && r.data.is_featured && <span className="ml-2 text-accent" aria-label="Featured">★</span>}</span> },
        { key: 'status', header: 'Status', cell: (r) => <Pill tone={tones[r.status]}>{r.status.replace('_', ' ')}</Pill> },
        { key: 'slug', header: 'Slug', mono: true, cell: (r) => r.slug },
        { key: 'version', header: 'Version', mono: true, cell: (r) => `v${r.version}` },
        { key: 'updated', header: 'Updated', mono: true, cell: (r) => formatDate(r.updatedAt, true) },
        { key: 'action', header: 'Action', hideOnMobile: true, cell: (r) => editable(r) ? <button type="button" onClick={() => open(r, r.updatedAt)} className="min-h-9 font-mono text-xs uppercase text-accent-strong">Edit {r.slug} →</button> : <span className="text-xs text-subtle">Read only</span> },
      ]} />
      : <EmptyState title={records.length ? 'No records match' : `No ${meta.title.toLowerCase()} yet`} action={canEdit && !records.length ? <Button onClick={() => open(newDocument(kind))}>Create the first {meta.singular}</Button> : undefined}>
        {records.length ? 'Try another status or search.' : 'Records you create are saved as versioned drafts.'}</EmptyState>}</Async>
  </>;
}
