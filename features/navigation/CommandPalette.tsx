"use client";
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/providers/AuthProvider';
import { navigation } from './navigation.data';

/** Ctrl/Cmd+K palette for jumping to any permitted page. */
export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const { can } = useAuth();
  const [q, setQ] = useState('');
  const [active, setActive] = useState(0);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) { d.showModal(); setQ(''); setActive(0); } if (!open && d.open) d.close(); }, [open]);
  const items = useMemo(() => navigation.flatMap(({ group, items }) => items.filter((i) => can(i.permission)).map((i) => ({ ...i, group })))
    .concat([{ href: '/account', title: 'Account & security', group: 'Account', permission: 'dashboard:view', keywords: 'profile sessions password' }])
    .filter((i) => `${i.title} ${i.group} ${i.keywords ?? ''}`.toLowerCase().includes(q.toLowerCase())), [q, can]);
  function go(href: string) { onClose(); router.push(href); }
  return <dialog ref={ref} aria-label="Command palette" onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}
    className="cye-drawer mx-auto mt-[12vh] w-[calc(100%-2rem)] max-w-lg border border-line-strong bg-surface p-0 text-ink">
    {open && <div onKeyDown={(e) => {
      if (e.key === 'ArrowDown') { e.preventDefault(); setActive((a) => Math.min(items.length - 1, a + 1)); }
      if (e.key === 'ArrowUp') { e.preventDefault(); setActive((a) => Math.max(0, a - 1)); }
      if (e.key === 'Enter' && items[active]) { e.preventDefault(); go(items[active].href); }
    }}>
      <input autoFocus value={q} onChange={(e) => { setQ(e.target.value); setActive(0); }} placeholder="Jump to…" aria-label="Search pages"
        className="w-full border-b border-line bg-transparent px-4 py-4 text-base outline-none" />
      <ul role="listbox" aria-label="Pages" className="max-h-80 overflow-y-auto py-2">{items.map((item, i) => <li key={item.href} role="option" aria-selected={i === active}>
        <button type="button" onClick={() => go(item.href)} onMouseEnter={() => setActive(i)} className={`flex w-full items-center justify-between px-4 py-2.5 text-left text-sm ${i === active ? 'bg-surface-3' : ''}`}>
          <span>{item.title}</span><span className="cye-label text-subtle">{item.group}</span></button></li>)}
        {!items.length && <li className="px-4 py-3 text-sm text-muted">No matching page</li>}</ul>
    </div>}
  </dialog>;
}
