import { test, expect, type Page } from '@playwright/test';
import { authHandlers, mockApi, navigate, signIn } from './mockApi';

type Saved = { kind: string; slug: string; status: string; data: Record<string, unknown> };
/** In-memory CMS: PUT upserts by slug and bumps the version; GET lists one kind. */
async function cms(page: Page, seed: Saved[] = []) {
  const records = new Map(seed.map((r) => [`${r.kind}/${r.slug}`, { ...r, version: 1, updatedAt: new Date().toISOString() }]));
  const puts: Saved[] = [];
  const auth = authHandlers();
  await mockApi(page, (method, path, body) => {
    const list = /^\/api\/v1\/admin\/content\/([a-z-]+)$/.exec(path);
    if (method === 'GET' && list) return { json: [...records.values()].filter((r) => r.kind === list[1]) };
    if (method === 'PUT' && typeof body === 'object' && body !== null) {
      const input = body as Saved & { version: number };
      const saved = { ...input, version: input.version + 1, updatedAt: new Date().toISOString() };
      records.set(`${input.kind}/${input.slug}`, saved); puts.push(input); return { json: saved };
    }
    return auth(method, path, body);
  });
  await signIn(page);
  await expect(page.getByRole('heading', { name: 'Welcome back, Rafi' })).toBeVisible();
  return puts;
}
const noOverflow = (page: Page) => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth);

test('blog posts are written with a cover, tags and Markdown, found by search and deleted after confirmation', async ({ page }, testInfo) => {
  const puts = await cms(page);
  await navigate(page, 'Blog');
  await page.getByRole('button', { name: 'New post' }).click();
  await page.getByLabel('Slug').fill('oauth-pitfalls');
  await page.getByLabel('Title', { exact: true }).fill('OAuth pitfalls in fintech APIs');
  await page.getByLabel('Subtitle').fill('Five mistakes we keep finding');
  await page.getByLabel('Upload Cover image').setInputFiles({ name: 'cover.png', mimeType: 'image/png', buffer: Buffer.from('png') });
  await expect(page.getByText('Image upload is not connected to the API yet')).toBeVisible();
  await page.getByLabel('Image URL').fill('https://cdn.example.com/oauth.png');
  await page.getByLabel('Alt text').fill('OAuth flow diagram');
  await page.getByRole('textbox', { name: 'Description', exact: true }).fill('## Token leakage\n\nRedirect URIs were **not** pinned.');
  await page.getByRole('tab', { name: 'Preview' }).click();
  await expect(page.getByRole('heading', { level: 2, name: 'Token leakage' })).toBeVisible();
  await page.getByLabel('Publish date').fill('2026-10-11');
  await page.getByLabel('Tags').fill('oauth'); await page.keyboard.press('Enter');
  await page.getByLabel('Publication status').selectOption('published');
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toHaveText('Saved version 1 · Published');
  expect(puts[0].data).toMatchObject({ cover_image: { url: 'https://cdn.example.com/oauth.png', alt: 'OAuth flow diagram' }, tags: ['oauth'], publish_date: '2026-10-11' });
  expect(await noOverflow(page)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('blog-editor.png'), fullPage: true });

  await page.getByRole('button', { name: 'Back to list' }).click();
  await page.getByLabel('Search Blog').fill('oauth');
  await expect(page.getByText('OAuth pitfalls in fintech APIs').filter({ visible: true })).toBeVisible();
  await page.getByLabel('Search Blog').fill('kubernetes');
  await expect(page.getByRole('heading', { name: 'No records match' })).toBeVisible();
  await page.getByLabel('Search Blog').fill('');
  await page.getByRole('button', { name: 'Delete OAuth pitfalls in fintech APIs' }).filter({ visible: true }).click();
  const dialog = page.getByRole('dialog', { name: 'Delete this post?' });
  await expect(dialog.getByRole('button', { name: 'Delete' })).toBeDisabled();
  await dialog.getByRole('textbox').fill('OAuth pitfalls in fintech APIs');
  await dialog.getByRole('button', { name: 'Delete' }).click();
  await expect(dialog).toBeHidden();
  expect(puts.at(-1)).toMatchObject({ slug: 'oauth-pitfalls', status: 'archived' });
  await expect(page.getByText('Archived', { exact: true }).filter({ visible: true }).first()).toBeVisible();
});

test('case studies collect company details, requirement points, engagement, people and reviews', async ({ page }, testInfo) => {
  const puts = await cms(page);
  await navigate(page, 'Case studies');
  await page.getByRole('button', { name: 'New case study' }).click();
  await page.getByLabel('Slug').fill('digital-bank');
  await page.getByRole('textbox', { name: 'Tagline', exact: true }).fill('Web and Android testing before launch');
  await page.getByRole('textbox', { name: 'Company overview', exact: true }).fill('Regional digital bank with 2M customers.');
  await page.getByRole('textbox', { name: 'Address', exact: true }).fill('Dhaka, Bangladesh');
  await page.getByLabel('Company size').selectOption('201-1000');
  await page.getByLabel('Test type').fill('Web Application'); await page.keyboard.press('Enter');
  await page.getByRole('textbox', { name: 'Company requirement' }).fill('Independent assurance before launch.');
  await page.getByRole('textbox', { name: 'Point 1', exact: true }).fill('Validating the security posture of their web & Android applications');
  await page.getByRole('button', { name: '+ Web Application Pentesting' }).click();
  await page.getByRole('button', { name: '+ Add person' }).click();
  await page.getByRole('textbox', { name: 'Quote', exact: true }).fill('Clear, fast and thorough.');
  await page.getByRole('textbox', { name: 'Name', exact: true }).fill('A. Rahman');
  await page.getByRole('textbox', { name: 'Role', exact: true }).fill('CISO');
  await page.getByRole('button', { name: 'Save record' }).click();
  await expect(page.getByRole('status').filter({ hasText: 'Saved' })).toHaveText('Saved version 1 · Draft');
  expect(puts[0].data).toMatchObject({ company_size: '201-1000', test_types: ['Web Application'], engagement_items: [{ title: 'Web Application Pentesting' }],
    testimonials: [{ name: 'A. Rahman', designation: 'CISO' }] });
  expect(await noOverflow(page)).toBe(true);
  await page.screenshot({ path: testInfo.outputPath('case-study-editor.png'), fullPage: true });
});

test('team members can be reordered from the list', async ({ page }) => {
  const member = (slug: string, title: string, sort_order: number): Saved => ({ kind: 'team', slug, status: 'published', data: {
    title, designation: 'Pentester', bio: 'Bio', image_url: null, image_alt: '', linkedin_url: null, department: 'Offensive Security',
    certifications: ['OSCP'], skills: [], links: [], show_on_site: true, sort_order } });
  const puts = await cms(page, [member('ayesha', 'Ayesha Karim', 0), member('tanvir', 'Tanvir Hasan', 0)]);
  await navigate(page, 'Team');
  await page.getByRole('button', { name: 'Move Ayesha Karim down' }).filter({ visible: true }).click();
  await expect.poll(() => puts.map((p) => [p.slug, p.data.sort_order])).toEqual([['ayesha', 10]]);
  await expect(page.getByRole('button', { name: 'Move Tanvir Hasan up' }).filter({ visible: true })).toBeDisabled();
});
