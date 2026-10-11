import { age, formatDate, initials, label } from '@/components/format';
import { Pill } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/States';
import type { Activity, Upcoming } from '@/services/dashboard';

/** Recent audit activity and the next seven days of milestones, scheduled posts and retests. */
export default function DashboardLists({ activity, upcoming }: { activity: Activity[]; upcoming: Upcoming[] }) {
  return <div className="grid gap-3 lg:grid-cols-[1.4fr_1fr]">
    <section className="border border-line bg-surface p-4 sm:p-5"><h2 className="cye-label text-muted">Recent activity</h2>
      {activity.length ? <ol className="mt-4 divide-y divide-[var(--border)]">{activity.map((a) => <li key={a.id} className="flex gap-3 py-3">
        <span aria-hidden="true" className="grid size-9 shrink-0 place-items-center bg-surface-3 font-mono text-xs">{initials(a.actorName ?? 'System')}</span>
        <div className="min-w-0 flex-1"><p className="text-sm"><span className="font-medium">{a.actorName ?? 'System'}</span> <span className="text-muted">{a.summary}</span></p>
          <p className="mt-0.5 font-mono text-[11px] text-subtle">{label(a.action)} · {label(a.resourceType)} · {age(a.createdAt)} ago</p></div></li>)}</ol>
        : <div className="mt-4"><EmptyState title="No activity yet">Actions taken in the dashboard appear here from the audit log.</EmptyState></div>}
    </section>
    <section className="border border-line bg-surface p-4 sm:p-5"><h2 className="cye-label text-muted">Upcoming · 7 days</h2>
      {upcoming.length ? <ul className="mt-4 space-y-3">{upcoming.map((u) => <li key={`${u.kind}-${u.title}-${u.dueAt}`} className="border-l-2 border-accent pl-3">
        <div className="flex flex-wrap items-center gap-2"><Pill tone={u.kind === 'RETEST' ? 'warning' : u.kind === 'MILESTONE' ? 'accent' : 'info'}>{label(u.kind)}</Pill><span className="font-mono text-xs text-muted">{formatDate(u.dueAt, true)}</span></div>
        <p className="mt-1 text-sm">{u.title}</p>{u.context && <p className="text-xs text-subtle">{u.context}</p>}</li>)}</ul>
        : <div className="mt-4"><EmptyState title="Nothing due">No milestones, scheduled posts or retests in the next week.</EmptyState></div>}
    </section>
  </div>;
}
