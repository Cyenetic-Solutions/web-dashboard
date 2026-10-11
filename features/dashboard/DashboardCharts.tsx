import { AreaChart, BarList, ChartCard, Donut } from '@/components/ui/Charts';
import { label } from '@/components/format';
import type { DashboardCharts as Charts } from '@/services/dashboard';

const severityColor = { CRITICAL: '#DC2626', HIGH: '#FF5C00', MEDIUM: '#EAB308', LOW: '#3B82F6', INFO: '#737373' } as const;
const statusColor = ['var(--accent)', 'var(--info)', 'var(--warning)', 'var(--success)', 'var(--text-subtle)', 'var(--danger)', 'var(--border-strong)'];

/** Pipeline funnel, downloads trend, open findings by severity and engagements by status. */
export default function DashboardCharts({ charts }: { charts: Charts }) {
  return <div className="grid gap-3 lg:grid-cols-2">
    <ChartCard title="Inquiry pipeline"><BarList label="Inquiries per status" data={charts.pipeline.map((p) => ({ label: label(p.status), value: p.count }))} /></ChartCard>
    <ChartCard title="Report downloads · 30 days"><AreaChart label="Report downloads per day" data={charts.downloadsPerDay.map((d) => ({ label: d.date.slice(5), value: d.count }))} /></ChartCard>
    <ChartCard title="Open findings by severity"><BarList label="Open findings by severity" data={charts.findingsBySeverity.map((s) => ({ label: label(s.severity), value: s.count, color: severityColor[s.severity] }))} /></ChartCard>
    <ChartCard title="Engagements by status"><Donut label="Engagements by status" data={charts.engagementsByStatus.map((s, i) => ({ label: label(s.status), value: s.count, color: statusColor[i % statusColor.length] }))} /></ChartCard>
  </div>;
}
