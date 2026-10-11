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
/** Reads the full audit log, falling back to the current CMS audit endpoint when the full module is not deployed. */
export async function loadAuditLog(token: string, signal: AbortSignal, filters: { action?: string; resourceType?: string; q?: string }) {
  try { return { entries: listOf(entrySchema).parse(await request(`/api/v1/admin/audit-logs${query({ ...filters, pageSize: 100 })}`, { token, signal })).data, legacy: false }; }
  catch (error) {
    if (!(error instanceof ApiError) || !error.unavailable) throw error;
    const legacy = await listAudit(token, signal);
    const entries: AuditEntry[] = legacy.map((e) => ({ id: e.id, actorEmail: e.actor, action: e.action, resourceType: e.record.kind, resourceId: e.record.slug,
      summary: `${e.record.kind}/${e.record.slug} v${e.record.version} · ${e.record.status}`, ipAddress: null, createdAt: e.createdAt, diff: e.record, legacy: true }));
    return { entries, legacy: true };
  }
}
/** Recomputes the hash chain server-side. */
export async function verifyChain(token: string) {
  return dataOf(z.object({ valid: z.boolean(), checked: z.number(), firstBrokenId: z.string().nullable().optional() })).parse(await request('/api/v1/admin/audit-logs/verify-chain', { token })).data;
}

const sessionSchema = z.object({ id: z.string(), userAgent: z.string().nullable(), ipAddress: z.string().nullable(), lastUsedAt: z.string(), createdAt: z.string(), current: z.boolean() });
export type AccountSession = z.infer<typeof sessionSchema>;
const account = '/api/v1/admin/account';
export async function listSessions(token: string, signal: AbortSignal) { return dataOf(z.array(sessionSchema)).parse(await request(`${account}/sessions`, { token, signal })).data; }
export async function revokeSession(id: string | null, token: string) { await request(id ? `${account}/sessions/${id}` : `${account}/sessions`, { token, method: 'DELETE' }); }
export async function updateProfile(fullName: string, token: string) { await request(`${account}/profile`, { token, method: 'PATCH', body: { fullName } }); }
/** Changes the password; the API revokes other sessions. */
export async function changePassword(currentPassword: string, newPassword: string, token: string) { await request(`${account}/password`, { token, method: 'POST', body: { currentPassword, newPassword } }); }
