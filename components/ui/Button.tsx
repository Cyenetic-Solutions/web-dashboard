import Link from 'next/link';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const variants: Record<Variant, string> = {
  primary: 'bg-accent text-cye-black border border-accent hover:bg-[var(--accent-hover)]',
  secondary: 'bg-surface-2 text-ink border border-line-strong hover:border-accent',
  ghost: 'text-ink border border-transparent hover:bg-surface-2',
  danger: 'text-danger border border-danger hover:bg-danger hover:text-cye-white',
};
const sizes = { sm: 'min-h-9 px-3 text-[11px]', md: 'min-h-11 px-4 text-xs', lg: 'min-h-12 px-6 text-xs' };
/** Shared class list so links can look like buttons. */
export function buttonClass(variant: Variant = 'primary', size: keyof typeof sizes = 'md') {
  return `inline-flex items-center justify-center gap-2 font-mono uppercase tracking-wider transition-colors duration-150 disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]}`;
}

/** Sharp-cornered action button with variant, size and loading state. */
export default function Button({ variant = 'primary', size = 'md', loading, children, className = '', ...rest }:
  ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: keyof typeof sizes; loading?: boolean; children: ReactNode }) {
  return <button {...rest} disabled={rest.disabled || loading} aria-busy={loading || undefined} className={`${buttonClass(variant, size)} ${className}`}>
    {loading && <span aria-hidden="true" className="size-3 animate-spin border-2 border-current border-r-transparent" />}{children}</button>;
}

/** Navigation styled as a button. */
export function LinkButton({ href, variant = 'primary', size = 'md', children, className = '' }: { href: string; variant?: Variant; size?: keyof typeof sizes; children: ReactNode; className?: string }) {
  return <Link href={href} className={`${buttonClass(variant, size)} ${className}`}>{children}</Link>;
}
