import { expect, type Page, type Route } from '@playwright/test';

/** Route handler result: JSON body with optional status. */
export type Reply = { status?: number; json: unknown };
/** Mocks the HTTP API boundary; authorization is tested in the backend repository. */
export async function mockApi(page: Page, handle: (method: string, path: string, body: unknown) => Reply | undefined) {
  await page.route('http://localhost:4000/**', async (route: Route) => {
    const request = route.request();
    const headers = { 'access-control-allow-origin': 'http://localhost:3101', 'access-control-allow-credentials': 'true',
      'access-control-allow-headers': 'authorization,content-type,x-requested-with', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    const path = new URL(request.url()).pathname;
    let body: unknown = null;
    try { body = request.postDataJSON(); } catch { body = null; }
    const reply = handle(request.method(), path, body) ?? { status: 404, json: { error: { code: 'NOT_FOUND', message: 'Not found' } } };
    return route.fulfill({ status: reply.status ?? 200, headers, json: reply.json });
  });
}
/** Standard staff sign-in handlers mirroring the live API: no refresh cookie, password accepted, emailed code 123456. */
export function authHandlers(role = 'SUPER_ADMIN') {
  return (method: string, path: string, body: unknown): Reply | undefined => {
    const inSeconds = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();
    const challenge = () => ({ codeRequired: true, challengeId: 'challenge-1', maskedEmail: 'a***@cyenetic.com', expiresAt: inSeconds(300), resendAvailableAt: inSeconds(30) });
    if (path === '/api/v1/auth/refresh') return { status: 401, json: { error: { code: 'UNAUTHENTICATED', message: 'No session' } } };
    if (path === '/api/v1/auth/login') return { json: challenge() };
    if (path === '/api/v1/auth/login/resend') return { json: challenge() };
    if (path === '/api/v1/auth/login/verify') {
      const code = typeof body === 'object' && body !== null && 'code' in body ? body.code : null;
      return code === '123456' ? { json: { accessToken: 'access-1', expiresInSeconds: 900 } } : { status: 401, json: { error: { code: 'OTP_INVALID', message: 'Invalid code' } } };
    }
    if (path === '/api/v1/auth/logout') return { json: { ok: true } };
    if (path === '/api/v1/auth/me') return { json: { data: { id: 'staff-1', role, email: 'analyst@cyenetic.com', fullName: 'Rafi Analyst' } } };
    return undefined;
  };
}
/** Completes the two-step email OTP sign-in. */
export async function signIn(page: Page) {
  await page.goto('/login');
  await page.getByLabel('Work email').fill('analyst@cyenetic.com');
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery');
  await page.getByRole('button', { name: 'Continue' }).click();
  await page.getByLabel('Digit 1').fill('1');
  await page.keyboard.type('23456');
}
/** Opens a workspace from the sidebar, using the navigation drawer on small screens. */
export async function navigate(page: Page, name: string) {
  const mobile = (page.viewportSize()?.width ?? 1280) < 1024;
  const drawer = page.getByRole('dialog', { name: 'Navigation' });
  if (mobile) { await page.getByRole('button', { name: 'Open navigation' }).click(); await expect(drawer).toBeVisible(); }
  const link = (mobile ? drawer : page).getByRole('navigation', { name: 'Workspaces' }).getByRole('link', { name, exact: true });
  if (mobile) { await link.focus(); await page.keyboard.press('Enter'); } else await link.click();
  if (mobile) await expect(drawer).toBeHidden();
}
