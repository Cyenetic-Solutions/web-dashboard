"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { isActive, navigation } from './navigation.data';

/** Grouped workspace navigation; items the role cannot use are hidden (the API still enforces access). */
export default function Sidebar({ onNavigate }: { onNavigate?: () => void }) {
  const path = usePathname();
  const { can } = useAuth();
  return <nav aria-label="Workspaces" className="space-y-6 px-3 py-5">
    {navigation.map(({ group, items }) => {
      const visible = items.filter((item) => can(item.permission));
      if (!visible.length) return null;
      return <div key={group}><p className="cye-label px-3 text-subtle">{group}</p><ul className="mt-2 space-y-0.5">{visible.map((item) =>
        <li key={item.href}><Link href={item.href} onClick={onNavigate} aria-current={isActive(item.href, path) ? 'page' : undefined}
          className="relative flex min-h-10 items-center px-3 text-sm text-muted transition-colors hover:bg-surface-2 hover:text-ink aria-[current=page]:bg-surface-3 aria-[current=page]:text-ink aria-[current=page]:before:absolute aria-[current=page]:before:inset-y-0 aria-[current=page]:before:left-0 aria-[current=page]:before:w-0.5 aria-[current=page]:before:bg-accent">{item.title}</Link></li>)}</ul></div>;
    })}
  </nav>;
}
