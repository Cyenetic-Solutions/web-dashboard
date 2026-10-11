"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useAuth } from '@/providers/AuthProvider';
import { useTheme } from '@/providers/ThemeProvider';
import { initials } from '@/components/format';
import { isActive, navigation } from './navigation.data';

/** 56px top bar: menu trigger (mobile), breadcrumbs, palette trigger, theme toggle and account menu. */
export default function Topbar({ onMenu, onPalette }: { onMenu: () => void; onPalette: () => void }) {
  const path = usePathname();
  const { session, signOut } = useAuth();
  const { theme, toggle } = useTheme();
  const crumb = navigation.flatMap(({ group, items }) => items.map((i) => ({ group, ...i }))).find((i) => isActive(i.href, path));
  const name = session?.name ?? session?.email ?? session?.sub ?? '';
  return <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-line bg-canvas/95 px-4 backdrop-blur sm:px-6">
    <button type="button" onClick={onMenu} aria-label="Open navigation" className="grid size-11 place-items-center border border-line lg:hidden"><span aria-hidden="true" className="font-mono">≡</span></button>
    <Link href="/" className="font-display text-xl tracking-wider lg:hidden">CYENETIC</Link>
    <nav aria-label="Breadcrumb" className="hidden min-w-0 flex-1 truncate font-mono text-xs text-muted lg:block">
      {crumb ? <><span>{crumb.group}</span><span className="px-2 text-subtle">/</span><span className="text-ink">{crumb.title}</span></> : path === '/account' ? <span className="text-ink">Account</span> : null}
    </nav>
    <div className="ml-auto flex items-center gap-2">
      <button type="button" onClick={onPalette} className="hidden min-h-9 items-center gap-6 border border-line bg-surface-2 px-3 text-xs text-muted hover:border-line-strong sm:flex">Search… <kbd className="font-mono text-[10px]">⌘K</kbd></button>
      <button type="button" onClick={toggle} aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} theme`} className="grid size-11 place-items-center border border-line font-mono text-sm hover:border-accent sm:size-9">{theme === 'dark' ? '☼' : '☾'}</button>
      {session && <details className="relative">
        <summary aria-label="Account menu" className="grid size-11 cursor-pointer list-none place-items-center border border-line bg-surface-3 font-mono text-xs hover:border-accent sm:size-9">{initials(name)}</summary>
        <div className="absolute right-0 mt-2 w-60 border border-line-strong bg-surface p-2 shadow-xl">
          <p className="truncate px-3 pt-2 text-sm">{name}</p><p className="cye-label px-3 pb-2 text-accent-strong">{session.role}</p>
          <Link href="/account" className="block px-3 py-2.5 text-sm hover:bg-surface-2">Account & security</Link>
          <button type="button" onClick={() => void signOut()} className="block w-full px-3 py-2.5 text-left text-sm hover:bg-surface-2">Sign out</button>
        </div></details>}
    </div>
  </header>;
}
