import type { ReactNode } from 'react';

/** Semantic tones used by every status map. */
export type Tone = 'neutral' | 'accent' | 'info' | 'warning' | 'success' | 'danger' | 'subtle';
const tones: Record<Tone, string> = {
  neutral: 'border-line-strong text-ink', accent: 'border-accent text-accent-strong bg-accent-soft',
  info: 'border-info text-info', warning: 'border-warning text-warning', success: 'border-success text-success',
  danger: 'border-danger text-danger', subtle: 'border-line text-subtle',
};
/** Status pill: colour is decorative, the text label always carries meaning. */
export function Pill({ tone = 'neutral', children }: { tone?: Tone; children: ReactNode }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap border px-2 py-0.5 font-mono text-[11px] uppercase tracking-wider ${tones[tone]}`}>
    <span aria-hidden="true" className="size-1.5 bg-current" />{children}</span>;
}

/** CVSS severity bands. */
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';
const severity: Record<Severity, string> = {
  CRITICAL: 'bg-cvss-critical text-cye-white', HIGH: 'bg-cvss-high text-cye-black', MEDIUM: 'bg-cvss-medium text-cye-black',
  LOW: 'bg-cvss-low text-cye-white', INFO: 'bg-cvss-info text-cye-white',
};
/** Severity badge with an explicit text label. */
export function SeverityBadge({ value, score }: { value: Severity; score?: number | null }) {
  return <span className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wider ${severity[value]}`}>
    {value.toLowerCase()}{score !== undefined && score !== null && <span className="opacity-80">{score.toFixed(1)}</span>}</span>;
}
/** Severity colour class for bars and stripes. */
export const severityBar: Record<Severity, string> = { CRITICAL: 'bg-cvss-critical', HIGH: 'bg-cvss-high', MEDIUM: 'bg-cvss-medium', LOW: 'bg-cvss-low', INFO: 'bg-cvss-info' };
