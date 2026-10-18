// Minimal HTTP plumbing for the local dev API: routing, JSON bodies, cookies, CORS and the error envelope.
import { randomUUID } from 'node:crypto';

/** Error that becomes the `{ error: { code, message, details, requestId } }` envelope. */
export class HttpError extends Error {
  constructor(status, code, message, details) { super(message); this.status = status; this.code = code; this.details = details; }
}
export const notFound = (what = 'Not found') => new HttpError(404, 'NOT_FOUND', what);
export const forbidden = (message = 'Your role does not allow this action.') => new HttpError(403, 'FORBIDDEN', message);
export const badRequest = (message, fieldErrors) => new HttpError(400, 'VALIDATION_ERROR', message, fieldErrors ? { fieldErrors } : undefined);
export const notImplemented = (what) => new HttpError(501, 'NOT_IMPLEMENTED', `${what} is not implemented in the local dev API.`);

/** Tiny path router: patterns like `/api/v1/admin/findings/:id`. */
export function createRouter() {
  const routes = [];
  const add = (method, pattern, handler) => {
    const keys = [];
    const source = pattern.replace(/:[a-zA-Z]+/g, (key) => { keys.push(key.slice(1)); return '([^/]+)'; });
    routes.push({ method, regex: new RegExp(`^${source}$`), keys, handler });
  };
  const match = (method, path) => {
    let pathMatched = false;
    for (const route of routes) {
      const found = route.regex.exec(path);
      if (!found) continue;
      pathMatched = true;
      if (route.method !== method) continue;
      const params = Object.fromEntries(route.keys.map((key, i) => [key, decodeURIComponent(found[i + 1])]));
      return { handler: route.handler, params };
    }
    return { pathMatched };
  };
  return { add, match, get: (p, h) => add('GET', p, h), post: (p, h) => add('POST', p, h), put: (p, h) => add('PUT', p, h),
    patch: (p, h) => add('PATCH', p, h), delete: (p, h) => add('DELETE', p, h) };
}

/** Reads the raw request body with a size ceiling. */
export async function readBody(req, limit) {
  const chunks = []; let size = 0;
  for await (const chunk of req) {
    size += chunk.length;
    if (size > limit) throw new HttpError(413, 'PAYLOAD_TOO_LARGE', 'The request body is too large.');
    chunks.push(chunk);
  }
  return Buffer.concat(chunks);
}

/** Parses a JSON body; empty bodies become `{}`. */
export async function readJson(req) {
  const raw = await readBody(req, 2 * 1024 * 1024);
  if (raw.length === 0) return {};
  try { return JSON.parse(raw.toString('utf8')); } catch { throw badRequest('The request body is not valid JSON.'); }
}

export function parseCookies(header = '') {
  return Object.fromEntries(header.split(';').map((part) => part.trim().split('=')).filter(([k]) => k).map(([k, ...v]) => [k, decodeURIComponent(v.join('='))]));
}

/** Writes CORS headers for the configured dashboard origin only (credentials need an exact origin). */
export function cors(req, res, allowedOrigins) {
  const origin = req.headers.origin;
  if (origin && allowedOrigins.includes(origin)) {
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Credentials', 'true');
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Headers', 'authorization,content-type,x-requested-with');
    res.setHeader('Access-Control-Allow-Methods', 'GET,POST,PUT,PATCH,DELETE,OPTIONS');
    res.setHeader('Access-Control-Max-Age', '600');
  }
}

export function sendJson(res, status, payload) {
  if (status === 204 || payload === undefined) { res.writeHead(status === 200 ? 204 : status); res.end(); return; }
  const body = JSON.stringify(payload);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(body);
}

export function sendError(res, error) {
  const requestId = randomUUID();
  if (error instanceof HttpError) {
    sendJson(res, error.status, { error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}), requestId } });
    return;
  }
  console.error(`[dev-api] ${requestId}`, error);
  sendJson(res, 500, { error: { code: 'INTERNAL', message: 'Unexpected server error. See the dev API log.', requestId } });
}

/** Paginated list envelope used by admin list endpoints. */
export function paginate(items, url) {
  const pageSize = Math.min(200, Math.max(1, Number(url.searchParams.get('pageSize')) || 50));
  const page = Math.max(1, Number(url.searchParams.get('page')) || 1);
  const total = items.length;
  return { data: items.slice((page - 1) * pageSize, page * pageSize), meta: { page, pageSize, total, totalPages: Math.max(1, Math.ceil(total / pageSize)) } };
}

/** Case-insensitive search across the given string fields. */
export function matches(item, q, fields) {
  if (!q) return true;
  const needle = q.toLowerCase();
  return fields.some((field) => String(item[field] ?? '').toLowerCase().includes(needle));
}
