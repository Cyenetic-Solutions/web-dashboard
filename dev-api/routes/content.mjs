// /api/v1/admin/content and the legacy CMS audit feed, validated with the dashboard's own schema.
import { contentInput, editorStatuses, kinds } from '../../services/content.schema.ts';
import { clientIp, requirePermission } from '../lib/auth.mjs';
import { HttpError, badRequest, notFound } from '../lib/http.mjs';
import { appendAudit } from '../lib/store.mjs';

export function contentRoutes(router, { store }) {
  const checkKind = (kind) => { if (!kinds.includes(kind)) throw notFound(`Unknown content kind ${kind}`); };

  router.get('/api/v1/admin/content/:kind', async (ctx) => {
    checkKind(ctx.params.kind);
    requirePermission(ctx.actor(), 'content:read');
    return store.data.content.filter((r) => r.kind === ctx.params.kind)
      .sort((a, b) => (a.kind === 'team' ? a.data.sort_order - b.data.sort_order : b.updatedAt.localeCompare(a.updatedAt)));
  });

  router.put('/api/v1/admin/content/:kind/:slug', async (ctx) => {
    const { kind, slug } = ctx.params;
    checkKind(kind);
    const actor = ctx.actor();
    requirePermission(actor, kind === 'team' ? 'team:write' : 'content:write');
    const parsed = contentInput.safeParse(await ctx.json());
    if (!parsed.success) {
      const fieldErrors = {};
      for (const issue of parsed.error.issues) (fieldErrors[issue.path.join('.') || 'form'] ??= []).push(issue.message);
      throw badRequest('Some fields are invalid.', fieldErrors);
    }
    const input = parsed.data;
    if (input.kind !== kind || input.slug !== slug) throw badRequest('The body kind and slug must match the URL.');
    if (!editorStatuses.includes(input.status)) requirePermission(actor, 'content:publish');

    const index = store.data.content.findIndex((r) => r.kind === kind && r.slug === slug);
    const current = index === -1 ? null : store.data.content[index];
    if ((current?.version ?? 0) !== input.version) {
      throw new HttpError(409, 'VERSION_CONFLICT', current ? 'Someone else saved this record. Reload it before saving again.' : 'This record no longer exists. Reload the list.');
    }
    if (kind === 'posts' && input.status === 'published' && input.data.is_featured) {
      const featured = store.data.content.filter((r) => r.kind === 'posts' && r.slug !== slug && r.status === 'published' && r.data.is_featured);
      if (featured.length >= 2) throw badRequest('Only two published posts can be featured. Unfeature another post first.', { 'data.is_featured': ['Only two published posts can be featured'] });
    }
    const record = { ...input, version: input.version + 1, updatedAt: new Date().toISOString() };
    if (current) store.data.content[index] = record; else store.data.content.push(record);
    const action = current ? (current.status !== record.status ? `CONTENT_${record.status.toUpperCase()}` : 'CONTENT_UPDATED') : 'CONTENT_CREATED';
    store.data.legacyAudit.push({ id: store.id(), actor: actor.user.email, action, createdAt: record.updatedAt, record });
    appendAudit(store, { actorEmail: actor.user.email, actorName: actor.user.fullName, action, resourceType: 'CONTENT', resourceId: `${kind}/${slug}`,
      summary: `${kind}/${slug} v${record.version} · ${record.status}`, ipAddress: clientIp(ctx.req), diff: { before: current?.data ?? null, after: record.data } });
    return record;
  });

  router.get('/api/v1/admin/audit', async (ctx) => {
    requirePermission(ctx.actor(), 'audit:read');
    return [...store.data.legacyAudit].reverse();
  });
}
