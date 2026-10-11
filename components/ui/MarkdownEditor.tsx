"use client";
import { useRef, useState, type ClipboardEvent, type DragEvent, type KeyboardEvent } from 'react';
import Markdown from '../Markdown';
import { Field, controlClass } from './Field';

type Edit = { before: string; after?: string; placeholder?: string; line?: boolean };
const tools: readonly (Edit & { label: string; icon: string; key?: string })[] = [
  { label: 'Bold', icon: 'B', before: '**', after: '**', placeholder: 'bold text', key: 'b' },
  { label: 'Italic', icon: 'I', before: '_', after: '_', placeholder: 'italic text', key: 'i' },
  { label: 'Strikethrough', icon: 'S', before: '~~', after: '~~', placeholder: 'struck text' },
  { label: 'Heading', icon: 'H2', before: '## ', line: true, placeholder: 'Heading' },
  { label: 'Subheading', icon: 'H3', before: '### ', line: true, placeholder: 'Subheading' },
  { label: 'Quote', icon: '❝', before: '> ', line: true, placeholder: 'Quote' },
  { label: 'Bulleted list', icon: '•', before: '- ', line: true, placeholder: 'List item' },
  { label: 'Numbered list', icon: '1.', before: '1. ', line: true, placeholder: 'List item' },
  { label: 'Inline code', icon: '</>', before: '`', after: '`', placeholder: 'code' },
  { label: 'Code block', icon: '{ }', before: '\n```\n', after: '\n```\n', placeholder: 'code' },
  { label: 'Link', icon: '🔗', before: '[', after: '](https://)', placeholder: 'link text', key: 'k' },
  { label: 'Divider', icon: '—', before: '\n---\n', line: true },
];

/** Result of an image upload: the public URL and the alt text to embed. */
export interface UploadedImage { url: string; alt: string }

/**
 * Markdown writing surface with a formatting toolbar, keyboard shortcuts (Ctrl/⌘ B, I, K), image insert by upload,
 * paste or drop, Write/Preview modes and word count. Stores plain Markdown.
 */
export default function MarkdownEditor({ label, value, onChange, error, hint, required, rows = 18, onImage }: {
  label: string; value: string; onChange: (value: string) => void; error?: string; hint?: string; required?: boolean; rows?: number;
  onImage?: (file: File) => Promise<UploadedImage>;
}) {
  const area = useRef<HTMLTextAreaElement>(null);
  const picker = useRef<HTMLInputElement>(null);
  const [mode, setMode] = useState<'write' | 'preview'>('write');
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const words = value.trim().split(/\s+/).filter(Boolean).length;

  function apply({ before, after = '', placeholder = '', line }: Edit) {
    const el = area.current; if (!el) return;
    let start = el.selectionStart;
    const end = el.selectionEnd;
    if (line) { while (start > 0 && value[start - 1] !== '\n') start--; }
    const picked = value.slice(start, end) || placeholder;
    const body = line ? picked.split('\n').map((l) => before + l).join('\n') : before + picked + after;
    onChange(value.slice(0, start) + body + value.slice(end));
    requestAnimationFrame(() => { el.focus(); const from = start + before.length; el.setSelectionRange(from, from + picked.length); });
  }
  function insert(snippet: string) {
    const el = area.current; const at = el ? el.selectionEnd : value.length;
    const pad = at > 0 && value[at - 1] !== '\n' ? '\n\n' : '';
    onChange(value.slice(0, at) + pad + snippet + '\n' + value.slice(at));
  }
  async function upload(file: File) {
    if (!onImage) return;
    setProblem(''); setBusy(true);
    try { const image = await onImage(file); insert(`![${image.alt.replace(/[[\]]/g, '')}](${image.url})`); }
    catch (err) { setProblem(err instanceof Error ? err.message : 'Image upload failed'); }
    finally { setBusy(false); if (picker.current) picker.current.value = ''; }
  }
  function key(event: KeyboardEvent<HTMLTextAreaElement>) {
    if (!(event.metaKey || event.ctrlKey)) return;
    const tool = tools.find((t) => t.key === event.key.toLowerCase());
    if (tool) { event.preventDefault(); apply(tool); }
  }
  const imageFrom = (files: FileList | null) => Array.from(files ?? []).find((f) => f.type.startsWith('image/'));
  function paste(event: ClipboardEvent<HTMLTextAreaElement>) { const file = imageFrom(event.clipboardData.files); if (file && onImage) { event.preventDefault(); void upload(file); } }
  function drop(event: DragEvent<HTMLTextAreaElement>) { const file = imageFrom(event.dataTransfer.files); if (file && onImage) { event.preventDefault(); void upload(file); } }

  const tab = (value: 'write' | 'preview', text: string) => <button type="button" role="tab" aria-selected={mode === value} onClick={() => setMode(value)}
    className="min-h-9 px-3 font-mono text-[11px] uppercase tracking-wider text-muted aria-selected:bg-accent aria-selected:text-cye-black">{text}</button>;
  const status = `${words} words · about ${Math.max(1, Math.round(words / 200))} min read${busy ? ' · uploading image…' : ''}`;
  return <Field label={label} required={required} error={error ?? (problem || undefined)} hint={<span className="font-mono">{hint ? `${hint} · ` : ''}{status}</span>}>{(id, d) => <div className="border border-line focus-within:border-accent">
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line bg-surface-2 p-1">
      <div role="toolbar" aria-label={`${label} formatting`} className="flex flex-wrap gap-0.5">
        {tools.map((t) => <button key={t.label} type="button" title={t.key ? `${t.label} (Ctrl/⌘ ${t.key.toUpperCase()})` : t.label} aria-label={t.label} disabled={mode === 'preview'}
          onClick={() => apply(t)} className="grid min-h-9 min-w-9 place-items-center px-1.5 font-mono text-xs hover:bg-surface-3 hover:text-accent-strong disabled:opacity-40">{t.icon}</button>)}
        {onImage && <button type="button" aria-label="Insert image" title="Insert image (or paste / drop one)" disabled={mode === 'preview' || busy}
          onClick={() => picker.current?.click()} className="grid min-h-9 place-items-center px-2 font-mono text-xs hover:bg-surface-3 hover:text-accent-strong disabled:opacity-40">▣ Image</button>}
        {onImage && <input ref={picker} type="file" hidden accept="image/png,image/jpeg,image/webp" onChange={(e) => { const f = imageFrom(e.target.files); if (f) void upload(f); }} />}
      </div>
      <div role="tablist" aria-label={`${label} mode`} className="flex border border-line-strong">{tab('write', 'Write')}{tab('preview', 'Preview')}</div>
    </div>
    {mode === 'write'
      ? <textarea ref={area} id={id} aria-describedby={d} aria-invalid={!!error || undefined} rows={rows} spellCheck value={value} onChange={(e) => onChange(e.target.value)}
        onKeyDown={key} onPaste={paste} onDrop={drop} className={`${controlClass} border-0 font-mono text-[13px] leading-6`} />
      : <div id={id} tabIndex={0} aria-label={`${label} preview`} className="min-h-64 bg-surface p-5">{value.trim() ? <Markdown source={value} /> : <p className="text-sm text-subtle">Nothing to preview yet.</p>}</div>}
  </div>}</Field>;
}
