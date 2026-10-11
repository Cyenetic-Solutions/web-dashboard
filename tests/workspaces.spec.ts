import { test, expect } from '@playwright/test';
import { fixtures } from './fixtures';
import { authHandlers, mockApi, navigate, signIn } from './mockApi';

const pages: [string, string][] = [['Dashboard', 'Welcome back, Rafi'], ['Blog & advisories', 'Blog & advisories'], ['Media library', 'Media library'],
  ['Inquiries', 'Inquiry pipeline'], ['Report downloads', 'Report downloads'], ['Newsletter', 'Newsletter'], ['Engagements', 'Engagements'],
  ['Findings', 'Findings'], ['Retests', 'Retests'], ['Certificates', 'Certificates'], ['Users & roles', 'Users & roles'], ['Audit log', 'Audit log']];

test('every workspace renders from the API without page-level horizontal scroll', async ({ page }, testInfo) => {
  test.setTimeout(120_000);
  const auth = authHandlers();
  await mockApi(page, (method, path, body) => (path in fixtures ? { json: fixtures[path] } : auth(method, path, body)));
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'Welcome back, Rafi' })).toBeVisible();
  for (const [link, heading] of pages) {
    await navigate(page, link);
    await expect(page.getByRole('heading', { level: 1, name: heading })).toBeVisible();
    await expect(page.getByRole('status', { name: 'Loading' })).toHaveCount(0);
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth), `${link} overflows`).toBe(true);
    await page.screenshot({ path: testInfo.outputPath(`${link.replace(/\W+/g, '-').toLowerCase()}.png`), fullPage: true });
  }
});

test('modules missing from the API say so instead of showing sample data', async ({ page }) => {
  await mockApi(page, authHandlers());
  await signIn(page);
  await expect(page.getByText('Dashboard analytics is not served by the connected backend yet')).toBeVisible();
});
