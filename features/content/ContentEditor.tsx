"use client";
import { useState, type FormEvent } from 'react';
import { contentInput, statusSchema, type ContentInput } from '@/services/content.schema';
import type { ContentRecord } from '@/services/api';
const control = 'mt-2 w-full rounded-none border border-white/20 bg-neutral-900 p-3 font-mono text-sm focus:border-cye-orange';

/** Technical CMS editor preserves typed payloads, version, and save failure feedback. */
export default function ContentEditor({ initial, canPublish, onSave }: {
  initial: ContentInput; canPublish: boolean; onSave: (value: ContentInput) => Promise<ContentRecord>;
}) {
  const [slug, setSlug] = useState(initial.slug);
  const [status, setStatus] = useState(initial.status);
  const [data, setData] = useState(JSON.stringify(initial.data, null, 2));
  const [version, setVersion] = useState(initial.version);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setMessage('');
    try {
      const payload: unknown = JSON.parse(data);
      const value = contentInput.parse({ kind: initial.kind, slug, status, version, data: payload });
      const saved = await onSave(value); setVersion(saved.version); setMessage(`Saved version ${saved.version} · ${saved.status}`);
    } catch (error) { setMessage(error instanceof Error ? error.message : 'Save failed'); }
    finally { setPending(false); }
  }
  return <form onSubmit={submit} className="space-y-5 border border-white/20 p-6"><h2 className="font-display text-3xl uppercase">Edit record</h2><fieldset disabled={pending} className="space-y-5">
    <label className="block">Slug<input required pattern="[a-z0-9]+(-[a-z0-9]+)*" readOnly={version > 0} value={slug} onChange={(e) => setSlug(e.target.value)} className={control} /></label>
    <label className="block">Publication status<select value={status} onChange={(e) => setStatus(statusSchema.parse(e.target.value))} className={control}>{statusSchema.options.filter((value) => canPublish || ['draft', 'in_review'].includes(value)).map((value) => <option key={value}>{value}</option>)}</select></label>
    <label className="block">Record data (JSON)<textarea rows={18} spellCheck={false} value={data} onChange={(e) => setData(e.target.value)} className={control} /></label>
    <p className="text-sm text-white/60">Service payload slug must match the record slug. Changes require the current version; reload if another editor has saved first. Scheduled records remain hidden until explicitly published.</p>
    <button className="min-h-12 bg-cye-orange px-6 font-mono text-xs uppercase text-black disabled:opacity-50" disabled={pending}>{pending ? 'Saving…' : 'Save record'}</button>
  </fieldset><p role="status" className="whitespace-pre-wrap break-words text-sm text-cye-orange">{message}</p></form>;
}
