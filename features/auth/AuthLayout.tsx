import type { ReactNode } from 'react';
import LoginTerminal from './LoginTerminal';

/** Split auth layout: kinetic terminal panel on desktop, wordmark-over-form on mobile. */
export default function AuthLayout({ children }: { children: ReactNode }) {
  return <div className="grid min-h-dvh lg:grid-cols-2">
    <aside className="relative hidden overflow-hidden border-r border-line bg-cye-black text-cye-white lg:flex lg:flex-col lg:justify-between lg:p-12">
      <p className="font-display text-3xl tracking-wider">CYENETIC <span className="text-cye-orange">/ADMIN</span></p>
      <LoginTerminal />
      <p className="cye-label text-white/50">admin.cyenetic.com · staff only · all access is audited</p>
    </aside>
    <div className="flex flex-col justify-center px-4 py-10 sm:px-10">
      <p className="mb-10 font-display text-3xl tracking-wider lg:hidden">CYENETIC <span className="text-accent">/ADMIN</span></p>
      <div className="mx-auto w-full max-w-md">{children}</div>
    </div>
  </div>;
}
