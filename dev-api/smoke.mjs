// End-to-end check of a running local stack (./run.sh): sign-in through Mailpit, CMS, CRM, ops, media in MinIO and RBAC.
// Usage: npm run dev:smoke   (reads .env; leaves a few test records behind in the local store)
const env = process.env;
const API = `http://localhost:${env.DEV_API_PORT ?? 4000}`, MAIL = `http://localhost:${env.MAILPIT_UI_PORT ?? 8025}`;
let failures = 0;
const check = (label, ok, detail = '') => { console.log(`${ok ? 'PASS' : 'FAIL'}  ${label}${ok ? '' : `  ${detail}`}`); if (!ok) failures += 1; };
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
async function call(method, path, body, token) {
  const response = await fetch(API + path, { method, headers: { ...(body ? { 'content-type': 'application/json' } : {}), ...(token ? { authorization: `Bearer ${token}` } : {}) }, body: body ? JSON.stringify(body) : undefined });
  const text = await response.text();
  let json = null; try { json = JSON.parse(text); } catch { json = text; }
  return { status: response.status, json };
}
async function latestMail(match) {
  for (let i = 0; i < 30; i += 1) {
    const list = await (await fetch(`${MAIL}/api/v1/messages`)).json();
    const found = list.messages?.find((m) => match.test(m.Subject));
    if (found) return found;
    await sleep(300);
  }
  return null;
}
async function signIn(email, password) {
  await fetch(`${MAIL}/api/v1/messages`, { method: 'DELETE' });
  const challenge = await call('POST', '/api/v1/auth/login', { email, password });
  if (challenge.status !== 200) return { challenge };
  const code = (await latestMail(/sign-in code/))?.Subject.match(/(\d{6})/)?.[1];
  const wrong = await call('POST', '/api/v1/auth/login/verify', { challengeId: challenge.json.challengeId, code: code === '000000' ? '111111' : '000000' });
  const verified = await call('POST', '/api/v1/auth/login/verify', { challengeId: challenge.json.challengeId, code });
  return { challenge, code, wrong, token: verified.json?.accessToken };
}

check('API /health', (await call('GET', '/health')).status === 200, `is the API running on ${API}?`);
check('wrong password is refused', (await call('POST', '/api/v1/auth/login', { email: env.DEV_ADMIN_EMAIL, password: 'not-the-password' })).status === 401);
const admin = await signIn(env.DEV_ADMIN_EMAIL, env.DEV_ADMIN_PASSWORD);
check('sign-in code arrives in Mailpit', /^\d{6}$/.test(admin.code ?? ''), JSON.stringify(admin.challenge?.json));
check('wrong code is refused', admin.wrong?.status === 401);
check('right code returns a token', Boolean(admin.token));
const token = admin.token;
check('/auth/me is the Super Admin', (await call('GET', '/api/v1/auth/me', null, token)).json?.data?.role === 'SUPER_ADMIN');

const slug = `smoke-${Date.now()}`;
const post = { kind: 'posts', slug, status: 'draft', version: 0, data: { title: 'Smoke test', summary: 'Created by dev-api/smoke.mjs', cover_image: null, publish_date: null, content_markdown: 'Body', category: 'Testing', tags: [], author: '', is_featured: false, seo_title: '', seo_description: '' } };
check('create a draft post', (await call('PUT', `/api/v1/admin/content/posts/${slug}`, post, token)).json?.version === 1);
check('stale version gets 409', (await call('PUT', `/api/v1/admin/content/posts/${slug}`, post, token)).status === 409);
check('invalid post gets 400 with field errors', Boolean((await call('PUT', `/api/v1/admin/content/posts/${slug}`, { ...post, version: 1, data: { ...post.data, title: '' } }, token)).json?.error?.details?.fieldErrors));

const inquiry = await call('POST', '/api/v1/admin/inquiries', { fullName: 'Smoke Test', workEmail: 'smoke@example.com', company: 'Smoke Co' }, token);
check('create an inquiry', inquiry.status === 201);
const converted = await call('POST', `/api/v1/admin/inquiries/${inquiry.json?.data?.id}/convert`, null, token);
check('convert inquiry to engagement', Boolean(converted.json?.data?.engagementId));
const finding = await call('POST', `/api/v1/admin/engagements/${converted.json?.data?.engagementId}/findings`, { title: 'Smoke SQLi', description: '', severity: 'LOW', cvssVersion: 'V3_1',
  cvssVector: 'CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:H', cvssScore: null, severityOverrideReason: null, cweId: null, pocText: null, remediationGuidance: null, references: [], affectedEndpoint: '/search', status: 'OPEN' }, token);
check('finding score is recomputed from the vector', finding.json?.data?.cvssScore === 9.8 && finding.json?.data?.severity === 'CRITICAL', JSON.stringify(finding.json));

const png = Buffer.from('89504e470d0a1a0a0000000d49484452000000010000000108060000001f15c4890000000d49444154789c6360000002000154a24f5d0000000049454e44ae426082', 'hex');
const form = new FormData(); form.append('purpose', 'blog-cover'); form.append('file', new Blob([png], { type: 'image/png' }), 'smoke.png');
const upload = await (await fetch(`${API}/api/v1/admin/media`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form })).json();
check('image upload is stored in MinIO', Boolean(upload.data?.url) && (await fetch(upload.data.url)).status === 200, JSON.stringify(upload));
const fake = new FormData(); fake.append('purpose', 'blog-cover'); fake.append('file', new Blob([Buffer.from('<?php system($_GET[1]); ?> padding')], { type: 'image/png' }), 'fake.png');
check('non-image bytes are rejected', (await fetch(`${API}/api/v1/admin/media`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: fake })).status === 415);
check('audit chain verifies', (await call('GET', '/api/v1/admin/audit-logs/verify-chain', null, token)).json?.data?.valid === true);

const editor = await signIn(env.DEV_EDITOR_EMAIL, env.DEV_EDITOR_PASSWORD);
check('editor signs in', Boolean(editor.token));
check('editor cannot publish', (await call('PUT', `/api/v1/admin/content/posts/${slug}-ed`, { ...post, slug: `${slug}-ed`, status: 'published' }, editor.token)).status === 403);
check('editor cannot manage users', (await call('GET', '/api/v1/admin/users', null, editor.token)).status === 403);

console.log(failures ? `\n${failures} check(s) failed.` : '\nAll checks passed.');
process.exit(failures ? 1 : 0);
