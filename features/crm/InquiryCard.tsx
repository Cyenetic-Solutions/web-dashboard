import { age, money } from '@/components/format';
import { inquiryStatuses, type Inquiry, type InquiryStatus } from '@/services/crm';
import { sourceIcon, stageMeta } from './crm.data';

/** Draggable pipeline card with an accessible "Move to" control (also the mobile path). */
export default function InquiryCard({ item, canMove, onOpen, onMove, onDragStart }: { item: Inquiry; canMove: boolean; onOpen: () => void; onMove: (status: InquiryStatus) => void; onDragStart: () => void }) {
  return <article draggable={canMove} onDragStart={(e) => { e.dataTransfer.setData('text/plain', item.id); onDragStart(); }}
    className="group border border-line bg-surface-2 p-3 transition-[transform,border-color] duration-150 hover:-translate-y-0.5 hover:border-line-strong">
    <button type="button" onClick={onOpen} className="block w-full text-left">
      <p className="flex items-start justify-between gap-2"><span className="font-medium leading-snug">{item.company || item.fullName}</span>
        <span aria-label={item.source.toLowerCase().replace('_', ' ')} title={item.source} className="font-mono text-xs text-subtle">{sourceIcon[item.source]}</span></p>
      <p className="mt-1 truncate text-xs text-muted">{[item.serviceType, item.sector].filter(Boolean).join(' · ').replace(/_/g, ' ').toLowerCase() || item.workEmail}</p>
      <p className="mt-3 flex items-center justify-between font-mono text-[11px] text-subtle"><span>{age(item.createdAt)}</span><span className="text-ink">{money(item.dealValue, item.currency ?? 'USD')}</span>
        <span>{item.assignedTo ? item.assignedTo.fullName.split(' ')[0] : 'Unassigned'}</span></p>
    </button>
    {canMove && <label className="mt-2 flex items-center gap-2 border-t border-line pt-2 text-[11px] text-muted">Move to
      <select value={item.status} onChange={(e) => { const next = inquiryStatuses.find((s) => s === e.target.value); if (next && next !== item.status) onMove(next); }}
        aria-label={`Move ${item.company || item.fullName} to stage`} className="min-h-9 flex-1 border border-line bg-surface px-1 text-xs text-ink">
        {inquiryStatuses.map((s) => <option key={s} value={s}>{stageMeta[s].label}</option>)}</select></label>}
  </article>;
}
