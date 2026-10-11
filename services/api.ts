import { z } from 'zod';
import { contentInput, type ContentInput } from './content.schema';
import { request } from './http';

export { ApiError } from './http';
/** Staff roles accepted by the dashboard; Client Viewer belongs to the separate portal. */
export const staffRoles = ['Super Admin', 'Security Auditor', 'Content Editor'] as const;
export const sessionSchema = z.object({ sub: z.string(), role: z.enum(staffRoles), amr: z.array(z.string()),
  email: z.string().optional(), name: z.string().optional() });
export type Session = z.infer<typeof sessionSchema>;
export type StaffRole = Session['role'];
const recordSchema = z.object({ updatedAt: z.string() }).loose().transform(({ updatedAt, ...input }) => ({ ...contentInput.parse(input), updatedAt }));
export type ContentRecord = z.infer<typeof recordSchema>;

/** Verifies a token with the backend before giving the UI any staff privileges. */
export async function authenticate(token: string) { return sessionSchema.parse(await request('/api/v1/admin/session', { token })); }
/** Explicit development-only login; production API does not register this endpoint. */
export async function demoLogin(key: string) {
  return z.object({ token: z.string(), demo: z.literal(true) }).parse(await request('/api/v1/auth/demo', { method: 'POST', body: { key } }));
}
/** Loads private CMS records, honoring cancellation on navigation/session changes. */
export async function listContent(kind: string, token: string, signal?: AbortSignal) {
  return z.array(recordSchema).parse(await request(`/api/v1/admin/content/${encodeURIComponent(kind)}`, { token, signal }));
}
/** Saves a versioned document; backend owns role checks and publishing constraints. */
export async function saveContent(input: ContentInput, token: string) {
  return recordSchema.parse(await request(`/api/v1/admin/content/${input.kind}/${input.slug}`, { token, method: 'PUT', body: input }));
}
/** Audit entries contain immutable CMS snapshots; only Super Admin can read them. */
export async function listAudit(token: string, signal?: AbortSignal) {
  const schema = z.object({ id: z.string(), actor: z.string(), action: z.string(), createdAt: z.string(), record: recordSchema });
  return z.array(schema).parse(await request('/api/v1/admin/audit', { token, signal }));
}
