"use client";
import { useEffect, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { listContent, saveContent, ApiError, type ContentRecord } from '@/services/api';
import type { ContentInput, ContentKind } from '@/services/content.schema';
import { newDocument } from './content.data';
import ContentEditor from './ContentEditor';

/** Authenticated CMS list and editor; requests are cancelled when the session changes. */
export default function ContentFeature({ kind }: { kind: ContentKind }) {
  const { token, session, signOut } = useAuth();
  const [records, setRecords] = useState<ContentRecord[]>([]);
  const [selected, setSelected] = useState<ContentInput | null>(null);
  const [selectionId, setSelectionId] = useState(0);
  function select(input: ContentInput) { setSelected(input); setSelectionId((value) => value + 1); }
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [reload, setReload] = useState(0);
  useEffect(() => {
    if (!token) return;
    const controller = new AbortController();
    listContent(kind, token, controller.signal).then(setRecords).catch((error) => {
      if (!controller.signal.aborted) setError(error instanceof Error ? error.message : 'Unable to load records');
    }).finally(() => { if (!controller.signal.aborted) setLoading(false); });
    return () => controller.abort();
  }, [kind, token, reload]);
  const canEdit = session?.role === 'Super Admin' || session?.role === 'Content Editor';
  async function save(input: ContentInput) {
    if (!token) throw new Error('Session expired');
    try {
      const saved = await saveContent(input, token);
      setRecords((items) => [...items.filter((item) => item.slug !== saved.slug), saved]);
      return saved;
    } catch (error) { if (error instanceof ApiError && error.status === 401) signOut(); throw error; }
  }
  return <><div className="mb-8 flex flex-wrap items-center justify-between gap-4"><h1 className="font-display text-4xl uppercase">{kind.replace('-', ' ')}</h1>{canEdit && <button onClick={() => select(newDocument(kind))} className="min-h-12 border border-cye-orange px-5 font-mono text-xs uppercase text-cye-orange">New record</button>}</div>
    {loading && <p role="status">Loading…</p>}{error && <div role="alert"><p>{error}</p><button onClick={() => { setError(''); setReload(reload + 1); }}>Retry</button></div>}
    <div className="grid gap-6 xl:grid-cols-[1fr_1.2fr]"><section aria-label="Content records" className="space-y-3">{!loading && !error && records.length === 0 && <p className="border border-white/20 p-6 text-white/60">No records yet. Create a draft to get started.</p>}{records.map((item) => <article key={item.slug} className="border border-white/20 p-5"><h2 className="font-display text-2xl uppercase">{item.data.title}</h2><p className="my-3 font-mono text-xs text-white/60">{item.slug} · {item.status} · v{item.version}</p>{canEdit && (session?.role === 'Super Admin' || ['draft', 'in_review'].includes(item.status)) && <button onClick={() => select(item)} className="min-h-11 text-cye-orange">Edit {item.slug} →</button>}</article>)}</section>
    {selected && <ContentEditor key={selectionId} initial={selected} canPublish={session?.role === 'Super Admin'} onSave={save} />}</div></>;
}
