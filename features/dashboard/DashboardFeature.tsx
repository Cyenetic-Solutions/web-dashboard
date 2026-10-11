"use client";
import { LinkButton } from '@/components/ui/Button';
import PageHeader from '@/components/ui/PageHeader';
import { Async } from '@/components/ui/States';
import { useAuth } from '@/providers/AuthProvider';
import { useResource } from '@/providers/useResource';
import { loadDashboard } from '@/services/dashboard';
import DashboardCharts from './DashboardCharts';
import DashboardKpis from './DashboardKpis';
import DashboardLists from './DashboardLists';

/** Overview: role-scoped KPIs, charts, recent audit activity and upcoming work, all from the API. */
export default function DashboardFeature() {
  const { session, can } = useAuth();
  const state = useResource(loadDashboard, 'dashboard');
  const first = (session?.name ?? '').split(' ')[0];
  return <>
    <PageHeader eyebrow="Overview" title={first ? `Welcome back, ${first}` : 'Operations overview'} description="Live numbers from the API, scoped to your role."
      actions={<>
        {can('content:write') && <LinkButton href="/content/posts" variant="secondary">New post</LinkButton>}
        {can('crm:write') && <LinkButton href="/crm/inquiries" variant="secondary">New inquiry</LinkButton>}
        {can('engagements:write') && <LinkButton href="/ops/engagements">New engagement</LinkButton>}
      </>} />
    <Async state={state} module="Dashboard analytics" rows={6}>{(data) => <div className="space-y-6 cye-rise">
      <DashboardKpis summary={data.summary} />
      <DashboardCharts charts={data.charts} />
      <DashboardLists activity={data.activity} upcoming={data.upcoming} />
    </div>}</Async>
  </>;
}
