"use client";
import { useState } from 'react';
import { Pill } from '@/components/ui/Badge';
import Drawer from '@/components/ui/Drawer';
import { controlClass } from '@/components/ui/Field';
import PageHeader from '@/components/ui/PageHeader';
import { Async, EmptyState } from '@/components/ui/States';
import { fileSize, formatDate } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { useResource } from '@/providers/useResource';
import { listMedia, type MediaAsset } from '@/services/media';
import MediaDetail from './MediaDetail';
import MediaUpload from './MediaUpload';

/** Media library grid with bucket filter, search, upload and a detail drawer. */
export default function MediaFeature() {
  const { can } = useAuth();
  const [bucket, setBucket] = useState('');
  const [q, setQ] = useState('');
  const [selected, setSelected] = useState<MediaAsset | null>(null);
  const state = useResource((token, signal) => listMedia(token, signal, { bucket, q }), `${bucket}|${q}`);
  return <>
    <PageHeader eyebrow="Content Studio" title="Media library" description="Every uploaded file with its checksum, bucket and scan status. Private files open through 15-minute signed links."
      actions={can('media:write') && <MediaUpload onUploaded={(asset) => state.setData((items) => [asset, ...(items ?? [])])} />} />
    <div className="mb-4 grid gap-3 sm:grid-cols-[200px_1fr]">
      <select aria-label="Bucket" value={bucket} onChange={(e) => setBucket(e.target.value)} className={controlClass}>
        <option value="">All buckets</option><option value="PUBLIC">Public</option><option value="PRIVATE">Private</option><option value="QUARANTINE">Quarantine</option></select>
      <input type="search" aria-label="Search files" placeholder="Search by file name" value={q} onChange={(e) => setQ(e.target.value)} className={controlClass} />
    </div>
    <Async state={state} module="Media library">{(items) => items.length ? <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
      {items.map((m) => <li key={m.id}><button type="button" onClick={() => setSelected(m)} className="block w-full border border-line bg-surface text-left hover:border-accent">
        <span className="grid aspect-[4/3] place-items-center border-b border-line bg-surface-2 font-mono text-xs uppercase text-muted">{m.mimeType.split('/')[1] ?? 'file'}</span>
        <span className="block p-3"><span className="block truncate text-sm">{m.originalName}</span>
          <span className="mt-1 flex items-center justify-between gap-2 font-mono text-[11px] text-subtle"><span>{fileSize(m.sizeBytes)}</span><span>{formatDate(m.createdAt)}</span></span>
          <span className="mt-2 block"><Pill tone={m.bucket === 'PRIVATE' ? 'warning' : m.bucket === 'QUARANTINE' ? 'danger' : 'neutral'}>{m.bucket.toLowerCase()}</Pill></span></span>
      </button></li>)}</ul>
      : <EmptyState title="No files yet">Uploaded covers, team photos, report PDFs and finding evidence appear here.</EmptyState>}</Async>
    <Drawer open={!!selected} onClose={() => setSelected(null)} title={selected?.originalName ?? 'File'}>{selected && <MediaDetail asset={selected} onUpdated={(a) => { setSelected(a); state.setData((items) => items?.map((i) => (i.id === a.id ? a : i))); }} />}</Drawer>
  </>;
}
