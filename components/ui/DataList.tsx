import type { ReactNode } from 'react';

/** Column definition; `primary` columns lead the mobile card, `hideOnMobile` drops a column from cards. */
export interface Column<T> { key: string; header: string; cell: (row: T) => ReactNode; mono?: boolean; primary?: boolean; hideOnMobile?: boolean; className?: string }

/** Table from md upward (scrolling inside its own container), card list below md; no page-level overflow. */
export default function DataList<T>({ rows, columns, rowKey, onSelect, label, stripe }: {
  rows: readonly T[]; columns: Column<T>[]; rowKey: (row: T) => string; onSelect?: (row: T) => void; label: string; stripe?: (row: T) => string;
}) {
  const primary = columns.filter((c) => c.primary);
  const rest = columns.filter((c) => !c.primary && !c.hideOnMobile);
  return <>
    <div className="hidden overflow-x-auto border border-line md:block">
      <table className="w-full border-collapse text-left text-sm" aria-label={label}>
        <thead className="sticky top-0 bg-surface"><tr>{columns.map((c) => <th key={c.key} scope="col" className="cye-label whitespace-nowrap border-b border-line px-4 py-3 text-muted">{c.header}</th>)}</tr></thead>
        <tbody>{rows.map((row) => <tr key={rowKey(row)} className="border-b border-line last:border-0 hover:bg-surface-2">
          {columns.map((c, i) => <td key={c.key} className={`px-4 py-3 align-middle ${c.mono ? 'font-mono text-xs' : ''} ${c.className ?? ''}`}>
            {i === 0 && onSelect ? <button type="button" onClick={() => onSelect(row)} className="text-left hover:text-accent-strong">{c.cell(row)}</button> : c.cell(row)}</td>)}
        </tr>)}</tbody>
      </table>
    </div>
    <ul className="space-y-2 md:hidden" aria-label={label}>{rows.map((row) => <li key={rowKey(row)} className={`relative border border-line bg-surface p-4 ${stripe ? 'pl-5' : ''}`}>
      {stripe && <span aria-hidden="true" className={`absolute inset-y-0 left-0 w-1 ${stripe(row)}`} />}
      <div className="font-medium">{(primary.length ? primary : columns.slice(0, 1)).map((c) => <div key={c.key} className={c.mono ? 'font-mono text-xs' : ''}>{c.cell(row)}</div>)}</div>
      <dl className="mt-3 grid grid-cols-2 gap-x-4 gap-y-2 text-xs">{(primary.length ? rest : rest.slice(1)).map((c) => <div key={c.key} className="min-w-0"><dt className="cye-label text-subtle">{c.header}</dt><dd className={`mt-0.5 break-words ${c.mono ? 'font-mono' : ''}`}>{c.cell(row)}</dd></div>)}</dl>
      {onSelect && <button type="button" onClick={() => onSelect(row)} className="mt-3 min-h-11 font-mono text-xs uppercase text-accent-strong">Open →</button>}
    </li>)}</ul>
  </>;
}
