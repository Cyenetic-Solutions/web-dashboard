import type { Metadata } from 'next';
import type { ReactNode } from 'react';
import { headers } from 'next/headers';
import { AuthProvider } from '@/providers/AuthProvider';
import { ThemeProvider } from '@/providers/ThemeProvider';
import { themeKey } from '@/providers/theme';
import DashboardShell from '@/features/navigation/DashboardShell';
import CustomCursor from '@/components/CustomCursor';
import './globals.css';

/** Administrative app is never indexed by search engines. */
export const metadata: Metadata = { title: 'Cyenetic Admin', description: 'Cyenetic staff operations', robots: { index: false, follow: false }, icons: { icon: '/favicon.svg' } };
const themeScript = `try{if(localStorage.getItem('${themeKey}')==='light')document.documentElement.dataset.theme='light'}catch(e){}`;
/** Dynamic rendering applies the per-request nonce, including to the pre-paint theme script. */
export default async function RootLayout({ children }: { children: ReactNode }) {
  const nonce = (await headers()).get('x-nonce') ?? undefined;
  return <html lang="en" suppressHydrationWarning><head><script nonce={nonce} dangerouslySetInnerHTML={{ __html: themeScript }} /></head>
    <body className="min-h-screen bg-canvas font-sans text-ink antialiased"><CustomCursor /><ThemeProvider><AuthProvider><DashboardShell>{children}</DashboardShell></AuthProvider></ThemeProvider></body></html>;
}
