"use client";
import { useMemo, useRef, useState } from 'react';
import Button from '@/components/ui/Button';
import ConfirmDialog from '@/components/ui/ConfirmDialog';
import DataList from '@/components/ui/DataList';
import { controlClass } from '@/components/ui/Field';
import PageHeader from '@/components/ui/PageHeader';
import { Async, EmptyState } from '@/components/ui/States';
import Tabs from '@/components/ui/Tabs';
import { label } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { useResource } from '@/providers/useResource';
import { listContent, saveContent, type ContentRecord } from '@/services/api';
import { editorStatuses, statusSchema, type ContentInput, type ContentKind, type ContentStatus } from '@/services/content.schema';
import { contentMeta, newDocument } from './content.data';
import { columns, searchText } from './contentList';
import ContentEditor from './ContentEditor';
import { ImageUploadProvider } from './ImageField';

type Filter = 'all' | ContentStatus;
/** Drops the server timestamp so a listed record can be edited or re-saved as input. */
function strip(record: ContentRecord): ContentInput { const { updatedAt, ...input } = record; void updatedAt; return input; }
const order = (r: ContentRecord) => (r.kind === 'team' ? r.data.sort_order : 0);

/** CMS collection: status tabs with counts, search, responsive list with edit/delete actions, team ordering and the product editor. */
export default function ContentFeature({ kind }: { kind: ContentKind }) {
  const { call, can } = useAuth();
  const meta = contentMeta[kind];
  const state = useResource((token, signal) => listContent(kind, token, signal), kind);
  const [editing, setEditing] = useState<{ input: ContentInput; updatedAt?: string; id: number } | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [q, setQ] = useState('');
  const [deleting, setDeleting] = useState<ContentRecord | null>(null);
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const seq = useRef(0);
  const canEdit = can('content:write');
  const canPublish = can('content:publish');
  const editable = (r: ContentRecord) => canEdit && (canPublish || editorStatuses.includes(r.status));
  async function save(input: ContentInput) {
    const saved = await call((token) => saveContent(input, token));
    state.setData((items) => [...(items ?? []).filter((item) => item.slug !== saved.slug), saved]);
    return saved;
  }
  const records = useMemo(() => state.data ?? [], [state.data]);
  const counts = useMemo(() => Object.fromEntries(statusSchema.options.map((s) => [s, records.filter((r) => r.status === s).length])), [records]);
  const needle = q.trim().toLowerCase();
  const rows = records.filter((r) => (filter === 'all' || r.status === filter) && (!needle || searchText(r).includes(needle)))
    .sort((a, b) => (kind === 'team' ? order(a) - order(b) || a.data.title.localeCompare(b.data.title) : b.updatedAt.localeCompare(a.updatedAt)));
  const reorderable = kind === 'team' && canPublish && filter === 'all' && !needle;
  const open = (input: ContentInput, updatedAt?: string) => setEditing({ input, updatedAt, id: ++seq.current });

  async function remove(record: ContentRecord) {
    setBusy(true); setProblem('');
    try { await save({ ...strip(record), status: 'archived' }); setDeleting(null); }
    catch (err) { setProblem(err instanceof Error ? err.message : 'Delete failed'); }
    finally { setBusy(false); }
  }
  /** Swaps a team member with its neighbour, renumbering in steps of ten and saving only records whose position changed. */
  async function move(index: number, dir: -1 | 1) {
    const next = [...rows]; [next[index], next[index + dir]] = [next[index + dir], next[index]];
    const changed = next.flatMap((r, i): ContentInput[] => {
      if (r.kind !== 'team' || r.data.sort_order === i * 10) return [];
      const { updatedAt, ...input } = r; void updatedAt;
      return [{ ...input, data: { ...input.data, sort_order: i * 10 } }];
    });
    setBusy(true); setProblem('');
    try { for (const input of changed) await save(input); }
    catch (err) { setProblem(err instanceof Error ? `Reorder stopped: ${err.message}` : 'Reorder failed'); }
    finally { setBusy(false); }
  }

  if (editing) return <ImageUploadProvider>
    <PageHeader eyebrow={`Content Studio / ${meta.title}`} title={editing.input.version ? `Edit ${meta.singular}` : `New ${meta.singular}`} description={<span className="font-mono">{editing.input.slug}</span>} />
    <ContentEditor key={editing.id} initial={editing.input} updatedAt={editing.updatedAt} canPublish={canPublish} onSave={save} onClose={() => setEditing(null)} />
  </ImageUploadProvider>;

  const actions = (r: ContentRecord) => {
    const index = rows.indexOf(r);
    return <span className="flex flex-wrap items-center gap-1">
      {editable(r) ? <Button size="sm" variant="secondary" onClick={() => open(strip(r), r.updatedAt)} aria-label={`Edit ${r.data.title}`}>Edit</Button> : <span className="text-xs text-subtle">Read only</span>}
      {canPublish && r.status !== 'archived' && <Button size="sm" variant="danger" onClick={() => { setProblem(''); setDeleting(r); }} aria-label={`Delete ${r.data.title}`}>Delete</Button>}
      {reorderable && <>
        <Button size="sm" variant="ghost" disabled={busy || index === 0} onClick={() => void move(index, -1)} aria-label={`Move ${r.data.title} up`}>↑</Button>
        <Button size="sm" variant="ghost" disabled={busy || index === rows.length - 1} onClick={() => void move(index, 1)} aria-label={`Move ${r.data.title} down`}>↓</Button>
      </>}
    </span>;
  };
  return <>
    <PageHeader eyebrow="Content Studio" title={meta.title} description={meta.description}
      actions={canEdit && <Button onClick={() => open(newDocument(kind))}>New {meta.singular}</Button>} />
    <div className="mb-4 flex flex-col gap-3 md:flex-row md:items-end">
      <div className="min-w-0 flex-1"><Tabs label="Filter by status" value={filter} onChange={setFilter}
        tabs={[{ value: 'all', label: `All ${records.length}` }, ...statusSchema.options.filter((s) => counts[s] || editorStatuses.includes(s) || s === 'published' || s === 'archived')
          .map((s) => ({ value: s, label: `${label(s)} ${counts[s] ?? 0}` }))]} /></div>
      <input type="search" aria-label={`Search ${meta.title}`} placeholder={`Search ${meta.title.toLowerCase()}`} value={q} onChange={(e) => setQ(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Escape') setQ(''); }} className={`${controlClass} md:w-72`} />
    </div>
    {kind === 'team' && canPublish && !reorderable && records.length > 1 && <p className="mb-3 text-xs text-muted">Clear the search and pick “All” to reorder team members.</p>}
    {problem && !deleting && <p role="alert" className="mb-3 text-sm text-danger">{problem}</p>}
    <Async state={state} module={meta.title}>{() => rows.length ? <DataList label={meta.title} rows={rows} rowKey={(r) => r.slug}
      onSelect={(r) => { if (editable(r)) open(strip(r), r.updatedAt); }} columns={columns(actions)} />
      : <EmptyState title={records.length ? 'No records match' : `No ${meta.title.toLowerCase()} yet`} action={canEdit && !records.length ? <Button onClick={() => open(newDocument(kind))}>Create the first {meta.singular}</Button> : undefined}>
        {records.length ? 'Try another status or search.' : 'Records you create are saved as versioned drafts.'}</EmptyState>}</Async>
    <ConfirmDialog open={!!deleting} title={`Delete this ${meta.singular}?`} confirmLabel="Delete" pending={busy} error={problem}
      typeToConfirm={deleting?.status === 'published' ? deleting.data.title : undefined}
      onCancel={() => setDeleting(null)} onConfirm={() => { if (deleting) void remove(deleting); }}>
      <p><span className="font-medium text-ink">{deleting?.data.title}</span> will be removed from the public site and moved to Archived. Its version history and audit trail are kept, and you can restore it from the Archived tab by editing its status.</p>
    </ConfirmDialog>
  </>;
}
