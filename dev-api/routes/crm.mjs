// /api/v1/admin/inquiries, /report-leads and /newsletter for the local dev API.
import { clientIp, requirePermission } from '../lib/auth.mjs';
import { badRequest, matches, notFound, paginate } from '../lib/http.mjs';
import { appendAudit } from '../lib/store.mjs';
import { createEngagementRecord } from './ops.mjs';

const csvCell = (value) => { const text = String(value ?? ''); return /[",\n\r]/.test(text) || /^[=+\-@]/.test(text) ? `"${text.replace(/^([=+\-@])/, "'$1").replace(/"/g, '""')}"` : text; };
const toCsv = (rows, columns) => [columns.join(','), ...rows.map((row) => columns.map((c) => csvCell(row[c])).join(','))].join('\r\n');
// Same values as services/crm.ts (that module imports the browser transport, so it cannot load in Node).
const inquiryStatuses = ['NEW', 'SCOPING_CALL', 'RFP_REVIEW', 'PROPOSAL_SENT', 'RETAINER_WON', 'LOST'];
const subscriberStatuses = ['PENDING', 'CONFIRMED', 'UNSUBSCRIBED', 'BOUNCED'];
const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const noteView = (note) => { const copy = { ...note }; delete copy.inquiryId; return copy; };

export function crmRoutes(router, { store }) {
  const base = '/api/v1/admin/inquiries';
  const find = (id) => store.data.inquiries.find((i) => i.id === id) ?? (() => { throw notFound('Inquiry not found'); })();
  const audit = (ctx, actor, action, inquiry, summary) => appendAudit(store, { actorEmail: actor.user.email, actorName: actor.user.fullName, action, resourceType: 'INQUIRY', resourceId: inquiry.id, summary, ipAddress: clientIp(ctx.req) });

  router.get(`${base}/board`, async (ctx) => {
    requirePermission(ctx.actor(), 'crm:read');
    const board = Object.fromEntries(inquiryStatuses.map((s) => [s, []]));
    for (const inquiry of store.data.inquiries) board[inquiry.status].push(inquiry);
    for (const list of Object.values(board)) list.sort((a, b) => a.kanbanPosition - b.kanbanPosition);
    return { data: board };
  });
  router.post(base, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'crm:write');
    const body = await ctx.json();
    const fullName = String(body.fullName ?? '').trim(), workEmail = String(body.workEmail ?? '').trim().toLowerCase();
    if (!fullName || !emailPattern.test(workEmail)) throw badRequest('Name and a valid work email are required.', { ...(!fullName ? { fullName: ['Required'] } : {}), ...(!emailPattern.test(workEmail) ? { workEmail: ['Enter a valid email'] } : {}) });
    const last = Math.max(0, ...store.data.inquiries.filter((i) => i.status === 'NEW').map((i) => i.kanbanPosition));
    const inquiry = { id: store.id(), fullName, workEmail, company: body.company?.trim() || null, scopeDetails: body.scopeDetails?.trim() || null, phone: null, sector: null,
      serviceType: null, serviceDomain: null, targetEnvironment: null, budgetRange: null, desiredStartDate: null, preferredContact: null, source: 'MANUAL', status: 'NEW',
      kanbanPosition: last + 1024, dealValue: null, currency: 'USD', lostReason: null, assignedTo: { id: actor.user.id, fullName: actor.user.fullName }, convertedEngagementId: null, createdAt: new Date().toISOString() };
    store.data.inquiries.push(inquiry);
    audit(ctx, actor, 'INQUIRY_CREATED', inquiry, `Added inquiry from ${inquiry.company ?? fullName}`);
    ctx.res.statusCode = 201;
    return { data: inquiry };
  });
  router.patch(`${base}/:id`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'crm:write');
    const inquiry = find(ctx.params.id); const body = await ctx.json();
    if ('dealValue' in body) { if (body.dealValue !== null && !(Number(body.dealValue) >= 0)) throw badRequest('Deal value must be a positive number.'); inquiry.dealValue = body.dealValue === null ? null : Number(body.dealValue); }
    if (typeof body.currency === 'string' && /^[A-Z]{3}$/.test(body.currency)) inquiry.currency = body.currency;
    audit(ctx, actor, 'INQUIRY_UPDATED', inquiry, 'Updated deal value');
    return { data: inquiry };
  });
  router.post(`${base}/:id/move`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'crm:write');
    const inquiry = find(ctx.params.id); const { status, position, lostReason } = await ctx.json();
    if (!inquiryStatuses.includes(status) || typeof position !== 'number') throw badRequest('A valid status and position are required.');
    if (status === 'LOST' && !String(lostReason ?? '').trim()) throw badRequest('Give a reason for marking the inquiry lost.', { lostReason: ['Required'] });
    const from = inquiry.status;
    Object.assign(inquiry, { status, kanbanPosition: position, lostReason: status === 'LOST' ? String(lostReason).trim() : null });
    audit(ctx, actor, 'INQUIRY_MOVED', inquiry, `${from} → ${status}`);
    return { data: inquiry };
  });
  router.get(`${base}/:id/notes`, async (ctx) => {
    requirePermission(ctx.actor(), 'crm:read'); find(ctx.params.id);
    return { data: store.data.notes.filter((n) => n.inquiryId === ctx.params.id).map(noteView).reverse() };
  });
  router.post(`${base}/:id/notes`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'crm:write');
    const inquiry = find(ctx.params.id); const body = String((await ctx.json()).body ?? '').trim();
    if (!body || body.length > 5000) throw badRequest('Write a note of up to 5000 characters.', { body: ['Required'] });
    const note = { id: store.id(), inquiryId: inquiry.id, body, authorName: actor.user.fullName, createdAt: new Date().toISOString() };
    store.data.notes.push(note); store.save();
    ctx.res.statusCode = 201;
    return { data: noteView(note) };
  });
  router.post(`${base}/:id/convert`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'crm:write'); requirePermission(actor, 'engagements:write');
    const inquiry = find(ctx.params.id);
    if (inquiry.convertedEngagementId) return { data: { engagementId: inquiry.convertedEngagementId } };
    const engagement = createEngagementRecord(store, { projectName: `${inquiry.company ?? inquiry.fullName} assessment`, clientOrganization: inquiry.company ?? inquiry.fullName,
      auditType: inquiry.serviceType ?? 'Penetration test', testingMode: 'GREY_BOX', startDate: new Date().toISOString().slice(0, 10), rulesOfEngagement: inquiry.scopeDetails }, actor);
    Object.assign(inquiry, { convertedEngagementId: engagement.id, status: 'RETAINER_WON' });
    audit(ctx, actor, 'INQUIRY_CONVERTED', inquiry, `Converted to ${engagement.code}`);
    return { data: { engagementId: engagement.id } };
  });

  const since = (url) => { const from = Date.parse(url.searchParams.get('from') ?? ''); return Number.isNaN(from) ? 0 : from; };
  const leadsSince = (url) => store.data.leads.filter((l) => Date.parse(l.downloadedAt) >= since(url)).sort((a, b) => b.downloadedAt.localeCompare(a.downloadedAt));
  router.get('/api/v1/admin/report-leads', async (ctx) => { requirePermission(ctx.actor(), 'crm:read'); return paginate(leadsSince(ctx.url), ctx.url); });
  router.get('/api/v1/admin/report-leads/domains', async (ctx) => {
    requirePermission(ctx.actor(), 'crm:read');
    const domains = new Map();
    for (const lead of leadsSince(ctx.url)) {
      const entry = domains.get(lead.emailDomain) ?? { domain: lead.emailDomain, leads: 0, lastDownload: lead.downloadedAt, reports: [] };
      entry.leads += 1; if (!entry.reports.includes(lead.reportTitle)) entry.reports.push(lead.reportTitle);
      domains.set(lead.emailDomain, entry);
    }
    return { data: [...domains.values()].sort((a, b) => b.leads - a.leads) };
  });
  router.get('/api/v1/admin/report-leads/export.csv', async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'crm:export');
    appendAudit(store, { actorEmail: actor.user.email, action: 'LEADS_EXPORTED', resourceType: 'REPORT_LEAD', summary: 'Exported report-download leads', ipAddress: clientIp(ctx.req) });
    return ctx.csv(toCsv(leadsSince(ctx.url), ['fullName', 'email', 'companyName', 'emailDomain', 'isCorporate', 'reportTitle', 'downloadedAt']));
  });

  const subscribersFor = (url) => store.data.subscribers.filter((s) => (!url.searchParams.get('status') || s.status === url.searchParams.get('status')) && matches(s, url.searchParams.get('q'), ['email', 'fullName']));
  router.get('/api/v1/admin/newsletter', async (ctx) => { requirePermission(ctx.actor(), 'crm:read'); return paginate(subscribersFor(ctx.url).reverse(), ctx.url); });
  router.post('/api/v1/admin/newsletter', async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'crm:write');
    const body = await ctx.json(); const email = String(body.email ?? '').trim().toLowerCase();
    if (!emailPattern.test(email)) throw badRequest('Enter a valid email.', { email: ['Enter a valid email'] });
    if (store.data.subscribers.some((s) => s.email === email)) throw badRequest('That email is already subscribed.', { email: ['Already subscribed'] });
    const now = new Date().toISOString();
    const subscriber = { id: store.id(), email, fullName: body.fullName?.trim() || null, status: 'CONFIRMED', source: 'manual', tags: Array.isArray(body.tags) ? body.tags.map(String).slice(0, 10) : [], subscribedAt: now, confirmedAt: now };
    store.data.subscribers.push(subscriber);
    appendAudit(store, { actorEmail: actor.user.email, action: 'SUBSCRIBER_ADDED', resourceType: 'SUBSCRIBER', resourceId: subscriber.id, summary: `Added ${email}`, ipAddress: clientIp(ctx.req) });
    ctx.res.statusCode = 201;
    return { data: subscriber };
  });
  router.patch('/api/v1/admin/newsletter/:id', async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'crm:write');
    const subscriber = store.data.subscribers.find((s) => s.id === ctx.params.id); if (!subscriber) throw notFound('Subscriber not found');
    const { status } = await ctx.json(); if (!subscriberStatuses.includes(status)) throw badRequest('Unknown status.');
    subscriber.status = status;
    appendAudit(store, { actorEmail: actor.user.email, action: 'SUBSCRIBER_UPDATED', resourceType: 'SUBSCRIBER', resourceId: subscriber.id, summary: `${subscriber.email} → ${status}`, ipAddress: clientIp(ctx.req) });
    return { data: subscriber };
  });
  router.get('/api/v1/admin/newsletter/export.csv', async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'crm:export');
    appendAudit(store, { actorEmail: actor.user.email, action: 'SUBSCRIBERS_EXPORTED', resourceType: 'SUBSCRIBER', summary: 'Exported newsletter subscribers', ipAddress: clientIp(ctx.req) });
    return ctx.csv(toCsv(subscribersFor(ctx.url).map((s) => ({ ...s, tags: s.tags.join(' ') })), ['email', 'fullName', 'status', 'source', 'tags', 'subscribedAt', 'confirmedAt']));
  });
}
