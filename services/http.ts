import { z } from 'zod';

/** Public API origin compiled into the client bundle; never a secret. */
export const apiBase = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

const envelope = z.object({ error: z.union([z.string(), z.object({
  code: z.string().optional(), message: z.string(),
  details: z.object({ fieldErrors: z.record(z.string(), z.array(z.string())).optional() }).loose().optional(),
  requestId: z.string().optional(),
}).loose()]) });

/** Typed transport error preserving status, machine code, field errors and request id. */
export class ApiError extends Error {
  constructor(public status: number, message: string, public code = 'ERROR',
    public fieldErrors: Record<string, string[]> = {}, public requestId?: string) { super(message); }
  /** True when the connected backend does not serve this module (route absent or not implemented). */
  get unavailable() { return this.status === 404 || this.status === 501; }
}

/** Request options; `credentials` is only enabled for the cookie-scoped auth routes. */
export interface RequestOptions { token?: string | null; method?: string; body?: unknown; signal?: AbortSignal; credentials?: RequestCredentials; headers?: Record<string, string> }

/** Sends a JSON request to the API and returns the unvalidated payload; callers parse it with Zod. */
export async function request(path: string, options: RequestOptions = {}): Promise<unknown> {
  const { token, method = 'GET', body, signal, credentials = 'omit', headers = {} } = options;
  let response: Response;
  try {
    response = await fetch(`${apiBase}${path}`, { method, signal, cache: 'no-store', credentials,
      headers: { ...(body === undefined ? {} : { 'Content-Type': 'application/json' }), ...(token ? { Authorization: `Bearer ${token}` } : {}), ...headers },
      body: body === undefined ? undefined : JSON.stringify(body) });
  } catch (error) {
    if (signal?.aborted) throw error;
    throw new ApiError(0, 'The API could not be reached. Check the connection and try again.', 'NETWORK');
  }
  const text = await response.text();
  let payload: unknown = null;
  if (text) { try { payload = JSON.parse(text); } catch { payload = null; } }
  if (!response.ok) {
    const parsed = envelope.safeParse(payload);
    if (!parsed.success) throw new ApiError(response.status, response.status === 404 ? 'Not found' : 'Request failed');
    const error = parsed.data.error;
    if (typeof error === 'string') throw new ApiError(response.status, error);
    throw new ApiError(response.status, error.message, error.code, error.details?.fieldErrors ?? {}, error.requestId);
  }
  return payload;
}

/** Standard paginated list envelope from admin list endpoints. */
export function listOf<T extends z.ZodType>(item: T) {
  return z.object({ data: z.array(item), meta: z.object({ page: z.number(), pageSize: z.number(), total: z.number(), totalPages: z.number() }).optional() });
}
/** Single-resource envelope. */
export function dataOf<T extends z.ZodType>(item: T) { return z.object({ data: item }); }

/** Encodes defined filter values into a query string. */
export function query(params: Record<string, string | number | boolean | undefined | null>) {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value !== undefined && value !== null && value !== '') search.set(key, String(value));
  const text = search.toString();
  return text ? `?${text}` : '';
}
