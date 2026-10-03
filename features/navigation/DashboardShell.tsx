"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import type { ReactNode } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { navigation } from './navigation.data';

/** Responsive administrative chrome using the HTML template's type, borders, and orange accents. */
export default function DashboardShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { session, signOut } = useAuth();
  return <>
    <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:z-50 focus:bg-cye-orange focus:p-4 focus:text-black">Skip to content</a>
    <header className="flex flex-wrap items-center justify-between gap-4 border-b border-white/20 px-6 py-5">
      <Link href="/" className="font-display text-2xl tracking-wider">CYENETIC <span className="text-cye-orange">/ CONTROL</span></Link>
      <div className="flex items-center gap-4 font-mono text-xs"><span>{session?.role ?? 'No staff session'}</span>{session ? <button onClick={signOut} className="min-h-11 border border-white/20 px-4 hover:border-cye-orange">Sign out</button> : <Link href="/login" className="min-h-11 border border-white/20 px-4 py-3">Sign in</Link>}</div>
    </header>
    <div className="mx-auto grid max-w-[1680px] lg:grid-cols-[240px_1fr]">
      <nav aria-label="Workspaces" className="flex flex-wrap gap-2 border-b border-white/20 p-4 lg:block lg:border-r lg:border-b-0">
        {navigation.map((item) => <Link key={item.href} href={item.href} aria-current={path === item.href ? 'page' : undefined} className="block px-4 py-3 font-mono text-xs uppercase tracking-wider text-white/60 hover:text-white aria-[current=page]:bg-cye-orange aria-[current=page]:text-black">{item.title}</Link>)}
      </nav>
      <main id="main" className="min-w-0 p-5 sm:p-10">{children}</main>
    </div>
  </>;
}
