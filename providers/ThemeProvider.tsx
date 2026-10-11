"use client";
import { themeKey } from './theme';
import { createContext, useCallback, useContext, useSyncExternalStore, type ReactNode } from 'react';

type Theme = 'dark' | 'light';
const ThemeContext = createContext<{ theme: Theme; toggle: () => void } | null>(null);

function subscribe(notify: () => void) {
  const observer = new MutationObserver(notify);
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
  return () => observer.disconnect();
}
const read = (): Theme => (document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');

/** Dark by default; light mode is a per-browser preference applied as `data-theme` on <html> before paint. */
export function ThemeProvider({ children }: { children: ReactNode }) {
  const theme = useSyncExternalStore(subscribe, read, () => 'dark' as const);
  const toggle = useCallback(() => {
    const next = read() === 'dark' ? 'light' : 'dark';
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(themeKey, next); } catch { /* storage may be blocked */ }
  }, []);
  return <ThemeContext.Provider value={{ theme, toggle }}>{children}</ThemeContext.Provider>;
}
/** Reads and toggles the active colour theme. */
export function useTheme() { const value = useContext(ThemeContext); if (!value) throw new Error('ThemeProvider missing'); return value; }
