import { test, expect } from '@playwright/test';
import { authHandlers, mockApi, navigate, signIn } from './mockApi';

test('staff can create and publish a service and keep mobile navigation usable', async ({ page }, testInfo) => {
  const records: unknown[] = [];
  const auth = authHandlers();
  await mockApi(page, (method, path, body) => {
    if (method === 'PUT' && typeof body === 'object' && body !== null) { const saved = { ...body, version: 1, updatedAt: new Date().toISOString() }; records.push(saved); return { json: saved }; }
    if (path === '/api/v1/admin/content/services') return { json: records };
    return auth(method, path, body);
  });
  await page.goto('/content/services');
  await expect(page.getByRole('heading', { name: 'Staff session required' })).toBeVisible();
  await signIn(page);
  await expect(page).toHaveURL('http://localhost:3101/');
  await navigate(page, 'Service domains');
  await page.getByRole('button', { name: 'New domain' }).click();
  await page.getByLabel('Slug').fill('cloud-security');
  await page.getByLabel('Domain title').fill('Cloud security');
  await page.getByRole('button', { name: '+ Add sub-domain' }).click();
  await page.getByLabel('Title', { exact: true }).fill('AWS');
  await page.getByLabel('Slug', { exact: true }).first().fill('aws');
  await page.getByLabel('Description').last().fill('Account and workload review');
  await page.getByLabel('Publication status').selectOption('published');
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toHaveText('Saved version 1 · published');
  expect(records).toHaveLength(1);
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('cms.png'), fullPage: true });
  await page.getByRole('button', { name: 'Back to list' }).click();
  await expect(page.getByText('Cloud security').filter({ visible: true })).toBeVisible();
  await page.getByLabel('Account menu').click();
  await page.getByRole('button', { name: 'Sign out' }).click();
  await expect(page.getByRole('heading', { name: 'Staff session required' })).toBeVisible();
});
