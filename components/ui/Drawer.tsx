"use client";
import { useEffect, useRef, type ReactNode } from 'react';

/** Modal sheet built on <dialog>: bottom sheet on mobile, right drawer from lg; Escape and backdrop close it. */
export default function Drawer({ open, onClose, title, children, footer }: { open: boolean; onClose: () => void; title: string; children: ReactNode; footer?: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const dialog = ref.current; if (!dialog) return; if (open && !dialog.open) dialog.showModal(); if (!open && dialog.open) dialog.close(); }, [open]);
  return <dialog ref={ref} aria-label={title} onClose={onClose} onClick={(e) => { if (e.target === ref.current) onClose(); }}
    className="cye-drawer m-0 mt-auto max-h-[92dvh] w-full max-w-none border-t border-line-strong bg-surface p-0 text-ink lg:ml-auto lg:mt-0 lg:h-dvh lg:max-h-none lg:w-[560px] lg:border-l lg:border-t-0">
    {open && <div className="flex h-full max-h-[92dvh] flex-col lg:max-h-none">
      <div className="flex items-center justify-between gap-4 border-b border-line px-5 py-4"><h2 className="font-semibold">{title}</h2>
        <button type="button" onClick={onClose} aria-label="Close" className="grid size-11 place-items-center border border-line hover:border-accent">✕</button></div>
      <div className="min-h-0 flex-1 overflow-y-auto px-5 py-5">{children}</div>
      {footer && <div className="flex flex-wrap justify-end gap-2 border-t border-line px-5 py-4">{footer}</div>}
    </div>}
  </dialog>;
}
