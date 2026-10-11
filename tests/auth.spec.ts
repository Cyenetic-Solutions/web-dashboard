import { test, expect } from '@playwright/test';
import { authHandlers, mockApi } from './mockApi';

test('sign-in requires the emailed one-time code after the password', async ({ page }, testInfo) => {
  const calls: string[] = [];
  const auth = authHandlers();
  await mockApi(page, (method, path, body) => { calls.push(path); return auth(method, path, body); });
  await page.goto('/login');
  await page.getByLabel('Work email').fill('analyst@cyenetic.com');
  await page.getByLabel('Password', { exact: true }).fill('correct horse battery');
  await page.screenshot({ path: testInfo.outputPath('login.png') });
  await page.getByRole('button', { name: 'Continue' }).click();
  await expect(page.getByRole('heading', { name: 'Check your inbox' })).toBeVisible();
  await expect(page.getByText('a***@cyenetic.com')).toBeVisible();
  await expect(page.getByRole('button', { name: /Resend code in/ })).toBeDisabled();
  await page.screenshot({ path: testInfo.outputPath('email-code.png') });
  await page.getByLabel('Digit 1').fill('9');
  await page.keyboard.type('99999');
  await expect(page.getByText('That code is incorrect')).toBeVisible();
  expect(calls).not.toContain('/api/v1/admin/session');
  await page.getByLabel('Digit 1').fill('1');
  await page.keyboard.type('23456');
  await expect(page).toHaveURL('http://localhost:3101/');
  expect(calls).toContain('/api/v1/admin/session');
});
