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
/** Refresh token the mocked verify step hands out; refresh accepts it once and rotates it. */
export const firstRefreshToken = 'refresh-token-0000000000000000000000000001';
/** Staff sign-in handlers mirroring the live API (web-backend main): plain-string errors, display role names, refresh token in the body. */
export function authHandlers(role = 'Super Admin') {
  return (method: string, path: string, body: unknown): Reply | undefined => {
    const inSeconds = (seconds: number) => new Date(Date.now() + seconds * 1000).toISOString();
    const field = (name: string) => (typeof body === 'object' && body !== null ? new Map(Object.entries(body)).get(name) : null);
    const challenge = () => ({ challengeId: '8f14e45f-ceea-4e7a-9d0b-2f1b7c3e5a10', maskedEmail: 'a***@cyenetic.com', expiresAt: inSeconds(300), resendAvailableAt: inSeconds(30) });
    if (path === '/api/v1/auth/refresh') return field('refreshToken') === firstRefreshToken
      ? { json: { accessToken: 'access-2', refreshToken: 'refresh-token-0000000000000000000000000002', expiresInSeconds: 900 } }
      : { status: 401, json: { error: 'Session expired' } };
    if (path === '/api/v1/auth/login') return { json: challenge() };
    if (path === '/api/v1/auth/login/resend') return { json: challenge() };
    if (path === '/api/v1/auth/login/verify') return field('code') === '123456'
      ? { json: { accessToken: 'access-1', refreshToken: firstRefreshToken, expiresInSeconds: 900 } }
      : { status: 401, json: { error: 'Invalid code' } };
    if (path === '/api/v1/auth/logout') return { json: {} };
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
