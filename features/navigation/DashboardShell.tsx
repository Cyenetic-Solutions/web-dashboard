"use client";
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState, type ReactNode } from 'react';
import Drawer from '@/components/ui/Drawer';
import { useAuth } from '@/providers/AuthProvider';
import CommandPalette from './CommandPalette';
import Sidebar from './Sidebar';
import Topbar from './Topbar';
import { publicRoutes } from './navigation.data';

/** App shell: persistent 256px sidebar from lg, drawer navigation below; auth screens render bare. */
export default function DashboardShell({ children }: { children: ReactNode }) {
  const path = usePathname();
  const { session } = useAuth();
  const [menu, setMenu] = useState(false);
  const [palette, setPalette] = useState(false);
  useEffect(() => {
    function key(event: KeyboardEvent) { if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPalette((p) => !p); } }
    window.addEventListener('keydown', key); return () => window.removeEventListener('keydown', key);
  }, []);
  const skip = <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:bg-accent focus:p-4 focus:text-cye-black">Skip to content</a>;
  if (publicRoutes.some((route) => path === route || path.startsWith(`${route}/`)) || !session) return <>{skip}<main id="main" className="min-h-dvh">{children}</main></>;
  return <>{skip}
    <div className="lg:grid lg:min-h-dvh lg:grid-cols-[256px_minmax(0,1fr)]">
      <aside className="sticky top-0 hidden h-dvh overflow-y-auto border-r border-line bg-surface lg:block">
        <Link href="/" className="flex h-14 items-center border-b border-line px-6 font-display text-xl tracking-wider">CYENETIC <span className="ml-2 text-accent">/ADMIN</span></Link>
        <Sidebar />
      </aside>
      <div className="min-w-0">
        <Topbar onMenu={() => setMenu(true)} onPalette={() => setPalette(true)} />
        <main id="main" className="mx-auto w-full max-w-[1440px] px-4 py-6 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>
    </div>
    <Drawer open={menu} onClose={() => setMenu(false)} title="Navigation"><Sidebar onNavigate={() => setMenu(false)} /></Drawer>
    <CommandPalette open={palette} onClose={() => setPalette(false)} />
  </>;
}
