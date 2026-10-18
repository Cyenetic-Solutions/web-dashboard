// /api/v1/admin/dashboard: KPIs, charts, activity and upcoming items computed from stored records.
import { can } from '../../services/permissions.ts';
import { severities } from '../../services/ops.schema.ts';

const closed = new Set(['FIXED_VERIFIED', 'RISK_ACCEPTED', 'FALSE_POSITIVE']);
const openPipeline = ['NEW', 'SCOPING_CALL', 'RFP_REVIEW', 'PROPOSAL_SENT'];
const day = 86400_000;

export function dashboardRoutes(router, { store }) {
  const base = '/api/v1/admin/dashboard';
  const guard = (ctx) => { const actor = ctx.actor(); return (permission) => can(actor.role, permission); };
  const leadsBetween = (from, to) => store.data.leads.filter((l) => { const t = Date.parse(l.downloadedAt); return t >= from && t < to; }).length;

  router.get(`${base}/summary`, async (ctx) => {
    const may = guard(ctx); const now = Date.now();
    const current = leadsBetween(now - 30 * day, now), previous = leadsBetween(now - 60 * day, now - 30 * day);
    return { data: {
      openInquiries: may('crm:read') ? store.data.inquiries.filter((i) => openPipeline.includes(i.status)).length : null,
      activeEngagements: may('engagements:read') ? store.data.engagements.filter((e) => ['ACTIVE', 'REPORTING', 'RETESTING'].includes(e.status)).length : null,
      openCriticalHigh: may('findings:read') ? store.data.findings.filter((f) => !closed.has(f.status) && ['CRITICAL', 'HIGH'].includes(f.severity)).length : null,
      downloads30d: may('crm:read') ? current : null,
      downloadsDeltaPct: may('crm:read') && previous > 0 ? Math.round(((current - previous) / previous) * 100) : null,
      publishedPosts: may('content:read') ? store.data.content.filter((r) => r.kind === 'posts' && r.status === 'published').length : null,
      confirmedSubscribers: may('crm:read') ? store.data.subscribers.filter((s) => s.status === 'CONFIRMED').length : null,
    } };
  });
  router.get(`${base}/charts`, async (ctx) => {
    const may = guard(ctx); const today = new Date(new Date().toISOString().slice(0, 10)).getTime();
    const count = (list, key, values) => values.map((value) => ({ [key]: value, count: list.filter((item) => item[key] === value).length }));
    return { data: {
      pipeline: may('crm:read') ? count(store.data.inquiries, 'status', ['NEW', 'SCOPING_CALL', 'RFP_REVIEW', 'PROPOSAL_SENT', 'RETAINER_WON', 'LOST']) : [],
      downloadsPerDay: may('crm:read') ? Array.from({ length: 30 }, (_, i) => { const start = today - (29 - i) * day; return { date: new Date(start).toISOString().slice(0, 10), count: leadsBetween(start, start + day) }; }) : [],
      findingsBySeverity: may('findings:read') ? count(store.data.findings.filter((f) => !closed.has(f.status)), 'severity', [...severities]) : [],
      engagementsByStatus: may('engagements:read') ? count(store.data.engagements, 'status', ['PLANNED', 'ACTIVE', 'REPORTING', 'RETESTING', 'COMPLETED', 'ON_HOLD', 'CANCELLED']).filter((r) => r.count > 0) : [],
    } };
  });
  router.get(`${base}/activity`, async (ctx) => {
    guard(ctx);
    const limit = Math.min(50, Number(ctx.url.searchParams.get('limit')) || 12);
    return { data: store.data.auditLogs.slice(-limit).reverse().map((e) => ({ id: e.id, actorName: e.actorName ?? e.actorEmail, action: e.action, summary: e.summary ?? e.action, resourceType: e.resourceType, createdAt: e.createdAt })) };
  });
  router.get(`${base}/upcoming`, async (ctx) => {
    const may = guard(ctx);
    const days = Math.min(60, Number(ctx.url.searchParams.get('days')) || 7);
    const horizon = Date.now() + days * day, start = Date.now() - day;
    const soon = (iso) => { const t = Date.parse(iso); return t >= start && t <= horizon; };
    const items = [];
    if (may('engagements:read')) for (const e of store.data.engagements) for (const m of e.milestones) if (!m.completedAt && soon(m.dueDate)) items.push({ kind: 'MILESTONE', title: m.title, dueAt: new Date(m.dueDate).toISOString(), context: e.code });
    if (may('content:read')) for (const r of store.data.content) if (r.kind === 'posts' && r.status === 'scheduled' && r.data.publish_date && soon(r.data.publish_date)) items.push({ kind: 'SCHEDULED_POST', title: r.data.title, dueAt: new Date(r.data.publish_date).toISOString(), context: r.slug });
    if (may('findings:read')) for (const t of store.data.retests) if (t.scheduledFor && soon(t.scheduledFor)) items.push({ kind: 'RETEST', title: store.data.findings.find((f) => f.id === t.findingId)?.title ?? 'Retest', dueAt: t.scheduledFor, context: null });
    return { data: items.sort((a, b) => a.dueAt.localeCompare(b.dueAt)) };
  });
}
