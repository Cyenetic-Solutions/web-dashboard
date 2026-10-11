import { passwordRules } from '@/services/auth';

/** Live password checklist with a four-step strength meter. */
export default function PasswordRules({ password, email }: { password: string; email?: string }) {
  const rules = passwordRules(password, email);
  const score = rules.filter((r) => r.ok).length;
  return <div className="mt-3">
    <div className="grid grid-cols-4 gap-1" aria-hidden="true">{rules.map((_, i) => <span key={i} className={`h-1 ${i < score ? (score === 4 ? 'bg-success' : 'bg-accent') : 'bg-surface-3'}`} />)}</div>
    <ul className="mt-3 space-y-1 text-xs" aria-label="Password requirements">{rules.map((r) => <li key={r.label} className={r.ok ? 'text-success' : 'text-muted'}>
      <span aria-hidden="true" className="mr-2 font-mono">{r.ok ? '✓' : '○'}</span>{r.label}<span className="sr-only">{r.ok ? ' (met)' : ' (not met)'}</span></li>)}</ul>
  </div>;
}
