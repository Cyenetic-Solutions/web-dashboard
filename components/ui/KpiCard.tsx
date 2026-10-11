"use client";
import { useEffect, useState } from 'react';

/** KPI tile: Anton numeral counting up once, mono label, optional delta. */
export default function KpiCard({ label, value, delta, suffix = '' }: { label: string; value: number; delta?: number | null; suffix?: string }) {
  const [shown, setShown] = useState(0);
  useEffect(() => {
    const duration = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 0 : 600;
    let frame = 0; const start = performance.now();
    const step = (now: number) => { const t = duration ? Math.min(1, (now - start) / duration) : 1; setShown(Math.round(value * (1 - (1 - t) ** 3))); if (t < 1) frame = requestAnimationFrame(step); };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [value]);
  return <div className="border border-line bg-surface p-4 sm:p-5"><p className="cye-label text-muted">{label}</p>
    <p className="mt-3 font-display text-4xl leading-none tracking-wide sm:text-5xl" aria-label={`${value}${suffix}`}>{shown.toLocaleString()}{suffix}</p>
    {delta !== undefined && delta !== null && <p className={`mt-2 font-mono text-xs ${delta >= 0 ? 'text-success' : 'text-danger'}`}>{delta >= 0 ? '▲' : '▼'} {Math.abs(delta).toFixed(0)}% vs prev. 30 d</p>}</div>;
}
