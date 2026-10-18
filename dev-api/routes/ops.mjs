// War-Room operations for the local dev API: engagements, findings and retests.
// Deliverable PDFs and certificates answer 501: the dev API cannot generate or sign them honestly.
import { parse31, score31, severityOf } from '../../services/cvss.ts';
import { engagementStatuses, findingStatuses, retestStatuses, severities, testingModes } from '../../services/ops.schema.ts';
import { clientIp, requirePermission } from '../lib/auth.mjs';
import { badRequest, matches, notFound, notImplemented, paginate } from '../lib/http.mjs';
import { appendAudit } from '../lib/store.mjs';

const milestoneTitles = ['Kick-off', 'Reconnaissance', 'Exploitation', 'Reporting', 'Retest'];
const closed = new Set(['FIXED_VERIFIED', 'RISK_ACCEPTED', 'FALSE_POSITIVE']);
const isoDate = /^\d{4}-\d{2}-\d{2}$/;

/** Creates an engagement with its ENG-YYYY-#### code and default milestones; shared with inquiry conversion. */
export function createEngagementRecord(store, input, actor) {
  const year = new Date().getFullYear();
  const start = Date.parse(input.startDate), end = input.endDate ? Date.parse(input.endDate) : start + 28 * 86400_000;
  const step = (end - start) / (milestoneTitles.length - 1);
  const engagement = { id: store.id(), code: `ENG-${year}-${String(store.next(`eng-${year}`)).padStart(4, '0')}`, projectName: input.projectName, clientOrganization: input.clientOrganization,
    auditType: input.auditType, additionalCategories: [], testingMode: input.testingMode, status: 'PLANNED', startDate: input.startDate, endDate: input.endDate ?? null,
    leadAuditor: { id: actor.user.id, fullName: actor.user.fullName }, rulesOfEngagement: input.rulesOfEngagement ?? null, scopeAssets: [], members: [],
    milestones: milestoneTitles.map((title, i) => ({ id: store.id(), title, dueDate: new Date(start + step * i).toISOString().slice(0, 10), completedAt: null, sortOrder: i })) };
  store.data.engagements.push(engagement);
  store.save();
  return engagement;
}

export function opsRoutes(router, { store }) {
  const admin = '/api/v1/admin';
  const audit = (ctx, actor, action, type, id, summary) => appendAudit(store, { actorEmail: actor.user.email, actorName: actor.user.fullName, action, resourceType: type, resourceId: id, summary, ipAddress: clientIp(ctx.req) });
  /** Auditors only see engagements they lead or are members of; Super Admin sees all. */
  const visible = (actor, e) => actor.role === 'Super Admin' || e.leadAuditor?.id === actor.user.id || e.members.some((m) => m.userId === actor.user.id);
  const engagementOf = (actor, id) => { const e = store.data.engagements.find((x) => x.id === id); if (!e || !visible(actor, e)) throw notFound('Engagement not found'); return e; };
  const view = (e) => {
    const open = store.data.findings.filter((f) => f.engagementId === e.id && !closed.has(f.status));
    const done = e.milestones.filter((m) => m.completedAt).length;
    return { ...e, progressPercent: Math.round((done / Math.max(1, e.milestones.length)) * 100),
      openBySeverity: Object.fromEntries(severities.map((s) => [s, open.filter((f) => f.severity === s).length]).filter(([, n]) => n > 0)) };
  };
  const findingView = (f) => {
    const latest = store.data.retests.filter((r) => r.findingId === f.id).at(-1);
    return { ...f, engagementCode: store.data.engagements.find((e) => e.id === f.engagementId)?.code, retestStatus: latest?.status ?? null, hasProofVideo: false };
  };
  const findingOf = (actor, id) => { const f = store.data.findings.find((x) => x.id === id); if (!f) throw notFound('Finding not found'); engagementOf(actor, f.engagementId); return f; };

  router.get(`${admin}/engagements`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'engagements:read');
    const status = ctx.url.searchParams.get('status'), q = ctx.url.searchParams.get('q');
    return paginate(store.data.engagements.filter((e) => visible(actor, e) && (!status || e.status === status) && matches(e, q, ['code', 'projectName', 'clientOrganization'])).reverse().map(view), ctx.url);
  });
  router.get(`${admin}/engagements/:id`, async (ctx) => { const actor = ctx.actor(); requirePermission(actor, 'engagements:read'); return { data: view(engagementOf(actor, ctx.params.id)) }; });
  router.post(`${admin}/engagements`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'engagements:write');
    const b = await ctx.json();
    const errors = {};
    for (const key of ['projectName', 'clientOrganization', 'auditType']) if (!String(b[key] ?? '').trim()) errors[key] = ['Required'];
    if (!testingModes.includes(b.testingMode)) errors.testingMode = ['Choose a testing mode'];
    if (!isoDate.test(b.startDate ?? '')) errors.startDate = ['Use a valid date'];
    if (b.endDate && (!isoDate.test(b.endDate) || b.endDate < b.startDate)) errors.endDate = ['End date must be after the start date'];
    if (Object.keys(errors).length) throw badRequest('Some fields are invalid.', errors);
    const e = createEngagementRecord(store, { ...b, projectName: b.projectName.trim(), clientOrganization: b.clientOrganization.trim(), auditType: b.auditType.trim() }, actor);
    audit(ctx, actor, 'ENGAGEMENT_CREATED', 'ENGAGEMENT', e.id, `Created ${e.code}`);
    ctx.res.statusCode = 201;
    return { data: view(e) };
  });
  router.post(`${admin}/engagements/:id/status`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'engagements:write');
    const e = engagementOf(actor, ctx.params.id); const { status } = await ctx.json();
    if (!engagementStatuses.includes(status)) throw badRequest('Unknown status.');
    const from = e.status; e.status = status;
    audit(ctx, actor, 'ENGAGEMENT_STATUS', 'ENGAGEMENT', e.id, `${e.code}: ${from} → ${status}`);
    return { data: view(e) };
  });
  router.patch(`${admin}/engagements/:id/milestones/:milestoneId`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'engagements:write');
    const e = engagementOf(actor, ctx.params.id); const m = e.milestones.find((x) => x.id === ctx.params.milestoneId); if (!m) throw notFound('Milestone not found');
    m.completedAt = (await ctx.json()).completed ? new Date().toISOString() : null;
    audit(ctx, actor, 'MILESTONE_UPDATED', 'ENGAGEMENT', e.id, `${e.code}: ${m.title} ${m.completedAt ? 'done' : 'reopened'}`);
    return { data: m };
  });

  /** Validates finding input and recomputes v3.1 scores from the vector unless an override reason is given. */
  const findingFields = (b) => {
    const errors = {};
    if (!String(b.title ?? '').trim()) errors.title = ['Required'];
    if (!String(b.affectedEndpoint ?? '').trim()) errors.affectedEndpoint = ['Required'];
    if (!severities.includes(b.severity)) errors.severity = ['Choose a severity'];
    if (!findingStatuses.includes(b.status)) errors.status = ['Choose a status'];
    if (!['V3_1', 'V4_0'].includes(b.cvssVersion)) errors.cvssVersion = ['Choose a CVSS version'];
    let { cvssScore, severity } = b;
    if (b.cvssVersion === 'V3_1' && b.cvssVector) {
      const vector = parse31(b.cvssVector);
      if (!vector) errors.cvssVector = ['Enter a complete CVSS 3.1 base vector'];
      else { cvssScore = score31(vector); if (!b.severityOverrideReason) severity = severityOf(cvssScore); }
    }
    if (Object.keys(errors).length) throw badRequest('Some fields are invalid.', errors);
    return { title: b.title.trim(), description: String(b.description ?? ''), severity, severityOverrideReason: b.severityOverrideReason || null, cvssVersion: b.cvssVersion,
      cvssVector: b.cvssVector || null, cvssScore: cvssScore ?? null, cweId: b.cweId || null, affectedEndpoint: b.affectedEndpoint.trim(), pocText: b.pocText || null,
      remediationGuidance: b.remediationGuidance || null, references: Array.isArray(b.references) ? b.references.map(String).slice(0, 20) : [], status: b.status };
  };
  router.get(`${admin}/findings`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'findings:read');
    const p = ctx.url.searchParams;
    const list = store.data.findings.filter((f) => { const e = store.data.engagements.find((x) => x.id === f.engagementId); return e && visible(actor, e); })
      .filter((f) => (!p.get('engagementId') || f.engagementId === p.get('engagementId')) && (!p.get('severity') || f.severity === p.get('severity')) && (!p.get('status') || f.status === p.get('status')) && matches(f, p.get('q'), ['title', 'referenceCode', 'affectedEndpoint']));
    return paginate(list.map(findingView).sort((a, b) => (b.cvssScore ?? 0) - (a.cvssScore ?? 0)), ctx.url);
  });
  router.get(`${admin}/findings/:id`, async (ctx) => { const actor = ctx.actor(); requirePermission(actor, 'findings:read'); return { data: findingView(findingOf(actor, ctx.params.id)) }; });
  router.post(`${admin}/engagements/:id/findings`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'findings:write');
    const e = engagementOf(actor, ctx.params.id); const fields = findingFields(await ctx.json());
    const f = { id: store.id(), engagementId: e.id, referenceCode: `F-${String(store.next(`finding-${e.id}`)).padStart(3, '0')}`, ...fields, isVerified: false, updatedAt: new Date().toISOString() };
    store.data.findings.push(f);
    audit(ctx, actor, 'FINDING_CREATED', 'FINDING', f.id, `${e.code} ${f.referenceCode} ${f.severity}`);
    ctx.res.statusCode = 201;
    return { data: findingView(f) };
  });
  router.patch(`${admin}/findings/:id`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'findings:write');
    const f = findingOf(actor, ctx.params.id); Object.assign(f, findingFields(await ctx.json()), { updatedAt: new Date().toISOString() });
    audit(ctx, actor, 'FINDING_UPDATED', 'FINDING', f.id, `${f.referenceCode} updated`);
    return { data: findingView(f) };
  });
  router.post(`${admin}/findings/:id/verify`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'findings:write');
    const f = findingOf(actor, ctx.params.id); f.isVerified = Boolean((await ctx.json()).isVerified); f.updatedAt = new Date().toISOString();
    audit(ctx, actor, f.isVerified ? 'FINDING_VERIFIED' : 'FINDING_UNVERIFIED', 'FINDING', f.id, f.referenceCode);
    return { data: findingView(f) };
  });

  const retestView = (r) => { const f = store.data.findings.find((x) => x.id === r.findingId); return { ...r, findingRef: f.referenceCode, findingTitle: f.title, severity: f.severity, engagementCode: store.data.engagements.find((e) => e.id === f.engagementId)?.code ?? '' }; };
  router.get(`${admin}/findings/:id/retests`, async (ctx) => { const actor = ctx.actor(); requirePermission(actor, 'findings:read'); findingOf(actor, ctx.params.id); return paginate(store.data.retests.filter((r) => r.findingId === ctx.params.id).map(retestView).reverse(), ctx.url); });
  router.get(`${admin}/retests`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'findings:read');
    const engagementId = ctx.url.searchParams.get('engagementId');
    const list = store.data.retests.filter((r) => { const f = store.data.findings.find((x) => x.id === r.findingId); const e = f && store.data.engagements.find((x) => x.id === f.engagementId); return e && visible(actor, e) && (!engagementId || e.id === engagementId); });
    return paginate(list.map(retestView).reverse(), ctx.url);
  });
  router.post(`${admin}/findings/:id/retests`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'retests:request');
    const f = findingOf(actor, ctx.params.id);
    const r = { id: store.id(), findingId: f.id, status: 'REQUESTED', requestedNote: String((await ctx.json()).requestedNote ?? '').trim() || null, resultNote: null, scheduledFor: null, assignedTo: null, updatedAt: new Date().toISOString() };
    store.data.retests.push(r); f.status = 'READY_FOR_RETEST';
    audit(ctx, actor, 'RETEST_REQUESTED', 'FINDING', f.id, `${f.referenceCode} retest requested`);
    ctx.res.statusCode = 201;
    return { data: retestView(r) };
  });
  router.patch(`${admin}/retests/:id`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'retests:resolve');
    const r = store.data.retests.find((x) => x.id === ctx.params.id); if (!r) throw notFound('Retest not found');
    const f = findingOf(actor, r.findingId); const { status, resultNote } = await ctx.json();
    if (!retestStatuses.includes(status)) throw badRequest('Unknown status.');
    Object.assign(r, { status, resultNote: resultNote?.trim() || r.resultNote, updatedAt: new Date().toISOString(), assignedTo: r.assignedTo ?? { id: actor.user.id, fullName: actor.user.fullName } });
    if (status === 'PASSED') f.status = 'FIXED_VERIFIED';
    if (status === 'FAILED') f.status = 'OPEN';
    f.updatedAt = r.updatedAt;
    audit(ctx, actor, 'RETEST_UPDATED', 'FINDING', f.id, `${f.referenceCode} retest ${status}`);
    return { data: retestView(r) };
  });

  for (const path of [`${admin}/engagements/:id/deliverables`, `${admin}/engagements/:id/deliverables/:did/finalize`]) {
    router.get(path, async () => { throw notImplemented('Report PDF generation'); });
    router.post(path, async () => { throw notImplemented('Report PDF generation'); });
  }
  router.get(`${admin}/certificates`, async () => { throw notImplemented('Certificate signing'); });
  router.post(`${admin}/engagements/:id/certificate`, async () => { throw notImplemented('Certificate signing'); });
  router.post(`${admin}/certificates/:id/revoke`, async () => { throw notImplemented('Certificate signing'); });
}
