"use client";
import { useState, type KeyboardEvent } from 'react';
import { Field, controlClass } from './Field';

/** Free-text tags: Enter or comma adds, × removes. */
export function TagInput({ label, value, onChange, hint, max = 30 }: { label: string; value: string[]; onChange: (value: string[]) => void; hint?: string; max?: number }) {
  const [draft, setDraft] = useState('');
  function add() { const tag = draft.trim(); if (tag && !value.includes(tag) && value.length < max) onChange([...value, tag]); setDraft(''); }
  function key(event: KeyboardEvent<HTMLInputElement>) {
    if (event.key === 'Enter' || event.key === ',') { event.preventDefault(); add(); }
    if (event.key === 'Backspace' && !draft && value.length) onChange(value.slice(0, -1));
  }
  return <Field label={label} hint={hint ?? 'Press Enter to add'}>{(id, d) => <div className={`${controlClass} flex flex-wrap items-center gap-1.5`}>
    {value.map((tag) => <span key={tag} className="inline-flex items-center gap-1 border border-line-strong bg-surface-3 px-2 py-0.5 font-mono text-xs">{tag}
      <button type="button" onClick={() => onChange(value.filter((t) => t !== tag))} aria-label={`Remove ${tag}`} className="px-1 text-muted hover:text-ink">×</button></span>)}
    <input id={id} aria-describedby={d} value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={key} onBlur={add} className="min-w-24 flex-1 bg-transparent py-1 outline-none" />
  </div>}</Field>;
}

/** Integer stepper with large touch targets. */
export function NumberStepper({ label, value, onChange, min = 0, max = 999, accent }: { label: string; value: number; onChange: (value: number) => void; min?: number; max?: number; accent?: string }) {
  const clamp = (n: number) => Math.max(min, Math.min(max, Number.isFinite(n) ? Math.round(n) : min));
  return <div className="border border-line bg-surface-2 p-3">
    <p className="flex items-center gap-2 text-xs font-medium">{accent && <span aria-hidden="true" className={`size-2 ${accent}`} />}{label}</p>
    <div className="mt-2 flex items-center">
      <button type="button" onClick={() => onChange(clamp(value - 1))} aria-label={`Decrease ${label}`} className="grid size-11 place-items-center border border-line-strong hover:border-accent">−</button>
      <input type="number" inputMode="numeric" aria-label={label} value={value} min={min} max={max} onChange={(e) => onChange(clamp(Number(e.target.value)))} className="h-11 w-full min-w-0 border-y border-line-strong bg-transparent text-center font-display text-xl" />
      <button type="button" onClick={() => onChange(clamp(value + 1))} aria-label={`Increase ${label}`} className="grid size-11 place-items-center border border-line-strong hover:border-accent">+</button>
    </div>
  </div>;
}

/** Exclusive option buttons with an accessible radio-group role. */
export function Segmented<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: readonly { value: T; label: string; hint?: string }[]; onChange: (value: T) => void }) {
  return <fieldset><legend className="mb-1.5 text-sm font-medium">{label}</legend>
    <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col border border-line-strong">
      {options.map((o) => <button key={o.value} type="button" role="radio" aria-checked={o.value === value} onClick={() => onChange(o.value)}
        className="min-h-11 border-r border-line-strong px-3 py-2 text-left last:border-r-0 aria-checked:bg-accent aria-checked:text-cye-black">
        <span className="block font-mono text-xs uppercase tracking-wider">{o.label}</span>{o.hint && <span className="block text-[11px] opacity-75">{o.hint}</span>}</button>)}
    </div></fieldset>;
}
