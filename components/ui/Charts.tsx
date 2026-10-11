import type { ReactNode } from 'react';

/** Labelled numeric datum. */
export interface Datum { label: string; value: number; color?: string }

/** Panel wrapper for charts with an eyebrow title. */
export function ChartCard({ title, children, footer }: { title: string; children: ReactNode; footer?: ReactNode }) {
  return <section className="min-w-0 border border-line bg-surface p-4 sm:p-5"><h2 className="cye-label text-muted">{title}</h2><div className="mt-4">{children}</div>{footer && <div className="mt-3 text-xs text-muted">{footer}</div>}</section>;
}

/** Horizontal bars with values; used for funnels and severity breakdowns. */
export function BarList({ data, label }: { data: Datum[]; label: string }) {
  const max = Math.max(1, ...data.map((d) => d.value));
  return <ul aria-label={label} className="space-y-2.5">{data.map((d) => <li key={d.label} className="grid grid-cols-[minmax(0,7.5rem)_1fr_auto] items-center gap-3 text-sm">
    <span className="truncate text-muted">{d.label}</span>
    <span className="h-2.5 bg-surface-3"><span className="block h-full transition-[width] duration-500" style={{ width: `${(d.value / max) * 100}%`, background: d.color ?? 'var(--accent)' }} /></span>
    <span className="w-10 text-right font-mono text-xs">{d.value}</span></li>)}</ul>;
}

/** Area chart over evenly spaced points with first/last labels; values are announced in a hidden table. */
export function AreaChart({ data, label, height = 140 }: { data: Datum[]; label: string; height?: number }) {
  const width = 600, max = Math.max(1, ...data.map((d) => d.value));
  const points = data.map((d, i) => [data.length < 2 ? 0 : (i / (data.length - 1)) * width, height - (d.value / max) * (height - 8)] as const);
  const line = points.map(([x, y], i) => `${i ? 'L' : 'M'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  return <figure className="m-0">
    <svg viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" className="h-36 w-full" role="img" aria-label={label}>
      {[0.25, 0.5, 0.75].map((f) => <line key={f} x1="0" x2={width} y1={height * f} y2={height * f} stroke="var(--border)" strokeWidth="1" vectorEffect="non-scaling-stroke" />)}
      {points.length > 1 && <path d={`${line} L${width},${height} L0,${height} Z`} fill="var(--accent-soft)" />}
      {points.length > 1 && <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2" vectorEffect="non-scaling-stroke" />}
    </svg>
    <figcaption className="mt-1 flex justify-between font-mono text-[11px] text-subtle"><span>{data[0]?.label}</span><span>max {max}</span><span>{data.at(-1)?.label}</span></figcaption>
    <table className="sr-only"><caption>{label}</caption><tbody>{data.map((d) => <tr key={d.label}><th>{d.label}</th><td>{d.value}</td></tr>)}</tbody></table>
  </figure>;
}

/** Donut with legend; segment colours come from the data. */
export function Donut({ data, label }: { data: Datum[]; label: string }) {
  const total = data.reduce((sum, d) => sum + d.value, 0);
  const r = 40, c = 2 * Math.PI * r;
  const segments = data.reduce<{ d: Datum; length: number; offset: number }[]>((acc, d) => {
    const offset = acc.length ? acc[acc.length - 1].offset + acc[acc.length - 1].length : 0;
    return [...acc, { d, length: total ? (d.value / total) * c : 0, offset }];
  }, []);
  return <div className="flex flex-wrap items-center gap-6">
    <svg viewBox="0 0 100 100" className="size-32 shrink-0 -rotate-90" role="img" aria-label={`${label}: ${data.map((d) => `${d.label} ${d.value}`).join(', ')}`}>
      <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-3)" strokeWidth="14" />
      {segments.map(({ d, length, offset }) => <circle key={d.label} cx="50" cy="50" r={r} fill="none" stroke={d.color ?? 'var(--accent)'} strokeWidth="14" strokeDasharray={`${length} ${c - length}`} strokeDashoffset={-offset} />)}
    </svg>
    <ul className="min-w-0 space-y-1.5 text-sm">{data.map((d) => <li key={d.label} className="flex items-center gap-2"><span aria-hidden="true" className="size-2.5 shrink-0" style={{ background: d.color ?? 'var(--accent)' }} /><span className="text-muted">{d.label}</span><span className="ml-auto pl-4 font-mono text-xs">{d.value}</span></li>)}</ul>
  </div>;
}
