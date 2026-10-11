"use client";
import type { ReactNode } from 'react';
import Button from './Button';

/**
 * Repeatable group of cards with add, remove and keyboard-accessible reordering (move up / move down).
 * `render` draws one item's fields; `create` returns a blank item for the Add button.
 */
export default function Repeater<T>({ legend, items, onChange, create, render, max, hint, error, addLabel, itemLabel }: {
  legend: string; items: readonly T[]; onChange: (items: T[]) => void; create: () => T; render: (item: T, set: (next: T) => void, index: number) => ReactNode;
  max: number; hint?: string; error?: string; addLabel: string; itemLabel: (item: T, index: number) => string;
}) {
  const set = (i: number, next: T) => onChange(items.map((item, j) => (j === i ? next : item)));
  const move = (i: number, dir: -1 | 1) => { const next = [...items]; [next[i], next[i + dir]] = [next[i + dir], next[i]]; onChange(next); };
  return <fieldset className="min-w-0 space-y-3">
    <legend className="mb-1 flex w-full items-baseline justify-between gap-3 text-sm font-medium">{legend}<span className="font-mono text-xs text-muted">{items.length} of {max}</span></legend>
    {hint && <p className="text-xs text-muted">{hint}</p>}
    {error && <p className="text-xs text-danger">{error}</p>}
    <ol className="space-y-3">{items.map((item, i) => <li key={i} className="border border-line bg-surface-2 p-4">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="min-w-0 truncate font-mono text-xs uppercase tracking-wider text-muted"><span className="text-accent-strong">{String(i + 1).padStart(2, '0')}</span> {itemLabel(item, i)}</p>
        <div className="flex gap-1">
          <Button type="button" variant="ghost" size="sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label={`Move ${itemLabel(item, i)} up`}>↑</Button>
          <Button type="button" variant="ghost" size="sm" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label={`Move ${itemLabel(item, i)} down`}>↓</Button>
          <Button type="button" variant="danger" size="sm" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label={`Remove ${itemLabel(item, i)}`}>Remove</Button>
        </div>
      </div>
      {render(item, (next) => set(i, next), i)}
    </li>)}</ol>
    <Button type="button" variant="secondary" disabled={items.length >= max} onClick={() => onChange([...items, create()])}>+ {addLabel}</Button>
  </fieldset>;
}
