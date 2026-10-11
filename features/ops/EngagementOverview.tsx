"use client";
import { formatDate, label } from '@/components/format';
import { useAuth } from '@/providers/AuthProvider';
import { completeMilestone } from '@/services/ops';
import type { Engagement } from '@/services/ops.schema';

/** Milestone timeline (vertical on mobile, horizontal track on desktop), scope assets, team and rules of engagement. */
export default function EngagementOverview({ engagement: e, onChange }: { engagement: Engagement; onChange: (e: Engagement) => void }) {
  const { call, can } = useAuth();
  const milestones = [...(e.milestones ?? [])].sort((a, b) => a.sortOrder - b.sortOrder);
  async function toggle(id: string, done: boolean) {
    await call((t) => completeMilestone(e.id, id, done, t));
    onChange({ ...e, milestones: milestones.map((m) => (m.id === id ? { ...m, completedAt: done ? new Date().toISOString() : null } : m)) });
  }
  return <div className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
    <section className="border border-line bg-surface p-4 sm:p-5"><h2 className="cye-label text-muted">Timeline · {formatDate(e.startDate)} → {formatDate(e.endDate)}</h2>
      <ol className="mt-4 space-y-0 lg:flex lg:gap-0">{milestones.map((m) => <li key={m.id} className="relative flex gap-3 pb-5 lg:flex-1 lg:flex-col lg:pb-0">
        <span aria-hidden="true" className="absolute left-[9px] top-5 h-full w-px bg-line lg:left-5 lg:top-[9px] lg:h-px lg:w-full" />
        <label className="relative z-10 flex size-5 shrink-0 cursor-pointer items-center justify-center border border-line-strong bg-surface has-[:checked]:border-accent has-[:checked]:bg-accent">
          <input type="checkbox" className="sr-only" checked={!!m.completedAt} disabled={!can('engagements:write')} onChange={(ev) => void toggle(m.id, ev.target.checked)} aria-label={`${m.title} complete`} />
          {m.completedAt && <span aria-hidden="true" className="text-[10px] text-cye-black">✓</span>}</label>
        <div className="lg:pr-3"><p className="text-sm font-medium">{m.title}</p><p className="font-mono text-[11px] text-subtle">{formatDate(m.dueDate)}</p></div></li>)}</ol>
      {!milestones.length && <p className="mt-3 text-sm text-muted">No milestones.</p>}
    </section>
    <section className="space-y-4 border border-line bg-surface p-4 sm:p-5">
      <div><h2 className="cye-label text-muted">Team</h2><ul className="mt-2 space-y-1 text-sm"><li>{e.leadAuditor?.fullName ?? 'No lead'} <span className="text-subtle">· Lead</span></li>
        {(e.members ?? []).map((m) => <li key={m.userId}>{m.fullName} <span className="text-subtle">· {m.roleLabel ?? 'Member'}</span></li>)}</ul></div>
      <div><h2 className="cye-label text-muted">Scope assets</h2>{(e.scopeAssets ?? []).length ? <ul className="mt-2 space-y-1">{(e.scopeAssets ?? []).map((a) => <li key={`${a.type}-${a.value}`} className="break-all font-mono text-xs"><span className="text-subtle">{label(a.type)}</span> {a.value}</li>)}</ul> : <p className="mt-2 text-sm text-muted">None listed.</p>}</div>
      {e.rulesOfEngagement && <div><h2 className="cye-label text-muted">Rules of engagement</h2><p className="mt-2 whitespace-pre-wrap text-sm">{e.rulesOfEngagement}</p></div>}
    </section>
  </div>;
}
