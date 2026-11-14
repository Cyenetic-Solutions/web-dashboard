import { test, expect } from '@playwright/test';
import { authHandlers, firstRefreshToken, mockApi, navigate, signIn } from './mockApi';

/** Response shapes copied from Cyenetic-Solutions/web-backend main (the API at api.cyenetic.com). */
const live = {
  auditLogs: { data: [{ id: 'log1', actor: 'staff-1', action: 'content.save', createdAt: '2026-11-10T09:00:00.000Z',
    record: { kind: 'posts', slug: 'oauth-pitfalls', status: 'published', version: 2, data: {} } }], meta: { page: 1, pageSize: 100, total: 1, totalPages: 1 } },
  sessions: [
    { id: 'ses-live', userId: 'staff-1', userAgent: 'Mozilla/5.0 (Macintosh) Chrome/130', ipAddress: '203.0.113.7', refreshTokenHash: 'x', expiresAt: '2099-01-01T00:00:00.000Z', createdAt: '2026-11-10T09:00:00.000Z', revokedAt: null },
    { id: 'ses-revoked', userId: 'staff-1', userAgent: 'Mozilla/5.0 (Windows) Firefox/130', ipAddress: '198.51.100.2', refreshTokenHash: 'y', expiresAt: '2099-01-01T00:00:00.000Z', createdAt: '2026-11-01T09:00:00.000Z', revokedAt: '2026-11-02T09:00:00.000Z' },
  ],
};

test('works against the live API contract: refresh-token retry, audit rows and sessions', async ({ page }) => {
  const refreshBodies: unknown[] = [];
  let dashboardCallsAfterRefresh = 0;
  const auth = authHandlers();
  await mockApi(page, (method, path, body) => {
    if (path === '/api/v1/auth/refresh') refreshBodies.push(body);
    if (path.startsWith('/api/v1/admin/dashboard/')) {
      // Until the refresh token is rotated, the access token counts as expired, so the dashboard must refresh and retry.
      if (refreshBodies.length === 0) return { status: 401, json: { error: 'A valid MFA session is required' } };
      dashboardCallsAfterRefresh += 1;
      return { status: 404, json: { error: 'Not Found' } };
    }
    if (path === '/api/v1/admin/audit-logs') return { json: live.auditLogs };
    if (path === '/api/v1/admin/account/sessions') return { json: live.sessions };
    return auth(method, path, body);
  });
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'Welcome back, Rafi' })).toBeVisible();
  await expect.poll(() => refreshBodies).toContainEqual({ refreshToken: firstRefreshToken });
  await expect.poll(() => dashboardCallsAfterRefresh).toBeGreaterThan(0);
  expect(refreshBodies).toHaveLength(1);

  await navigate(page, 'Audit log');
  await expect(page.getByText('posts/oauth-pitfalls v2 · published').filter({ visible: true }).first()).toBeVisible();

  await page.getByLabel('Account menu').click();
  await page.getByRole('link', { name: 'Account & security' }).click();
  await page.getByRole('tab', { name: 'Sessions' }).click();
  await expect(page.getByText('203.0.113.7', { exact: false })).toBeVisible();
  await expect(page.getByText('198.51.100.2', { exact: false })).toHaveCount(0);
});

test('live API validation errors name the rejected field', async ({ page }) => {
  const auth = authHandlers();
  await mockApi(page, (method, path, body) => {
    if (method === 'PUT') return { status: 400, json: { error: 'Invalid request', issues: [{ path: ['data', 'description'], message: 'Too small: expected string to have >=1 characters' }] } };
    if (path === '/api/v1/admin/content/services') return { json: [] };
    return auth(method, path, body);
  });
  await signIn(page);
  await navigate(page, 'Service domains');
  await page.getByRole('button', { name: 'New domain' }).click();
  await page.getByLabel('Slug').fill('cloud-security');
  await page.getByLabel('Domain title').fill('Cloud security');
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByText('Invalid request (data.description: Too small', { exact: false }).first()).toBeVisible();
});
