import type { ReactNode } from 'react';

/** Eyebrow label, page title, description and a primary action that goes full-width on mobile. */
export default function PageHeader({ eyebrow, title, description, actions }: { eyebrow: string; title: string; description?: ReactNode; actions?: ReactNode }) {
  return <header className="mb-8 flex flex-col gap-4 border-b border-line pb-6 md:flex-row md:items-end md:justify-between">
    <div className="min-w-0"><p className="cye-label text-accent-strong">{eyebrow}</p>
      <h1 className="mt-2 text-2xl font-semibold leading-tight sm:text-[28px]">{title}</h1>
      {description && <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>}</div>
    {actions && <div className="flex flex-col gap-2 sm:flex-row [&>*]:w-full sm:[&>*]:w-auto">{actions}</div>}
  </header>;
}
