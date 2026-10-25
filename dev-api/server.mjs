// Local development API for the Cyenetic dashboard. NOT the production cyenetic-backend:
// it keeps data in a JSON file, binds to loopback only and refuses to start with NODE_ENV=production.
import { createServer } from 'node:http';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createTokenIssuer, seedUsers } from './lib/auth.mjs';
import { HttpError, cors, createRouter, readJson, sendError, sendJson } from './lib/http.mjs';
import { sendMail } from './lib/mail.mjs';
import { createStorage } from './lib/storage.mjs';
import { openStore } from './lib/store.mjs';
import { authRoutes } from './routes/auth.mjs';
import { contentRoutes } from './routes/content.mjs';
import { crmRoutes } from './routes/crm.mjs';
import { dashboardRoutes } from './routes/dashboard.mjs';
import { governanceRoutes } from './routes/governance.mjs';
import { mediaRoutes } from './routes/media.mjs';
import { opsRoutes } from './routes/ops.mjs';

const env = process.env;
if (env.NODE_ENV === 'production') { console.error('[dev-api] Refusing to run with NODE_ENV=production. Use cyenetic-backend.'); process.exit(1); }
const host = env.DEV_API_HOST ?? '127.0.0.1';
if (!['127.0.0.1', 'localhost', '::1'].includes(host)) { console.error('[dev-api] DEV_API_HOST must be a loopback address.'); process.exit(1); }
if (!env.DEV_API_SECRET || env.DEV_API_SECRET.length < 32) { console.error('[dev-api] Set DEV_API_SECRET (32+ characters) in .env. ./run.sh generates one.'); process.exit(1); }

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(env.DEV_API_PORT ?? 4000);
const storageDriver = (env.STORAGE_DRIVER ?? 'local').toLowerCase();
if (!['local', 'minio'].includes(storageDriver)) { console.error(`[dev-api] STORAGE_DRIVER must be "local" or "minio", not "${env.STORAGE_DRIVER}".`); process.exit(1); }
const config = {
  port,
  /** Address the browser uses to reach this API; local-disk upload URLs are built from it. */
  publicUrl: (env.DEV_API_PUBLIC_URL ?? `http://localhost:${port}`).replace(/\/+$/, ''),
  secret: env.DEV_API_SECRET,
  dashboardUrl: env.DASHBOARD_URL ?? 'http://localhost:3000',
  origins: (env.CORS_ORIGINS ?? env.DASHBOARD_URL ?? 'http://localhost:3000').split(',').map((o) => o.trim()).filter(Boolean),
  smtp: { host: env.SMTP_HOST ?? '127.0.0.1', port: Number(env.SMTP_PORT ?? 1025), from: env.SMTP_FROM ?? 'no-reply@cyenetic.local' },
  s3: { endpoint: env.S3_ENDPOINT ?? 'http://localhost:9000', region: env.S3_REGION ?? 'us-east-1', accessKey: env.S3_ACCESS_KEY ?? 'cyenetic', secretKey: env.S3_SECRET_KEY ?? '',
    publicBucket: env.S3_PUBLIC_BUCKET ?? 'cyenetic-public', privateBucket: env.S3_PRIVATE_BUCKET ?? 'cyenetic-private' },
  storage: { driver: storageDriver, dir: path.resolve(root, env.DEV_API_DATA_DIR ?? '.dev-data', 'uploads') },
};

const store = openStore(path.resolve(root, env.DEV_API_DATA_DIR ?? '.dev-data'));
seedUsers(store, [
  { email: env.DEV_ADMIN_EMAIL, password: env.DEV_ADMIN_PASSWORD, fullName: env.DEV_ADMIN_NAME ?? 'Dev Super Admin', role: 'SUPER_ADMIN' },
  { email: env.DEV_EDITOR_EMAIL, password: env.DEV_EDITOR_PASSWORD, fullName: env.DEV_EDITOR_NAME ?? 'Dev Content Editor', role: 'CONTENT_EDITOR' },
  { email: env.DEV_AUDITOR_EMAIL, password: env.DEV_AUDITOR_PASSWORD, fullName: env.DEV_AUDITOR_NAME ?? 'Dev Security Auditor', role: 'SECURITY_AUDITOR' },
]);
const tokens = createTokenIssuer(store);
const storage = createStorage(config);
const mailer = (message) => sendMail(config.smtp, message);
const deps = { store, config, tokens, mailer, storage };

const router = createRouter();
router.get('/health', async () => ({ status: 'ok', service: 'cyenetic-dev-api' }));
for (const register of [authRoutes, contentRoutes, crmRoutes, opsRoutes, governanceRoutes, dashboardRoutes, mediaRoutes]) register(router, deps);

const server = createServer(async (req, res) => {
  cors(req, res, config.origins);
  if (req.method === 'OPTIONS') { res.writeHead(204); res.end(); return; }
  const url = new URL(req.url ?? '/', `http://${req.headers.host ?? 'localhost'}`);
  const started = Date.now();
  try {
    const found = router.match(req.method ?? 'GET', url.pathname);
    if (!found.handler) throw found.pathMatched ? new HttpError(405, 'METHOD_NOT_ALLOWED', 'Method not allowed') : new HttpError(404, 'NOT_FOUND', 'Not found');
    let actor = null;
    let raw = null;
    const ctx = { req, res, url, params: found.params, json: () => readJson(req), actor: () => (actor ??= tokens.resolve(req)),
      csv: (text) => { raw = { body: text, headers: { 'Content-Type': 'text/csv; charset=utf-8', 'Cache-Control': 'no-store' } }; return text; },
      file: (body, headers) => { raw = { body, headers }; return body; } };
    const result = await found.handler(ctx);
    if (raw !== null) { res.writeHead(200, raw.headers); res.end(raw.body); }
    else sendJson(res, res.statusCode || 200, result);
    store.save();
  } catch (error) {
    sendError(res, error);
  } finally {
    if (url.pathname !== '/health') console.log(`[dev-api] ${req.method} ${url.pathname} ${res.statusCode} ${Date.now() - started}ms`);
  }
});

server.listen(config.port, host, () => {
  console.log(`[dev-api] Listening on http://${host}:${config.port} (dashboard origin ${config.origins.join(', ')})`);
  storage.prepare().then((message) => console.log(`[dev-api] ${message}`), (error) => console.error(`[dev-api] ${error.message}`));
});
const stop = () => { store.flush(); server.close(() => process.exit(0)); setTimeout(() => process.exit(0), 2000).unref(); };
process.on('SIGINT', stop);
process.on('SIGTERM', stop);
