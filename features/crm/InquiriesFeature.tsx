"use client";
import { useRouter } from 'next/navigation';
import { useState, type FormEvent } from 'react';
import Button from '@/components/ui/Button';
import Drawer from '@/components/ui/Drawer';
import { Input, Textarea } from '@/components/ui/Field';
import PageHeader from '@/components/ui/PageHeader';
import { Async } from '@/components/ui/States';
import { useAuth } from '@/providers/AuthProvider';
import { useResource } from '@/providers/useResource';
import { convertInquiry, createInquiry, loadBoard, moveInquiry, type Inquiry, type InquiryStatus } from '@/services/crm';
import InquiryBoard from './InquiryBoard';
import InquiryDetail from './InquiryDetail';

type Board = Record<InquiryStatus, Inquiry[]>;
const column = (items: Inquiry[] | undefined) => [...(items ?? [])].sort((a, b) => a.kanbanPosition - b.kanbanPosition);
function normalise(raw: Partial<Record<string, Inquiry[]>>): Board {
  return { NEW: column(raw.NEW), SCOPING_CALL: column(raw.SCOPING_CALL), RFP_REVIEW: column(raw.RFP_REVIEW), PROPOSAL_SENT: column(raw.PROPOSAL_SENT), RETAINER_WON: column(raw.RETAINER_WON), LOST: column(raw.LOST) };
}

/** Inquiry & scoping pipeline with manual entry, detail drawer and conversion to an engagement. */
export default function InquiriesFeature() {
  const { call, can } = useAuth();
  const router = useRouter();
  const state = useResource(async (t, s) => normalise(await loadBoard(t, s)), 'board');
  const [open, setOpen] = useState<Inquiry | null>(null);
  const [creating, setCreating] = useState(false);
  const [won, setWon] = useState<Inquiry | null>(null);
  async function persist(item: Inquiry, status: InquiryStatus, position: number, lostReason?: string) {
    const before = state.data;
    const place = (b: Board, next: Inquiry) => normalise({ ...b, [item.status]: b[item.status].filter((i) => i.id !== item.id), [status]: [...b[status].filter((i) => i.id !== item.id), next] });
    state.setData((b) => (b ? place(b, { ...item, status, kanbanPosition: position, lostReason: lostReason ?? item.lostReason }) : b));
    try { const saved = await call((t) => moveInquiry(item.id, status, position, t, lostReason)); state.setData((b) => (b ? place(b, saved) : b)); if (status === 'RETAINER_WON') setWon(saved); }
    catch (error) { state.setData(() => before); throw error; }
  }
  async function convert(item: Inquiry) { const { engagementId } = await call((t) => convertInquiry(item.id, t)); router.push(`/ops/engagements/${engagementId}`); }
  return <>
    <PageHeader eyebrow="Growth & CRM" title="Inquiry pipeline" description="From first contact to retainer. Drag cards between stages on desktop, or use Move to on any device."
      actions={can('crm:write') && <Button onClick={() => setCreating(true)}>New inquiry</Button>} />
    {won && <div role="status" className="mb-4 flex flex-wrap items-center justify-between gap-3 border border-success bg-surface p-4 text-sm">
      <span><strong>{won.company || won.fullName}</strong> moved to Retainer won.</span>
      <span className="flex gap-2">{can('engagements:write') && <Button size="sm" onClick={() => void convert(won)}>Create engagement</Button>}<Button size="sm" variant="ghost" onClick={() => setWon(null)}>Dismiss</Button></span></div>}
    <Async state={state} module="Inquiry pipeline" rows={6}>{(board) => <InquiryBoard board={board} canMove={can('crm:write')} onOpen={setOpen} persist={persist} />}</Async>
    <Drawer open={!!open} onClose={() => setOpen(null)} title={open ? open.company || open.fullName : 'Inquiry'}>{open && <InquiryDetail item={open} onConvert={() => void convert(open)} />}</Drawer>
    <NewInquiry open={creating} onClose={() => setCreating(false)} onCreated={(i) => { state.setData((b) => (b ? normalise({ ...b, NEW: [...b.NEW, i] }) : b)); setCreating(false); }} />
  </>;
}

function NewInquiry({ open, onClose, onCreated }: { open: boolean; onClose: () => void; onCreated: (item: Inquiry) => void }) {
  const { call } = useAuth();
  const [form, setForm] = useState({ fullName: '', workEmail: '', company: '', scopeDetails: '' });
  const [error, setError] = useState('');
  const [pending, setPending] = useState(false);
  async function submit(event: FormEvent) {
    event.preventDefault(); setPending(true); setError('');
    try { onCreated(await call((t) => createInquiry(form, t))); setForm({ fullName: '', workEmail: '', company: '', scopeDetails: '' }); }
    catch (err) { setError(err instanceof Error ? err.message : 'Could not create inquiry'); } finally { setPending(false); }
  }
  return <Drawer open={open} onClose={onClose} title="New inquiry"><form onSubmit={submit} className="space-y-4">
    <Input label="Full name" required value={form.fullName} onChange={(e) => setForm({ ...form, fullName: e.target.value })} />
    <Input label="Work email" type="email" required value={form.workEmail} onChange={(e) => setForm({ ...form, workEmail: e.target.value })} />
    <Input label="Company" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
    <Textarea label="Scope details" rows={5} value={form.scopeDetails} onChange={(e) => setForm({ ...form, scopeDetails: e.target.value })} />
    <p role="alert" className="text-sm text-danger">{error}</p><Button type="submit" loading={pending} className="w-full">Create inquiry</Button></form></Drawer>;
}
