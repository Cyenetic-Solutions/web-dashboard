// Identity for the local dev API: password hashing, seeded staff, access tokens and the permission guard.
import { createHash, randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { can } from '../../services/permissions.ts';
import { HttpError, forbidden } from './http.mjs';

/** API role enum ↔ dashboard display role. */
export const displayRole = { SUPER_ADMIN: 'Super Admin', SECURITY_AUDITOR: 'Security Auditor', CONTENT_EDITOR: 'Content Editor' };
export const apiRole = Object.fromEntries(Object.entries(displayRole).map(([k, v]) => [v, k]));

export function hashPassword(password) {
  const salt = randomBytes(16);
  return `scrypt$${salt.toString('hex')}$${scryptSync(password, salt, 64).toString('hex')}`;
}
export function checkPassword(password, stored) {
  const [scheme, salt, hash] = String(stored ?? '').split('$');
  if (scheme !== 'scrypt' || !salt || !hash) return false;
  const expected = Buffer.from(hash, 'hex');
  const actual = scryptSync(password, Buffer.from(salt, 'hex'), expected.length);
  return timingSafeEqual(expected, actual);
}
/** Opaque random token and its storage hash; only hashes are persisted. */
export function newToken() { const token = randomBytes(32).toString('base64url'); return { token, hash: sha256(token) }; }
export const sha256 = (value) => createHash('sha256').update(value).digest('hex');

/** Creates or updates the staff accounts named in .env so the credentials there always work. */
export function seedUsers(store, seeds) {
  for (const seed of seeds) {
    if (!seed.email || !seed.password) continue;
    const email = seed.email.trim().toLowerCase();
    let user = store.data.users.find((u) => u.email === email);
    if (!user) {
      user = { id: store.id(), email, fullName: seed.fullName, role: seed.role, status: 'ACTIVE', lastLoginAt: null, createdAt: new Date().toISOString() };
      store.data.users.push(user);
      console.log(`[dev-api] Seeded ${displayRole[seed.role]} ${email}`);
    }
    if (!checkPassword(seed.password, user.passwordHash)) user.passwordHash = hashPassword(seed.password);
    user.role = seed.role; user.status = 'ACTIVE';
  }
  store.save();
}

/** In-memory access tokens (15 minutes); refresh sessions are persisted, so a restart only costs one refresh. */
export function createTokenIssuer(store) {
  const access = new Map();
  return {
    ttlSeconds: 900,
    issue(session) {
      const { token } = newToken();
      access.set(token, { sessionId: session.id, userId: session.userId, expiresAt: Date.now() + 900_000 });
      return token;
    },
    revokeSession(sessionId) { for (const [token, entry] of access) if (entry.sessionId === sessionId) access.delete(token); },
    /** Resolves the bearer token to an active user and session or throws 401. */
    resolve(req) {
      const header = req.headers.authorization ?? '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : '';
      const entry = access.get(token);
      if (!entry || entry.expiresAt < Date.now()) { access.delete(token); throw new HttpError(401, 'UNAUTHENTICATED', 'Session expired. Sign in again.'); }
      const session = store.data.sessions.find((s) => s.id === entry.sessionId && !s.revokedAt);
      const user = store.data.users.find((u) => u.id === entry.userId);
      if (!session || !user || user.status !== 'ACTIVE') { access.delete(token); throw new HttpError(401, 'UNAUTHENTICATED', 'Session expired. Sign in again.'); }
      return { user, session, role: displayRole[user.role] };
    },
  };
}

/** Throws 403 unless the caller's role holds the permission (same matrix as the dashboard). */
export function requirePermission(actor, permission) {
  if (!can(actor.role, permission)) throw forbidden();
}

export const clientIp = (req) => req.socket.remoteAddress ?? null;
export function maskEmail(email) {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}***@${domain}`;
}
