import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { connection } from 'next/server';
import { AuthProvider } from '@/providers/AuthProvider';
import DashboardShell from '@/features/navigation/DashboardShell';
import CustomCursor from '@/components/CustomCursor';
import './globals.css';

/** Administrative app is never indexed by search engines. */
export const metadata: Metadata = { title: 'Cyenetic Control', description: 'Cyenetic staff operations', robots: { index: false, follow: false }, icons: { icon: '/favicon.svg' } };
/** Dynamic rendering lets Next.js apply the per-request script nonce. */
export default async function RootLayout({ children }: { children: ReactNode }) {
  await connection();
  return <html lang="en"><body className="min-h-screen bg-cye-black font-sans text-cye-white antialiased"><CustomCursor /><AuthProvider><DashboardShell>{children}</DashboardShell></AuthProvider></body></html>;
}
