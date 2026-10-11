import type { ReactNode } from 'react';

/** Numbered form section with an anchor so long case studies stay navigable. */
export default function Section({ id, n, title, children }: { id: string; n: number; title: string; children: ReactNode }) {
  return <section id={id} aria-labelledby={`${id}-h`} className="scroll-mt-24 space-y-5 border-t border-line pt-6 first:border-0 first:pt-0">
    <h2 id={`${id}-h`} className="flex items-baseline gap-3 font-display text-xl uppercase"><span className="font-mono text-sm text-accent-strong">{String(n).padStart(2, '0')}</span>{title}</h2>
    {children}
  </section>;
}
