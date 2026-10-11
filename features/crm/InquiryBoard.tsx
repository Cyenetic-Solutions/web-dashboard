"use client";
import { useState } from 'react';
import Button from '@/components/ui/Button';
import Drawer from '@/components/ui/Drawer';
import { Textarea } from '@/components/ui/Field';
import Tabs from '@/components/ui/Tabs';
import { money } from '@/components/format';
import { inquiryStatuses, positionBetween, type Inquiry, type InquiryStatus } from '@/services/crm';
import { stageMeta } from './crm.data';
import InquiryCard from './InquiryCard';

type Board = Record<InquiryStatus, Inquiry[]>;
/** Six-column pipeline: drag between columns on desktop, column tabs and "Move to" on mobile. Moves are optimistic with rollback. */
export default function InquiryBoard({ board, canMove, onOpen, persist }: { board: Board; canMove: boolean; onOpen: (item: Inquiry) => void;
  persist: (item: Inquiry, status: InquiryStatus, position: number, lostReason?: string) => Promise<void> }) {
  const [column, setColumn] = useState<InquiryStatus>('NEW');
  const [dragging, setDragging] = useState<string | null>(null);
  const [lost, setLost] = useState<{ item: Inquiry; index: number } | null>(null);
  const [reason, setReason] = useState('');
  const [error, setError] = useState('');
  async function move(item: Inquiry, status: InquiryStatus, index = board[status].length) {
    if (status === 'LOST' && !lost) { setLost({ item, index }); setReason(''); return; }
    const target = board[status].filter((i) => i.id !== item.id);
    setError('');
    try { await persist(item, status, positionBetween(target[index - 1]?.kanbanPosition, target[index]?.kanbanPosition), status === 'LOST' ? reason.trim() : undefined); }
    catch (err) { setError(err instanceof Error ? err.message : 'Move failed; the card was returned.'); }
  }
  function drop(status: InquiryStatus, index?: number) {
    const item = inquiryStatuses.flatMap((s) => board[s]).find((i) => i.id === dragging);
    setDragging(null); if (item) void move(item, status, index);
  }
  return <>
    <div className="lg:hidden"><Tabs label="Pipeline stage" value={column} onChange={setColumn} tabs={inquiryStatuses.map((s) => ({ value: s, label: `${stageMeta[s].label} ${board[s].length}` }))} /></div>
    {error && <p role="alert" className="mt-3 text-sm text-danger">{error}</p>}
    <div className="mt-4 lg:mt-0 lg:grid lg:grid-cols-6 lg:gap-3 lg:overflow-x-auto">
      {inquiryStatuses.map((status) => {
        const items = board[status];
        const total = items.reduce((sum, i) => sum + (Number(i.dealValue) || 0), 0);
        return <section key={status} aria-label={stageMeta[status].label} onDragOver={(e) => { if (canMove) e.preventDefault(); }} onDrop={() => drop(status)}
          className={`${status === column ? 'block' : 'hidden'} min-w-0 border border-line bg-surface lg:block lg:min-w-[200px]`}>
          <header className="flex items-center justify-between border-b border-line px-3 py-2.5"><h2 className="cye-label">{stageMeta[status].label} <span className="text-subtle">{items.length}</span></h2>
            <span className="font-mono text-[11px] text-muted">{money(total)}</span></header>
          <ol className="min-h-24 space-y-2 p-2">{items.map((item, index) => <li key={item.id} onDragOver={(e) => e.preventDefault()} onDrop={(e) => { e.stopPropagation(); drop(status, index); }}>
            <InquiryCard item={item} canMove={canMove} onOpen={() => onOpen(item)} onMove={(s) => void move(item, s)} onDragStart={() => setDragging(item.id)} /></li>)}
            {!items.length && <li className="border border-dashed border-line p-4 text-center text-xs text-subtle">Drop cards here</li>}</ol>
        </section>;
      })}
    </div>
    <Drawer open={!!lost} onClose={() => setLost(null)} title="Mark inquiry as lost" footer={<>
      <Button variant="ghost" onClick={() => setLost(null)}>Cancel</Button>
      <Button variant="danger" disabled={!reason.trim()} onClick={() => { const l = lost; if (l) void move(l.item, 'LOST', l.index).finally(() => setLost(null)); }}>Mark lost</Button></>}>
      <Textarea label="Reason" required rows={4} maxLength={300} value={reason} onChange={(e) => setReason(e.target.value)} hint="Required. Helps explain pipeline losses later." />
    </Drawer>
  </>;
}
