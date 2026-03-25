import path from 'path';
import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable must be set to run the full workflow E2E test.',
  );
}

const TENANT_NAME = 'Workflow Test';
const TENANT_SLUG = 'workflow-test';
const TENANT_SITE_URL = `http://${TENANT_SLUG}.localhost:3000`;
const PRIMARY_COLOR = '#336699';

/** Shared helper: log in via the login form and wait for the dashboard. */
async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD!);
  await page.click('button[type="submit"]');
  // /admin redirects to /admin/tenants on successful login
  await expect(page).toHaveURL(/\/admin\/tenants/);
}

// The whole workflow runs as a single serial describe so state is shared across
// beforeAll / test / afterAll cleanly.
test.describe.configure({ mode: 'serial' });

test.describe('Phase 2 — full admin-to-tenant workflow', () => {
  /** UUID of the created tenant — set during the test, used in afterAll cleanup. */
  let tenantId: string;

  test.afterAll(async ({ browser }) => {
    // Clean up: delete the tenant created during the test so subsequent runs
    // start with a clean slate.
    if (!tenantId) return;
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await page.goto(`/admin/tenants/${tenantId}`);
    page.once('dialog', (dialog) => dialog.accept());
    await page.getByRole('button', { name: 'Delete tenant' }).click();
    await expect(page).toHaveURL(/\/admin\/tenants$/);
    await page.close();
  });

  test('Full admin-to-tenant workflow', async ({ page, context }) => {
    // ──────────────────────────────────────────────────────────────────────
    // Step 1: Log in to admin at /admin/login
    // ──────────────────────────────────────────────────────────────────────
    await loginAsAdmin(page);

    // ──────────────────────────────────────────────────────────────────────
    // Step 2: Create a new tenant named "Workflow Test"
    // ──────────────────────────────────────────────────────────────────────
    await page.getByRole('link', { name: 'Create tenant' }).click();
    await expect(page).toHaveURL(/\/admin\/tenants\/new/);

    await page.fill('#name', TENANT_NAME);
    // Assert: slug auto-populates with "workflow-test"
    await expect(page.locator('#slug')).toHaveValue(TENANT_SLUG);

    await page.click('button[type="submit"]');

    // After creation, we should be on the tenant detail page
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+$/);
    const tenantDetailUrl = page.url();
    const idMatch = tenantDetailUrl.match(/\/admin\/tenants\/([^/]+)$/);
    if (!idMatch) throw new Error(`Could not extract tenant ID from URL: ${tenantDetailUrl}`);
    tenantId = idMatch[1];

    // ──────────────────────────────────────────────────────────────────────
    // Step 2b: Set primary color to #336699 via theme editor on the detail page
    // ──────────────────────────────────────────────────────────────────────
    const primaryInput = page.locator('#color-primary');
    await primaryInput.evaluate((el: HTMLInputElement, color: string) => {
      el.value = color;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, PRIMARY_COLOR);

    await page.getByRole('button', { name: 'Save Theme' }).click();
    const themeStatus = page.getByRole('status');
    await expect(themeStatus).toBeVisible();
    await expect(themeStatus).toContainText('Theme saved successfully');

    // ──────────────────────────────────────────────────────────────────────
    // Step 3: Create a homepage for the new tenant.
    //
    // The homepage uses slug '' (empty string) to match the root URL pattern
    // `http://workflow-test.localhost:3000/`. The NewPageForm UI enforces a
    // non-empty slug, so we create the page via the admin API directly — the
    // authenticated session cookie carries over to page.request.
    // ──────────────────────────────────────────────────────────────────────
    const homeContent = {
      type: 'Section',
      props: {},
      children: [
        {
          type: 'Container',
          children: [
            { type: 'Heading', props: { level: 1, text: 'Workflow Test Site' } },
            { type: 'Button', props: { label: 'Learn More', href: '/about' } },
          ],
        },
      ],
    };

    const createPageRes = await page.request.post('/api/admin/pages', {
      data: {
        tenantId,
        slug: '',
        title: 'Home',
        content: homeContent,
        published: true,
      },
    });
    expect(createPageRes.ok()).toBe(true);

    // ──────────────────────────────────────────────────────────────────────
    // Step 4: Upload a test image via the media library
    // ──────────────────────────────────────────────────────────────────────
    await page.goto(`/admin/tenants/${tenantId}/media`);
    const fixturePath = path.join(__dirname, '../fixtures/test-image.png');
    await page.locator('input[type="file"]').setInputFiles(fixturePath);

    // Wait for "Uploading…" indicator to disappear, then assert the thumbnail
    await expect(page.getByText('Uploading…')).not.toBeVisible({ timeout: 15_000 });
    await expect(page.getByAltText('test-image.png')).toBeVisible();

    // ──────────────────────────────────────────────────────────────────────
    // Steps 5–9: Navigate to the tenant site and assert all conditions
    // ──────────────────────────────────────────────────────────────────────
    const tenantPage = await context.newPage();
    await tenantPage.goto(`${TENANT_SITE_URL}/`);

    // Step 6: Assert — page renders the heading text "Workflow Test Site"
    await expect(tenantPage.getByRole('heading', { name: 'Workflow Test Site' })).toBeVisible();

    // Step 7: Assert — button is visible with label "Learn More"
    await expect(tenantPage.getByRole('link', { name: 'Learn More' })).toBeVisible();

    // Step 8: Assert — --color-primary CSS variable equals #336699 (or rgb equivalent)
    // Use page.evaluate() to read the CSS custom property at runtime.
    const primaryColor = await tenantPage.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
    );
    const hexMatch = primaryColor.toLowerCase() === PRIMARY_COLOR.toLowerCase();
    // rgb(51, 102, 153) is the rgb equivalent of #336699
    const rgbMatch = primaryColor.replace(/\s/g, '') === 'rgb(51,102,153)';
    expect(hexMatch || rgbMatch).toBe(true);

    // Step 9: Assert — page is SSR: raw HTML source contains the heading text
    // page.content() returns the full HTML as served, including server-rendered markup.
    const rawHtml = await tenantPage.content();
    expect(rawHtml).toContain('Workflow Test Site');

    await tenantPage.close();
  });
});
