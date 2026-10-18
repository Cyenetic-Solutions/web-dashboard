// Staff users, the hash-chained audit log, the signed-in account and the overview dashboard.
import { apiRole, checkPassword, clientIp, displayRole, hashPassword, requirePermission } from '../lib/auth.mjs';
import { HttpError, badRequest, matches, notFound, paginate } from '../lib/http.mjs';
import { appendAudit, publicAudit, verifyChain } from '../lib/store.mjs';
import { issueLinkToken } from './auth.mjs';

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function governanceRoutes(router, { store, config, tokens, mailer }) {
  const users = '/api/v1/admin/users';
  const view = (u) => ({ id: u.id, email: u.email, fullName: u.fullName, role: displayRole[u.role], status: u.status, lastLoginAt: u.lastLoginAt, createdAt: u.createdAt });
  const userOf = (id) => store.data.users.find((u) => u.id === id) ?? (() => { throw notFound('User not found'); })();
  const audit = (ctx, actor, action, target, summary) => appendAudit(store, { actorEmail: actor.user.email, actorName: actor.user.fullName, action, resourceType: 'USER', resourceId: target?.id, summary, ipAddress: clientIp(ctx.req) });
  const revokeAll = (userId, except) => { for (const s of store.data.sessions.filter((s) => s.userId === userId && !s.revokedAt && s.id !== except)) { s.revokedAt = new Date().toISOString(); tokens.revokeSession(s.id); } store.save(); };
  const sendInvite = (user) => mailer({ to: user.email, subject: 'You are invited to Cyenetic Admin',
    text: `You have been invited to Cyenetic Admin as ${displayRole[user.role]}.\n\nSet your password within 48 hours:\n${config.dashboardUrl}/invite/${issueLinkToken(store, user, 'INVITE', 48 * 60)}\n\nAfter that, sign in with your email, password and the code we email you.\n` });
  const lastAdmin = (user) => user.role === 'SUPER_ADMIN' && store.data.users.filter((u) => u.role === 'SUPER_ADMIN' && u.status === 'ACTIVE').length <= 1;

  router.get(users, async (ctx) => {
    requirePermission(ctx.actor(), 'users:manage');
    const p = ctx.url.searchParams;
    return paginate(store.data.users.filter((u) => (!p.get('role') || displayRole[u.role] === p.get('role')) && (!p.get('status') || u.status === p.get('status')) && matches(u, p.get('q'), ['email', 'fullName'])).map(view), ctx.url);
  });
  router.post(users, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'users:manage');
    const b = await ctx.json(); const email = String(b.email ?? '').trim().toLowerCase(); const fullName = String(b.fullName ?? '').trim();
    if (!emailPattern.test(email) || !fullName || !apiRole[b.role]) throw badRequest('Email, name and role are required.');
    if (store.data.users.some((u) => u.email === email)) throw new HttpError(409, 'EMAIL_TAKEN', 'A user with that email already exists.');
    const user = { id: store.id(), email, fullName, role: apiRole[b.role], status: 'INVITED', passwordHash: null, lastLoginAt: null, createdAt: new Date().toISOString() };
    store.data.users.push(user);
    try { await sendInvite(user); } catch (error) {
      store.data.users = store.data.users.filter((u) => u.id !== user.id); store.save();
      console.error('[dev-api] invite email failed:', error.message);
      throw new HttpError(503, 'delivery_failed', 'The invitation email could not be sent. Is Mailpit running?');
    }
    audit(ctx, actor, 'USER_INVITED', user, `Invited ${email} as ${b.role}`);
    ctx.res.statusCode = 201;
    return { data: view(user) };
  });
  router.post(`${users}/:id/role`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'users:manage');
    const user = userOf(ctx.params.id); const { role } = await ctx.json();
    if (!apiRole[role]) throw badRequest('Unknown role.');
    if (lastAdmin(user) && apiRole[role] !== 'SUPER_ADMIN') throw badRequest('Keep at least one active Super Admin.');
    user.role = apiRole[role]; revokeAll(user.id);
    audit(ctx, actor, 'USER_ROLE_CHANGED', user, `${user.email} → ${role}`);
    return { data: view(user) };
  });
  router.post(`${users}/:id/status`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'users:manage');
    const user = userOf(ctx.params.id); const { status } = await ctx.json();
    if (!['ACTIVE', 'SUSPENDED'].includes(status) || user.status === 'INVITED') throw badRequest('Only active or suspended accounts can change status.');
    if (status === 'SUSPENDED' && (user.id === actor.user.id || lastAdmin(user))) throw badRequest('You cannot suspend yourself or the last Super Admin.');
    user.status = status; if (status === 'SUSPENDED') revokeAll(user.id);
    audit(ctx, actor, status === 'SUSPENDED' ? 'USER_SUSPENDED' : 'USER_REACTIVATED', user, user.email);
    return { data: view(user) };
  });
  router.post(`${users}/:id/invite/resend`, async (ctx) => {
    const actor = ctx.actor(); requirePermission(actor, 'users:manage');
    const user = userOf(ctx.params.id); if (user.status !== 'INVITED') throw badRequest('This user has already accepted the invitation.');
    await sendInvite(user).catch(() => { throw new HttpError(503, 'delivery_failed', 'The invitation email could not be sent.'); });
    audit(ctx, actor, 'USER_INVITE_RESENT', user, user.email);
    return undefined;
  });

  router.get('/api/v1/admin/audit-logs', async (ctx) => {
    requirePermission(ctx.actor(), 'audit:read');
    const p = ctx.url.searchParams;
    return paginate([...store.data.auditLogs].reverse().filter((e) => (!p.get('action') || e.action === p.get('action')) && (!p.get('resourceType') || e.resourceType === p.get('resourceType'))
      && matches(e, p.get('q'), ['actorEmail', 'summary', 'resourceId', 'action'])).map(publicAudit), ctx.url);
  });
  router.get('/api/v1/admin/audit-logs/verify-chain', async (ctx) => { requirePermission(ctx.actor(), 'audit:read'); return { data: verifyChain(store) }; });

  const account = '/api/v1/admin/account';
  router.get(`${account}/sessions`, async (ctx) => {
    const { user, session } = ctx.actor();
    return { data: store.data.sessions.filter((s) => s.userId === user.id && !s.revokedAt).reverse()
      .map((s) => ({ id: s.id, userAgent: s.userAgent, ipAddress: s.ipAddress, lastUsedAt: s.lastUsedAt, createdAt: s.createdAt, current: s.id === session.id })) };
  });
  router.delete(`${account}/sessions`, async (ctx) => { const actor = ctx.actor(); revokeAll(actor.user.id, actor.session.id); audit(ctx, actor, 'SESSIONS_REVOKED', actor.user, 'Signed out other sessions'); return undefined; });
  router.delete(`${account}/sessions/:id`, async (ctx) => {
    const actor = ctx.actor(); const s = store.data.sessions.find((x) => x.id === ctx.params.id && x.userId === actor.user.id && !x.revokedAt);
    if (!s) throw notFound('Session not found');
    s.revokedAt = new Date().toISOString(); tokens.revokeSession(s.id); store.save();
    audit(ctx, actor, 'SESSION_REVOKED', actor.user, 'Signed out one session');
    return undefined;
  });
  router.patch(`${account}/profile`, async (ctx) => {
    const actor = ctx.actor(); const fullName = String((await ctx.json()).fullName ?? '').trim();
    if (!fullName || fullName.length > 120) throw badRequest('Enter your name.', { fullName: ['Required'] });
    actor.user.fullName = fullName; store.save();
    return undefined;
  });
  router.post(`${account}/password`, async (ctx) => {
    const actor = ctx.actor(); const { currentPassword, newPassword } = await ctx.json();
    if (!checkPassword(String(currentPassword ?? ''), actor.user.passwordHash)) throw badRequest('Your current password is incorrect.', { currentPassword: ['Incorrect password'] });
    if (typeof newPassword !== 'string' || newPassword.length < 12 || newPassword.length > 256) throw badRequest('Use at least 12 characters.', { newPassword: ['Use at least 12 characters'] });
    actor.user.passwordHash = hashPassword(newPassword); revokeAll(actor.user.id, actor.session.id);
    audit(ctx, actor, 'PASSWORD_CHANGED', actor.user, 'Changed password');
    return undefined;
  });
}
