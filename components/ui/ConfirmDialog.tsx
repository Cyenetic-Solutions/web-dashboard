"use client";
import { useEffect, useRef, useState, type ReactNode } from 'react';
import Button from './Button';
import { controlClass } from './Field';

/** Modal confirmation for destructive actions; optionally requires typing a phrase (such as the record title) first. */
export default function ConfirmDialog({ open, title, children, confirmLabel, typeToConfirm, pending, error, onConfirm, onCancel }: {
  open: boolean; title: string; children: ReactNode; confirmLabel: string; typeToConfirm?: string; pending?: boolean; error?: string;
  onConfirm: () => void; onCancel: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => { const d = ref.current; if (!d) return; if (open && !d.open) d.showModal(); if (!open && d.open) d.close(); }, [open]);
  return <dialog ref={ref} aria-label={title} onClose={onCancel} className="m-auto w-[calc(100%-2rem)] max-w-md border border-line-strong bg-surface p-0 text-ink backdrop:bg-black/70">
    {open && <Body {...{ title, confirmLabel, typeToConfirm, pending, error, onConfirm, onCancel }}>{children}</Body>}
  </dialog>;
}

function Body({ title, children, confirmLabel, typeToConfirm, pending, error, onConfirm, onCancel }: {
  title: string; children: ReactNode; confirmLabel: string; typeToConfirm?: string; pending?: boolean; error?: string; onConfirm: () => void; onCancel: () => void;
}) {
  const [typed, setTyped] = useState('');
  const blocked = !!typeToConfirm && typed.trim() !== typeToConfirm.trim();
  return <div className="space-y-4 p-5">
      <h2 className="text-lg font-semibold">{title}</h2>
      <div className="text-sm text-muted">{children}</div>
      {typeToConfirm && <label className="block text-sm"><span className="mb-1.5 block font-medium">Type <span className="font-mono text-ink">{typeToConfirm}</span> to confirm</span>
        <input value={typed} onChange={(e) => setTyped(e.target.value)} className={controlClass} autoComplete="off" /></label>}
      {error && <p role="alert" className="text-sm text-danger">{error}</p>}
      <div className="flex flex-wrap justify-end gap-2">
        <Button type="button" variant="ghost" onClick={onCancel}>Cancel</Button>
        <Button type="button" variant="danger" loading={pending} disabled={blocked} onClick={onConfirm}>{confirmLabel}</Button>
      </div>
    </div>;
}
