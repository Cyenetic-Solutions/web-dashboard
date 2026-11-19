import { z } from 'zod';
import { listAudit, staffRoles } from './api';
import { ApiError, dataOf, listOf, query, request } from './http';

export const userStatuses = ['INVITED', 'ACTIVE', 'SUSPENDED'] as const;
const userSchema = z.object({ id: z.string(), email: z.string(), fullName: z.string(), role: z.enum(staffRoles), status: z.enum(userStatuses), lastLoginAt: z.string().nullable(), createdAt: z.string() });
/** Staff account as listed by the users API (never includes secrets). */
export type StaffUser = z.infer<typeof userSchema>;
const users = '/api/v1/admin/users';
export async function listUsers(token: string, signal: AbortSignal, filters: { role?: string; status?: string; q?: string }) {
  return listOf(userSchema).parse(await request(`${users}${query(filters)}`, { token, signal })).data;
}
/** Invites a user; the API emails a 48-hour activation link over SMTP. */
export async function inviteUser(input: { email: string; fullName: string; role: StaffUser['role'] }, token: string) {
  return dataOf(userSchema).parse(await request(users, { token, method: 'POST', body: input })).data;
}
export async function setUserRole(id: string, role: StaffUser['role'], token: string) {
  return dataOf(userSchema).parse(await request(`${users}/${id}/role`, { token, method: 'POST', body: { role } })).data;
}
/** Suspending revokes every session for that user. */
export async function setUserStatus(id: string, status: 'ACTIVE' | 'SUSPENDED', token: string) {
  return dataOf(userSchema).parse(await request(`${users}/${id}/status`, { token, method: 'POST', body: { status } })).data;
}
export async function resendInvite(id: string, token: string) { await request(`${users}/${id}/invite/resend`, { token, method: 'POST' }); }

const entrySchema = z.object({ id: z.string(), actorEmail: z.string().nullable(), action: z.string(), resourceType: z.string(), resourceId: z.string().nullable(),
  summary: z.string().nullable(), ipAddress: z.string().nullable(), createdAt: z.string(), diff: z.unknown().optional() });
/** Normalised audit entry; `legacy` marks entries from the CMS-only audit endpoint. */
export type AuditEntry = z.infer<typeof entrySchema> & { legacy?: boolean };
/** Live API audit row: actor is the staff user id and `record` is the snapshot written with the change. */
const liveEntrySchema = z.object({ id: z.string(), actor: z.string(), action: z.string(), record: z.unknown(), createdAt: z.string() });
const contentRef = z.object({ kind: z.string(), slug: z.string(), version: z.number().optional(), status: z.string().optional() }).loose();
/** Maps a live API row onto the dashboard entry; content snapshots get a readable kind/slug summary. */
function fromLive(e: z.infer<typeof liveEntrySchema>): AuditEntry {
  const ref = contentRef.safeParse(e.record);
  const summary = ref.success ? `${ref.data.kind}/${ref.data.slug}${ref.data.version === undefined ? '' : ` v${ref.data.version}`}${ref.data.status ? ` · ${ref.data.status}` : ''}` : null;
  return { id: e.id, actorEmail: e.actor, action: e.action, resourceType: ref.success ? ref.data.kind : (e.action.split(/[._]/)[0] ?? 'unknown'),
    resourceId: ref.success ? ref.data.slug : null, summary, ipAddress: null, createdAt: e.createdAt, diff: e.record };
}
const auditPage = z.union([listOf(entrySchema).transform((page) => page.data),
  listOf(liveEntrySchema).transform((page) => page.data.map(fromLive))]);
/** Reads the full audit log, falling back to the current CMS audit endpoint when the full module is not deployed. */
export async function loadAuditLog(token: string, signal: AbortSignal, filters: { action?: string; resourceType?: string; q?: string }) {
  try { return { entries: auditPage.parse(await request(`/api/v1/admin/audit-logs${query({ ...filters, pageSize: 100 })}`, { token, signal })), legacy: false }; }
  catch (error) {
    if (!(error instanceof ApiError) || !error.unavailable) throw error;
    const legacy = await listAudit(token, signal);
    const entries: AuditEntry[] = legacy.map((e) => ({ id: e.id, actorEmail: e.actor, action: e.action, resourceType: e.record.kind, resourceId: e.record.slug,
      summary: `${e.record.kind}/${e.record.slug} v${e.record.version} · ${e.record.status}`, ipAddress: null, createdAt: e.createdAt, diff: e.record, legacy: true }));
    return { entries, legacy: true };
  }
}
const chainSchema = z.union([z.object({ valid: z.boolean(), checked: z.number(), firstBrokenId: z.string().nullable().optional() }),
  z.object({ supported: z.literal(false), reason: z.string() })]);
/** Hash-chain check result, or `supported: false` when the API has no hash chain (the live API today). */
export type ChainResult = z.infer<typeof chainSchema>;
/** Recomputes the hash chain server-side. */
export async function verifyChain(token: string): Promise<ChainResult> {
  return dataOf(chainSchema).parse(await request('/api/v1/admin/audit-logs/verify-chain', { token })).data;
}

const sessionSchema = z.object({ id: z.string(), userAgent: z.string().nullable(), ipAddress: z.string().nullable(), lastUsedAt: z.string(), createdAt: z.string(), current: z.boolean() });
export type AccountSession = z.infer<typeof sessionSchema>;
/**
 * Live API session row (either a bare array of SessionView or an array with DB session fields).
 */
const liveSessionSchema = z.object({
  id: z.string(), userAgent: z.string().nullable().optional(), ipAddress: z.string().nullable().optional(),
  createdAt: z.string(), expiresAt: z.string().optional(), lastUsedAt: z.string().optional(),
  revokedAt: z.string().nullable().optional(), current: z.boolean().optional(),
}).loose();
const sessionList = z.union([dataOf(z.array(sessionSchema)).transform((r) => r.data),
  z.array(liveSessionSchema).transform((rows) => rows.filter((s) => !s.revokedAt && (!s.expiresAt || Date.parse(s.expiresAt) > Date.now()))
    .map((s): AccountSession => ({ id: s.id, userAgent: s.userAgent ?? null, ipAddress: s.ipAddress ?? null, lastUsedAt: s.lastUsedAt ?? s.createdAt, createdAt: s.createdAt, current: Boolean(s.current) })))]);
const account = '/api/v1/admin/account';
export async function listSessions(token: string, signal: AbortSignal) { return sessionList.parse(await request(`${account}/sessions`, { token, signal })); }
export async function revokeSession(id: string | null, token: string) { await request(id ? `${account}/sessions/${id}` : `${account}/sessions`, { token, method: 'DELETE' }); }
export async function updateProfile(fullName: string, token: string) { await request(`${account}/profile`, { token, method: 'PATCH', body: { fullName } }); }
/** Changes the password; the API revokes other sessions. */
export async function changePassword(currentPassword: string, newPassword: string, token: string) { await request(`${account}/password`, { token, method: 'POST', body: { currentPassword, newPassword } }); }
