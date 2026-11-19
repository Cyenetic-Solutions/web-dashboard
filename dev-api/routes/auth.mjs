// /api/v1/auth: email + password, then a 6-digit code emailed over SMTP (docs/AUTH_EMAIL_OTP.md).
import { createHmac, randomInt, timingSafeEqual } from 'node:crypto';
import { checkPassword, clientIp, displayRole, hashPassword, maskEmail, newToken, sha256 } from '../lib/auth.mjs';
import { HttpError, badRequest, parseCookies } from '../lib/http.mjs';
import { appendAudit } from '../lib/store.mjs';

const CODE_TTL = 10 * 60_000, RESEND_AFTER = 30_000, MAX_ATTEMPTS = 5;
// Like the live API, the refresh token travels in the JSON body (no cookie) and rotates on every refresh.
const REFRESH_TTL_DAYS = 7;

export function authRoutes(router, { store, config, tokens, mailer }) {
  const challenges = new Map();
  const hits = new Map();
  const codeHash = (challengeId, code) => createHmac('sha256', config.secret).update(`${challengeId}:${code}`).digest();
  /** Ten attempts per key per 15 minutes; in-memory, which is enough for one local process. */
  const limit = (key) => {
    const now = Date.now();
    const recent = (hits.get(key) ?? []).filter((t) => now - t < 15 * 60_000);
    recent.push(now); hits.set(key, recent);
    if (recent.length > 10) throw new HttpError(429, 'RATE_LIMITED', 'Too many attempts. Wait a few minutes.');
  };
  const audit = (ctx, user, action, summary) => appendAudit(store, { actorEmail: user?.email ?? null, actorName: user?.fullName, action, resourceType: 'USER', resourceId: user?.id, summary, ipAddress: clientIp(ctx.req) });
  const sessionFor = (value) => typeof value === 'string' && value ? store.data.sessions.find((s) => s.refreshHash === sha256(value) && !s.revokedAt) : undefined;

  async function issueChallenge(user, existingId) {
    const challengeId = existingId ?? newToken().token;
    const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
    const now = Date.now();
    await mailer({ to: user.email, subject: `Your Cyenetic Admin sign-in code: ${code}`,
      text: `Your sign-in code is ${code}\n\nIt expires in 10 minutes (${new Date(now + CODE_TTL).toUTCString()}).\n\nIf you did not try to sign in to Cyenetic Admin, ignore this email and tell the security team.\n` });
    challenges.set(challengeId, { userId: user.id, hash: codeHash(challengeId, code), expiresAt: now + CODE_TTL, resendAt: now + RESEND_AFTER, attempts: 0 });
    return { challengeId, maskedEmail: maskEmail(user.email), expiresAt: new Date(now + CODE_TTL).toISOString(), resendAvailableAt: new Date(now + RESEND_AFTER).toISOString() };
  }
  const deliver = async (user, existingId) => {
    try { return await issueChallenge(user, existingId); } catch (error) {
      console.error('[dev-api] SMTP delivery failed:', error.message);
      throw new HttpError(503, 'delivery_failed', 'The sign-in code could not be emailed. Is Mailpit running?');
    }
  };

  router.post('/api/v1/auth/login', async (ctx) => {
    const { email = '', password = '' } = await ctx.json();
    limit(`ip:${clientIp(ctx.req)}`); limit(`email:${String(email).toLowerCase()}`);
    const user = store.data.users.find((u) => u.email === String(email).trim().toLowerCase());
    if (!user || user.status !== 'ACTIVE' || !checkPassword(String(password), user.passwordHash)) {
      audit(ctx, user, 'LOGIN_FAILED', 'Wrong email or password');
      throw new HttpError(401, 'invalid_credentials', 'Invalid email or password.');
    }
    return deliver(user);
  });

  router.post('/api/v1/auth/login/resend', async (ctx) => {
    const { challengeId = '' } = await ctx.json();
    const challenge = challenges.get(challengeId);
    if (!challenge) throw new HttpError(410, 'code_expired', 'Start sign-in again.');
    if (challenge.resendAt > Date.now()) throw new HttpError(429, 'RATE_LIMITED', 'Please wait before requesting another code.');
    limit(`resend:${challenge.userId}`);
    const user = store.data.users.find((u) => u.id === challenge.userId);
    audit(ctx, user, 'LOGIN_CODE_RESENT', 'Requested a new email code');
    return deliver(user, challengeId);
  });

  router.post('/api/v1/auth/login/verify', async (ctx) => {
    const { challengeId = '', code = '' } = await ctx.json();
    const challenge = challenges.get(challengeId);
    if (!challenge || challenge.expiresAt < Date.now()) { challenges.delete(challengeId); throw new HttpError(410, 'code_expired', 'This code has expired.'); }
    const user = store.data.users.find((u) => u.id === challenge.userId);
    if (!/^\d{6}$/.test(String(code)) || !timingSafeEqual(challenge.hash, codeHash(challengeId, String(code)))) {
      challenge.attempts += 1;
      audit(ctx, user, 'LOGIN_CODE_FAILED', `Wrong email code (attempt ${challenge.attempts})`);
      if (challenge.attempts >= MAX_ATTEMPTS) { challenges.delete(challengeId); throw new HttpError(429, 'too_many_attempts', 'Too many incorrect codes.'); }
      throw new HttpError(401, 'invalid_code', 'That code is incorrect.');
    }
    challenges.delete(challengeId);
    const refresh = newToken();
    const now = new Date().toISOString();
    const session = { id: store.id(), userId: user.id, refreshHash: refresh.hash, userAgent: ctx.req.headers['user-agent'] ?? null, ipAddress: clientIp(ctx.req), createdAt: now, lastUsedAt: now, revokedAt: null };
    store.data.sessions.push(session);
    user.lastLoginAt = now;
    audit(ctx, user, 'LOGIN_SUCCESS', 'Signed in with email code');
    ctx.res.setHeader('Set-Cookie', `cyenetic_refresh=${encodeURIComponent(refresh.token)}; Path=/api/v1/auth; HttpOnly; SameSite=Strict; Max-Age=${REFRESH_TTL_DAYS * 86400}`);
    return { accessToken: tokens.issue(session), refreshToken: refresh.token, expiresInSeconds: tokens.ttlSeconds };
  });

  router.post('/api/v1/auth/refresh', async (ctx) => {
    const body = await ctx.json().catch(() => ({}));
    const cookies = parseCookies(ctx.req.headers.cookie);
    const token = cookies.cyenetic_refresh || body.refreshToken;
    const session = sessionFor(token);
    const fresh = session && Date.now() - Date.parse(session.lastUsedAt) < REFRESH_TTL_DAYS * 86400_000;
    const user = session && store.data.users.find((u) => u.id === session.userId && u.status === 'ACTIVE');
    if (!fresh || !user) throw new HttpError(401, 'UNAUTHENTICATED', 'No session');
    const rotated = newToken();
    session.refreshHash = rotated.hash; session.lastUsedAt = new Date().toISOString(); store.save();
    ctx.res.setHeader('Set-Cookie', `cyenetic_refresh=${encodeURIComponent(rotated.token)}; Path=/api/v1/auth; HttpOnly; SameSite=Strict; Max-Age=${REFRESH_TTL_DAYS * 86400}`);
    return { accessToken: tokens.issue(session), refreshToken: rotated.token, expiresInSeconds: tokens.ttlSeconds };
  });

  router.post('/api/v1/auth/logout', async (ctx) => {
    const body = await ctx.json().catch(() => ({}));
    const cookies = parseCookies(ctx.req.headers.cookie);
    const token = cookies.cyenetic_refresh || body.refreshToken;
    const session = sessionFor(token);
    if (session) {
      session.revokedAt = new Date().toISOString(); tokens.revokeSession(session.id);
      audit(ctx, store.data.users.find((u) => u.id === session.userId), 'LOGOUT', 'Signed out');
    }
    ctx.res.setHeader('Set-Cookie', 'cyenetic_refresh=; Path=/api/v1/auth; HttpOnly; SameSite=Strict; Max-Age=0');
    ctx.res.statusCode = 204;
    return undefined;
  });

  router.get('/api/v1/auth/me', async (ctx) => {
    const { user } = ctx.actor();
    return { data: { id: user.id, role: user.role, email: user.email, fullName: user.fullName } };
  });

  router.post('/api/v1/auth/password/forgot', async (ctx) => {
    const { email = '' } = await ctx.json();
    limit(`forgot:${clientIp(ctx.req)}`);
    const user = store.data.users.find((u) => u.email === String(email).trim().toLowerCase() && u.status === 'ACTIVE');
    if (user) {
      const link = issueLinkToken(store, user, 'RESET', 60);
      await mailer({ to: user.email, subject: 'Reset your Cyenetic Admin password',
        text: `Someone asked to reset your Cyenetic Admin password.\n\nOpen this link within 60 minutes:\n${config.dashboardUrl}/reset-password/${link}\n\nIf this was not you, ignore this email.\n` }).catch((e) => console.error('[dev-api] reset email failed:', e.message));
      audit(ctx, user, 'PASSWORD_RESET_REQUESTED', 'Requested a password reset link');
    }
    ctx.res.statusCode = 202;
    return { data: { accepted: true } };
  });

  const consumeLink = (kind, token, password) => {
    // Same policy as services/auth.ts passwordSchema (12–256 characters).
    if (typeof password !== 'string' || password.length < 12 || password.length > 256) throw badRequest('Use at least 12 characters', { password: ['Use at least 12 characters'] });
    const entry = store.data.tokens.find((t) => t.kind === kind && t.hash === sha256(String(token)) && !t.usedAt);
    if (!entry || Date.parse(entry.expiresAt) < Date.now()) throw new HttpError(410, 'LINK_EXPIRED', 'This link is invalid or has expired.');
    const user = store.data.users.find((u) => u.id === entry.userId);
    entry.usedAt = new Date().toISOString();
    user.passwordHash = hashPassword(password);
    for (const s of store.data.sessions.filter((s) => s.userId === user.id && !s.revokedAt)) { s.revokedAt = entry.usedAt; tokens.revokeSession(s.id); }
    store.save();
    return user;
  };
  router.post('/api/v1/auth/password/reset', async (ctx) => {
    const { token, password } = await ctx.json();
    audit(ctx, consumeLink('RESET', token, password), 'PASSWORD_RESET', 'Reset password from emailed link');
    return undefined;
  });
  router.post('/api/v1/auth/invite/accept', async (ctx) => {
    const { token, password } = await ctx.json();
    const user = consumeLink('INVITE', token, password);
    user.status = 'ACTIVE';
    audit(ctx, user, 'INVITE_ACCEPTED', `Activated ${displayRole[user.role]} account`);
    return undefined;
  });
}

/** Stores a hashed single-use link token and returns the raw value for the email. */
export function issueLinkToken(store, user, kind, minutes) {
  const { token, hash } = newToken();
  store.data.tokens = store.data.tokens.filter((t) => !(t.userId === user.id && t.kind === kind && !t.usedAt));
  store.data.tokens.push({ hash, kind, userId: user.id, expiresAt: new Date(Date.now() + minutes * 60_000).toISOString(), usedAt: null });
  store.save();
  return token;
}
