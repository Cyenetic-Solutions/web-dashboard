"use client";
import { useId, type KeyboardEvent, type ReactNode } from 'react';

/** Accessible tab list that scrolls horizontally inside its own container on narrow screens. */
export default function Tabs<T extends string>({ tabs, value, onChange, label }: { tabs: readonly { value: T; label: ReactNode }[]; value: T; onChange: (value: T) => void; label: string }) {
  const id = useId();
  function key(event: KeyboardEvent, index: number) {
    const dir = event.key === 'ArrowRight' ? 1 : event.key === 'ArrowLeft' ? -1 : 0;
    if (!dir) return;
    const next = tabs[(index + dir + tabs.length) % tabs.length];
    onChange(next.value); document.getElementById(`${id}-${next.value}`)?.focus();
  }
  return <div role="tablist" aria-label={label} className="-mx-1 flex overflow-x-auto border-b border-line px-1">
    {tabs.map((tab, index) => <button key={tab.value} id={`${id}-${tab.value}`} role="tab" type="button" aria-selected={tab.value === value} tabIndex={tab.value === value ? 0 : -1}
      onClick={() => onChange(tab.value)} onKeyDown={(e) => key(e, index)}
      className="-mb-px min-h-11 shrink-0 whitespace-nowrap border-b-2 border-transparent px-4 font-mono text-xs uppercase tracking-wider text-muted hover:text-ink aria-selected:border-accent aria-selected:text-ink">{tab.label}</button>)}
  </div>;
}
