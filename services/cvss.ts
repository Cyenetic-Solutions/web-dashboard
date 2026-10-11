/** CVSS v3.1 base metric definitions (FIRST specification). */
export const cvss31Metrics = {
  AV: { label: 'Attack vector', values: { N: 'Network', A: 'Adjacent', L: 'Local', P: 'Physical' } },
  AC: { label: 'Attack complexity', values: { L: 'Low', H: 'High' } },
  PR: { label: 'Privileges required', values: { N: 'None', L: 'Low', H: 'High' } },
  UI: { label: 'User interaction', values: { N: 'None', R: 'Required' } },
  S: { label: 'Scope', values: { U: 'Unchanged', C: 'Changed' } },
  C: { label: 'Confidentiality', values: { H: 'High', L: 'Low', N: 'None' } },
  I: { label: 'Integrity', values: { H: 'High', L: 'Low', N: 'None' } },
  A: { label: 'Availability', values: { H: 'High', L: 'Low', N: 'None' } },
} as const;
export type Metric31 = keyof typeof cvss31Metrics;
/** A complete v3.1 base vector as metric → value code. */
export type Vector31 = { [K in Metric31]: keyof (typeof cvss31Metrics)[K]['values'] };
export type Severity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

const weights = {
  AV: { N: 0.85, A: 0.62, L: 0.55, P: 0.2 }, AC: { L: 0.77, H: 0.44 }, UI: { N: 0.85, R: 0.62 },
  CIA: { H: 0.56, L: 0.22, N: 0 },
} as const;
const order: Metric31[] = ['AV', 'AC', 'PR', 'UI', 'S', 'C', 'I', 'A'];

/** FIRST "Roundup": smallest one-decimal number ≥ input, using integer arithmetic to avoid float error. */
export function roundUp(value: number) {
  const int = Math.round(value * 100000);
  return int % 10000 === 0 ? int / 100000 : (Math.floor(int / 10000) + 1) / 10;
}

/** Computes the v3.1 base score. */
export function score31(v: Vector31) {
  const changed = v.S === 'C';
  const pr = v.PR === 'N' ? 0.85 : v.PR === 'L' ? (changed ? 0.68 : 0.62) : changed ? 0.5 : 0.27;
  const iss = 1 - (1 - weights.CIA[v.C]) * (1 - weights.CIA[v.I]) * (1 - weights.CIA[v.A]);
  const impact = changed ? 7.52 * (iss - 0.029) - 3.25 * (iss - 0.02) ** 15 : 6.42 * iss;
  const exploitability = 8.22 * weights.AV[v.AV] * weights.AC[v.AC] * pr * weights.UI[v.UI];
  if (impact <= 0) return 0;
  return changed ? roundUp(Math.min(1.08 * (impact + exploitability), 10)) : roundUp(Math.min(impact + exploitability, 10));
}

/** Serialises a vector as CVSS:3.1/AV:N/... */
export function format31(v: Vector31) { return `CVSS:3.1/${order.map((m) => `${m}:${v[m]}`).join('/')}`; }

function metricsOf(text: string, prefix: string) {
  const parts = text.trim().split('/');
  if (parts[0] !== prefix) return null;
  const found = new Map<string, string>();
  for (const part of parts.slice(1)) { const [key, value] = part.split(':'); if (key && value !== undefined) found.set(key, value); }
  return found;
}
function in31<M extends Metric31>(metric: M, value: string | undefined): value is Extract<Vector31[M], string> {
  return value !== undefined && Object.hasOwn(cvss31Metrics[metric].values, value);
}

/** Parses a v3.1 base vector string; returns null when any base metric is missing or invalid. */
export function parse31(text: string): Vector31 | null {
  const found = metricsOf(text, 'CVSS:3.1');
  if (!found) return null;
  const get = <M extends Metric31>(m: M) => { const value = found.get(m); return in31(m, value) ? value : null; };
  const AV = get('AV'), AC = get('AC'), PR = get('PR'), UI = get('UI'), S = get('S'), C = get('C'), I = get('I'), A = get('A');
  if (!AV || !AC || !PR || !UI || !S || !C || !I || !A) return null;
  return { AV, AC, PR, UI, S, C, I, A };
}

const v4Base = { AV: 'NALP', AC: 'LH', AT: 'NP', PR: 'NLH', UI: 'NPA', VC: 'HLN', VI: 'HLN', VA: 'HLN', SC: 'HLN', SI: 'HLN', SA: 'HLN' } as const;
const v4Keys = Object.keys(v4Base).filter((k): k is keyof typeof v4Base => k in v4Base);
/** Validates a CVSS v4.0 vector's mandatory base metrics; the score is entered manually (see docs/DECISIONS.md). */
export function parse40(text: string): Map<string, string> | null {
  const found = metricsOf(text, 'CVSS:4.0');
  if (!found) return null;
  const base = new Map<string, string>();
  for (const key of v4Keys) { const value = found.get(key); if (!value || value.length !== 1 || !v4Base[key].includes(value)) return null; base.set(key, value); }
  return base;
}

/** Severity band shared by both versions: 0 Info, 0.1–3.9 Low, 4–6.9 Medium, 7–8.9 High, 9–10 Critical. */
export function severityOf(score: number): Severity {
  if (score >= 9) return 'CRITICAL';
  if (score >= 7) return 'HIGH';
  if (score >= 4) return 'MEDIUM';
  if (score > 0) return 'LOW';
  return 'INFO';
}
