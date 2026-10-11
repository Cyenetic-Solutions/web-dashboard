import KpiCard from '@/components/ui/KpiCard';
import type { DashboardSummary } from '@/services/dashboard';

/** Two per row on mobile, three on tablet, six on wide screens; hidden metrics (null) are omitted. */
export default function DashboardKpis({ summary }: { summary: DashboardSummary }) {
  const tiles = [
    { label: 'Open inquiries', value: summary.openInquiries },
    { label: 'Active engagements', value: summary.activeEngagements },
    { label: 'Crit + high open', value: summary.openCriticalHigh },
    { label: 'Downloads 30d', value: summary.downloads30d, delta: summary.downloadsDeltaPct },
    { label: 'Published posts', value: summary.publishedPosts },
    { label: 'Subscribers', value: summary.confirmedSubscribers },
  ].filter((t): t is { label: string; value: number; delta?: number | null } => t.value !== null);
  return <section aria-label="Key metrics" className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
    {tiles.map((t) => <KpiCard key={t.label} label={t.label} value={t.value} delta={t.delta} />)}
  </section>;
}
