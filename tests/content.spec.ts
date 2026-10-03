import { test, expect } from '@playwright/test';

test('staff can create and publish a service and keep mobile navigation usable', async ({ page }, testInfo) => {
  const records: unknown[] = [];
  await page.route('http://localhost:4000/**', async (route) => {
    const request = route.request();
    const headers = { 'access-control-allow-origin': 'http://localhost:3101', 'access-control-allow-headers': 'authorization,content-type', 'access-control-allow-methods': 'GET,POST,PUT,OPTIONS' };
    if (request.method() === 'OPTIONS') return route.fulfill({ status: 204, headers });
    if (request.url().endsWith('/session')) return route.fulfill({ headers, json: { sub: 'test-admin', role: 'Super Admin', amr: ['mfa'] } });
    if (request.method() === 'PUT') {
      const body: unknown = request.postDataJSON();
      if (typeof body !== 'object' || body === null) throw new Error('Invalid test request');
      const saved = { ...body, version: 1, updatedAt: new Date().toISOString() };
      records.push(saved); return route.fulfill({ headers, json: saved });
    }
    return route.fulfill({ headers, json: records });
  });
  await page.goto('/content/services');
  await expect(page.getByRole('heading', { name: 'Staff session required' })).toBeVisible();
  await page.goto('/login');
  await page.getByLabel('MFA access token').fill('test-token');
  await page.getByRole('button', { name: 'Connect session' }).click();
  await expect(page).toHaveURL('http://localhost:3101/');
  await expect(page.getByRole('button', { name: 'Sign out' })).toBeVisible();
  await page.getByRole('link', { name: 'Service domains' }).click();
  await page.getByRole('button', { name: 'New record' }).click();
  await page.getByLabel('Publication status').selectOption('published');
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByRole('status')).toHaveText('Saved version 1 · published');
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('cms.png'), fullPage: true });
  await page.getByRole('button', { name: 'New record' }).click();
  await expect(page.getByLabel('Slug', { exact: true })).toBeEditable();
  await expect(page.getByLabel('Publication status')).toHaveValue('draft');
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Staff session required' })).toBeVisible();
});
