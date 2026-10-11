import { z } from 'zod';
import { dataOf, request } from './http';

const count = z.number().int().nonnegative();
const summarySchema = z.object({
  openInquiries: count.nullable(), activeEngagements: count.nullable(), openCriticalHigh: count.nullable(),
  downloads30d: count.nullable(), downloadsDeltaPct: z.number().nullable(), publishedPosts: count.nullable(), confirmedSubscribers: count.nullable(),
});
/** Role-scoped KPI numbers; a null value means the role may not see that metric. */
export type DashboardSummary = z.infer<typeof summarySchema>;
const chartsSchema = z.object({
  pipeline: z.array(z.object({ status: z.string(), count })), downloadsPerDay: z.array(z.object({ date: z.string(), count })),
  findingsBySeverity: z.array(z.object({ severity: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW', 'INFO']), count })),
  engagementsByStatus: z.array(z.object({ status: z.string(), count })),
});
export type DashboardCharts = z.infer<typeof chartsSchema>;
const activitySchema = z.object({ id: z.string(), actorName: z.string().nullable(), action: z.string(), summary: z.string(), resourceType: z.string(), createdAt: z.string() });
export type Activity = z.infer<typeof activitySchema>;
const upcomingSchema = z.object({ kind: z.enum(['MILESTONE', 'SCHEDULED_POST', 'RETEST']), title: z.string(), dueAt: z.string(), context: z.string().nullable() });
export type Upcoming = z.infer<typeof upcomingSchema>;

/** Loads KPIs, charts, activity and upcoming items in parallel (admin.md §6.6). */
export async function loadDashboard(token: string, signal: AbortSignal) {
  const get = (path: string) => request(`/api/v1/admin/dashboard${path}`, { token, signal });
  const [summary, charts, activity, upcoming] = await Promise.all([get('/summary'), get('/charts?range=30d'), get('/activity?limit=12'), get('/upcoming?days=7')]);
  return { summary: dataOf(summarySchema).parse(summary).data, charts: dataOf(chartsSchema).parse(charts).data,
    activity: dataOf(z.array(activitySchema)).parse(activity).data, upcoming: dataOf(z.array(upcomingSchema)).parse(upcoming).data };
}
