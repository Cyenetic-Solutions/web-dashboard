"use client";
import { useEffect, useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import { Input, Select } from '@/components/ui/Field';
import { formatDate, label } from '@/components/format';
import { ApiError } from '@/services/http';
import { contentInput, editorStatuses, statusSchema, type ContentInput } from '@/services/content.schema';
import type { ContentRecord } from '@/services/api';
import KindForm from './KindForm';

/** Two-column CMS editor: product form left, publication settings right; validates before saving and keeps the optimistic version. */
export default function ContentEditor({ initial, canPublish, onSave, onClose, updatedAt }: {
  initial: ContentInput; canPublish: boolean; onSave: (value: ContentInput) => Promise<ContentRecord>; onClose?: () => void; updatedAt?: string;
}) {
  const [input, setInput] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(updatedAt);
  useEffect(() => { if (!dirty) return; const warn = (e: BeforeUnloadEvent) => e.preventDefault(); window.addEventListener('beforeunload', warn); return () => window.removeEventListener('beforeunload', warn); }, [dirty]);
  function change(next: ContentInput) { setInput(next); setDirty(true); }
  function setSlug(slug: string) { change(input.kind === 'services' ? { ...input, slug, data: { ...input.data, slug } } : { ...input, slug }); }

  async function submit(event?: FormEvent) {
    event?.preventDefault(); setMessage(null);
    const parsed = contentInput.safeParse(input);
    if (!parsed.success) {
      setErrors(Object.fromEntries(parsed.error.issues.map((i) => [i.path.filter((p) => p !== 'data').join('.') || 'form', i.message])));
      setMessage({ ok: false, text: `Fix the highlighted fields before saving (${parsed.error.issues.length}).` }); return;
    }
    setErrors({}); setPending(true);
    try {
      const record = await onSave(parsed.data);
      setInput((current) => ({ ...current, version: record.version, status: record.status }));
      setSaved(record.updatedAt); setDirty(false); setMessage({ ok: true, text: `Saved version ${record.version} · ${label(record.status)}` });
    } catch (error) {
      if (error instanceof ApiError && error.status === 409) setMessage({ ok: false, text: 'Someone saved a newer version. Reload the record before saving again.' });
      else { if (error instanceof ApiError) setErrors(Object.fromEntries(Object.entries(error.fieldErrors).map(([k, v]) => [k, v[0] ?? 'Invalid']))); setMessage({ ok: false, text: error instanceof Error ? error.message : 'Save failed' }); }
    } finally { setPending(false); }
  }
  useEffect(() => {
    const key = (e: KeyboardEvent) => { if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 's') { e.preventDefault(); void submit(); } };
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  });
  const statuses = statusSchema.options.filter((s) => canPublish || editorStatuses.includes(s) || s === input.status);
  return <form onSubmit={submit} noValidate className="grid gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)]">
    <fieldset disabled={pending} className="min-w-0 border border-line bg-surface p-4 sm:p-6"><legend className="sr-only">Content</legend><KindForm input={input} onChange={change} errors={errors} /></fieldset>
    <aside className="space-y-4 lg:sticky lg:top-20 lg:self-start">
      <fieldset disabled={pending} className="space-y-4 border border-line bg-surface p-4 sm:p-5"><legend className="cye-label float-left mb-2 text-muted">Publication</legend>
        <Input label="Slug" required className="font-mono" readOnly={input.version > 0} value={input.slug} onChange={(e) => setSlug(e.target.value)} error={errors.slug ?? errors.form}
          hint={input.version > 0 ? 'Slugs are locked after the first save.' : 'Lowercase letters, numbers and hyphens.'} wrapperClass="clear-both" />
        <Select label="Publication status" value={input.status} onChange={(e) => change({ ...input, status: statusSchema.parse(e.target.value) })}
          options={statuses.map((s) => ({ value: s, label: label(s) }))} hint={canPublish ? 'Only Published is public. On hold, Approved and Scheduled stay hidden; no scheduler runs yet.' : 'Content Editors save drafts, put them on hold or send them for review.'} />
        <dl className="grid grid-cols-2 gap-3 border-t border-line pt-4 text-xs"><div><dt className="cye-label text-subtle">Version</dt><dd className="mt-1 font-mono">v{input.version}</dd></div>
          <div><dt className="cye-label text-subtle">Last saved</dt><dd className="mt-1 font-mono">{formatDate(saved, true)}</dd></div></dl>
        <Button type="submit" size="lg" loading={pending} className="w-full">Save record</Button>
        {onClose && <Button type="button" variant="ghost" onClick={() => { if (!dirty || window.confirm('Discard unsaved changes?')) onClose(); }} className="w-full">Back to list</Button>}
        <p role="status" className={`min-h-5 text-sm ${message?.ok ? 'text-success' : 'text-danger'}`}>{message?.text}</p>
        <p className="font-mono text-[11px] text-subtle">{dirty ? '● Unsaved changes' : '○ No unsaved changes'} · {label(input.kind)} · Ctrl/⌘ S</p>
      </fieldset>
    </aside>
  </form>;
}
