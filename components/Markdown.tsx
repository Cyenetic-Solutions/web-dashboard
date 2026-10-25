/* eslint-disable @next/next/no-img-element -- previews show editor-supplied https URLs; next/image would need every host allow-listed. */
import type { ReactNode } from 'react';
import { isImageUrl } from '@/services/content.schema';

/** Only web and mail links are rendered; anything else (javascript:, data:) becomes plain text. */
export function safeHref(url: string) { return /^(https?:\/\/|mailto:|\/(?!\/)|#)/i.test(url.trim()) ? url.trim() : null; }
/** Images must come from an https origin (or local dev uploads during development). */
export function safeImage(url: string) { return isImageUrl(url.trim()) ? url.trim() : null; }

const inlinePattern = /(`[^`]+`)|!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)|\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|__([^_]+)__|\*([^*]+)\*|_([^_]+)_|~~([^~]+)~~/g;

/** Renders inline Markdown (code, images, links, bold, italic, strike) as React nodes; raw HTML is shown as text. */
function inline(source: string, key: string): ReactNode[] {
  const out: ReactNode[] = [];
  let last = 0, n = 0;
  for (const m of source.matchAll(inlinePattern)) {
    if (m.index > last) out.push(source.slice(last, m.index));
    const k = `${key}-${n++}`;
    if (m[1]) out.push(<code key={k} className="bg-surface-3 px-1 font-mono text-[0.9em]">{m[1].slice(1, -1)}</code>);
    else if (m[3] !== undefined) { const src = safeImage(m[3]); out.push(src ? <img key={k} src={src} alt={m[2]} title={m[4]} className="inline-block max-h-96 max-w-full" /> : m[0]); }
    else if (m[5] !== undefined) { const href = safeHref(m[6]); out.push(href ? <a key={k} href={href} rel="noopener noreferrer nofollow" target="_blank" className="text-accent-strong underline">{inline(m[5], k)}</a> : m[5]); }
    else if (m[7] ?? m[8]) out.push(<strong key={k}>{inline(m[7] ?? m[8], k)}</strong>);
    else if (m[9] ?? m[10]) out.push(<em key={k}>{inline(m[9] ?? m[10], k)}</em>);
    else if (m[11]) out.push(<del key={k}>{inline(m[11], k)}</del>);
    last = m.index + m[0].length;
  }
  if (last < source.length) out.push(source.slice(last));
  return out;
}

const figure = /^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"([^"]*)")?\)$/;
const headings = ['h1', 'h2', 'h3', 'h4'] as const;
const headingClass = ['font-display text-3xl uppercase', 'font-display text-2xl uppercase', 'text-xl font-semibold', 'text-lg font-semibold'];

/** Splits Markdown into block elements: headings, lists, quotes, code fences, dividers, figures and paragraphs. */
function blocks(source: string): ReactNode[] {
  const lines = source.replace(/\r\n?/g, '\n').split('\n');
  const out: ReactNode[] = [];
  let i = 0;
  const take = (test: (line: string) => boolean) => { const chunk: string[] = []; while (i < lines.length && test(lines[i])) chunk.push(lines[i++]); return chunk; };
  while (i < lines.length) {
    const line = lines[i];
    const k = `b${i}`;
    if (!line.trim()) { i++; continue; }
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim(); i++;
      const code = take((l) => !l.startsWith('```')); i++;
      out.push(<pre key={k} data-lang={lang || undefined} className="overflow-x-auto border border-line bg-surface-2 p-4 font-mono text-[13px] leading-6"><code>{code.join('\n')}</code></pre>);
      continue;
    }
    const heading = /^(#{1,4})\s+(.*)$/.exec(line);
    if (heading) { const level = heading[1].length - 1; const Tag = headings[level]; out.push(<Tag key={k} className={headingClass[level]}>{inline(heading[2], k)}</Tag>); i++; continue; }
    if (/^(-{3,}|\*{3,})\s*$/.test(line)) { out.push(<hr key={k} className="border-line" />); i++; continue; }
    if (line.startsWith('>')) {
      const quote = take((l) => l.startsWith('>')).map((l) => l.replace(/^>\s?/, ''));
      out.push(<blockquote key={k} className="border-l-2 border-accent pl-4 text-lg italic text-muted">{blocks(quote.join('\n'))}</blockquote>);
      continue;
    }
    if (/^\s*[-*+]\s+/.test(line)) {
      const items = take((l) => /^\s*[-*+]\s+/.test(l)).map((l) => l.replace(/^\s*[-*+]\s+/, ''));
      out.push(<ul key={k} className="list-disc space-y-1 pl-6">{items.map((item, j) => <li key={j}>{inline(item, `${k}-${j}`)}</li>)}</ul>);
      continue;
    }
    if (/^\s*\d+[.)]\s+/.test(line)) {
      const items = take((l) => /^\s*\d+[.)]\s+/.test(l)).map((l) => l.replace(/^\s*\d+[.)]\s+/, ''));
      out.push(<ol key={k} className="list-decimal space-y-1 pl-6">{items.map((item, j) => <li key={j}>{inline(item, `${k}-${j}`)}</li>)}</ol>);
      continue;
    }
    const fig = figure.exec(line.trim());
    if (fig && safeImage(fig[2])) {
      out.push(<figure key={k} className="space-y-2"><img src={safeImage(fig[2]) ?? undefined} alt={fig[1]} className="max-h-[480px] w-full border border-line object-contain" />
        {fig[3] && <figcaption className="text-center text-xs text-muted">{fig[3]}</figcaption>}</figure>);
      i++; continue;
    }
    const para = take((l) => !!l.trim() && !/^(#{1,4}\s|```|>|\s*[-*+]\s|\s*\d+[.)]\s|-{3,}\s*$)/.test(l));
    if (!para.length) { out.push(<p key={k}>{inline(line, k)}</p>); i++; continue; }
    out.push(<p key={k}>{para.flatMap((l, j) => j ? [<br key={`${k}-br${j}`} />, ...inline(l, `${k}-${j}`)] : inline(l, `${k}-${j}`))}</p>);
  }
  return out;
}

/** Safe Markdown preview: builds React elements only, never injects HTML. */
export default function Markdown({ source, className = '' }: { source: string; className?: string }) {
  return <div className={`space-y-4 leading-7 ${className}`}>{blocks(source)}</div>;
}
