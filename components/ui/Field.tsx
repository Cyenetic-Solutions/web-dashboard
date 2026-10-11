import { useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from 'react';

/** Base control styling: hairline border, surface fill, orange focus. */
export const controlClass = 'block w-full min-h-11 rounded-none border border-line bg-surface-2 px-3 py-2 text-sm text-ink placeholder:text-subtle focus:border-accent focus:outline-none disabled:opacity-60';

interface FieldProps { label: string; hint?: ReactNode; error?: string; required?: boolean; children: (id: string, describedBy?: string) => ReactNode; className?: string }
/** Label, control, hint and error rendered consistently and wired for assistive technology. */
export function Field({ label, hint, error, required, children, className = '' }: FieldProps) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : '', error ? `${id}-error` : ''].filter(Boolean).join(' ') || undefined;
  return <div className={className}>
    <div className="mb-1.5 flex gap-1 text-sm font-medium"><label htmlFor={id}>{label}</label>{required && <span aria-hidden="true" className="text-accent-strong">*</span>}</div>
    {children(id, describedBy)}
    {hint && <p id={`${id}-hint`} className="mt-1 text-xs text-muted">{hint}</p>}
    {error && <p id={`${id}-error`} className="mt-1 text-xs text-danger">{error}</p>}
  </div>;
}

type Common = { label: string; hint?: ReactNode; error?: string; wrapperClass?: string };
/** Text input with label. */
export function Input({ label, hint, error, wrapperClass, className = '', ...rest }: Common & InputHTMLAttributes<HTMLInputElement>) {
  return <Field label={label} hint={hint} error={error} required={rest.required} className={wrapperClass}>{(id, d) =>
    <input id={id} aria-describedby={d} aria-invalid={!!error || undefined} {...rest} className={`${controlClass} ${className}`} />}</Field>;
}
/** Multi-line input with an optional character counter. */
export function Textarea({ label, hint, error, wrapperClass, className = '', maxLength, value, ...rest }: Common & TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const count = typeof value === 'string' && maxLength ? `${value.length} / ${maxLength}` : undefined;
  return <Field label={label} hint={count ? <span className="font-mono">{hint ? <>{hint} · </> : null}{count}</span> : hint} error={error} required={rest.required} className={wrapperClass}>{(id, d) =>
    <textarea id={id} aria-describedby={d} aria-invalid={!!error || undefined} maxLength={maxLength} value={value} {...rest} className={`${controlClass} ${className}`} />}</Field>;
}
/** Native select (accessible on every device) with label. */
export function Select({ label, hint, error, wrapperClass, className = '', options, ...rest }: Common & SelectHTMLAttributes<HTMLSelectElement> & { options: readonly { value: string; label: string }[] }) {
  return <Field label={label} hint={hint} error={error} required={rest.required} className={wrapperClass}>{(id, d) =>
    <select id={id} aria-describedby={d} {...rest} className={`${controlClass} ${className}`}>{options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}</select>}</Field>;
}
/** Labelled on/off switch backed by a checkbox. */
export function Switch({ label, checked, onChange, hint, disabled }: { label: string; checked: boolean; onChange: (value: boolean) => void; hint?: string; disabled?: boolean }) {
  return <label className="flex min-h-11 cursor-pointer items-start justify-between gap-4">
    <span><span className="block text-sm font-medium">{label}</span>{hint && <span className="block text-xs text-muted">{hint}</span>}</span>
    <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="peer sr-only" />
    <span aria-hidden="true" className="relative mt-0.5 h-6 w-11 shrink-0 border border-line-strong bg-surface-3 transition-colors after:absolute after:left-0.5 after:top-0.5 after:size-4 after:bg-muted after:transition-transform peer-checked:border-accent peer-checked:bg-accent-soft peer-checked:after:translate-x-5 peer-checked:after:bg-accent peer-focus-visible:outline-2 peer-focus-visible:outline-accent" />
  </label>;
}
