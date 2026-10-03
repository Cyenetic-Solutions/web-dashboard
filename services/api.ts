import { z } from 'zod';
import { contentInput, type ContentInput } from './content.schema';

const base = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';
export const sessionSchema = z.object({ sub: z.string(), role: z.enum(['Super Admin', 'Security Auditor', 'Content Editor']), amr: z.array(z.string()) });
export type Session = z.infer<typeof sessionSchema>;
const recordSchema = z.object({ updatedAt: z.string() }).loose().transform(({ updatedAt, ...input }) => ({ ...contentInput.parse(input), updatedAt }));
export type ContentRecord = z.infer<typeof recordSchema>;

/** Typed transport error preserves authentication and optimistic-write failure states. */
export class ApiError extends Error { constructor(public status: number, message: string) { super(message); } }

async function request(path: string, token: string | null, init?: RequestInit): Promise<unknown> {
  const response = await fetch(`${base}${path}`, { ...init, cache: 'no-store', credentials: 'omit',
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) } });
  const payload: unknown = await response.json();
  if (!response.ok) {
    const parsed = z.object({ error: z.string() }).safeParse(payload);
    throw new ApiError(response.status, parsed.success ? parsed.data.error : 'Request failed');
  }
  return payload;
}
/** Verifies a token with the backend before giving the UI any staff privileges. */
export async function authenticate(token: string) { return sessionSchema.parse(await request('/api/v1/admin/session', token)); }
/** Explicit development-only login; production API does not register this endpoint. */
export async function demoLogin(key: string) {
  return z.object({ token: z.string(), demo: z.literal(true) }).parse(await request('/api/v1/auth/demo', null, { method: 'POST', body: JSON.stringify({ key }) }));
}
/** Loads private CMS records, honoring cancellation on navigation/session changes. */
export async function listContent(kind: string, token: string, signal?: AbortSignal) {
  return z.array(recordSchema).parse(await request(`/api/v1/admin/content/${encodeURIComponent(kind)}`, token, { signal }));
}
/** Saves a versioned document; backend owns role checks and publishing constraints. */
export async function saveContent(input: ContentInput, token: string) {
  return recordSchema.parse(await request(`/api/v1/admin/content/${input.kind}/${input.slug}`, token, { method: 'PUT', body: JSON.stringify(input) }));
}
/** Audit entries contain immutable CMS snapshots; only Super Admin can read them. */
export async function listAudit(token: string, signal?: AbortSignal) {
  const schema = z.object({ id: z.string(), actor: z.string(), action: z.string(), createdAt: z.string(), record: recordSchema });
  return z.array(schema).parse(await request('/api/v1/admin/audit', token, { signal }));
}
