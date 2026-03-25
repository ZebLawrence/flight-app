import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable must be set to run preview mode E2E tests.',
  );
}

const DEMO_TENANT_SITE = 'http://demo.localhost:3000';
const DRAFT_PAGE_TITLE = 'Preview Draft Test';
const DRAFT_PAGE_SLUG = 'preview-draft-test';

/** Shared helper: log in via the login form and wait for the dashboard. */
async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD!);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin\/tenants/);
}

/**
 * Navigate to the Demo Business tenant detail page and return the tenant ID
 * extracted from the URL.
 */
async function getDemoTenantId(page: Page): Promise<string> {
  await page.goto('/admin/tenants');
  const row = page.getByRole('row', { name: /Demo Business/ });
  await row.getByRole('link', { name: 'View / Edit' }).click();
  await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+$/);
  const url = page.url();
  const match = url.match(/\/admin\/tenants\/([^/]+)$/);
  if (!match) throw new Error(`Could not extract tenant ID from URL: ${url}`);
  return match[1];
}

/**
 * Set the content of the Monaco JSON editor using Monaco's JavaScript API.
 * This is more reliable than keyboard shortcuts because it bypasses focus
 * quirks and works consistently across operating systems.
 */
async function setMonacoContent(page: Page, content: string) {
  await page.locator('.monaco-editor').first().waitFor();
  await page.evaluate((value) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const models = (window as any).monaco?.editor?.getModels?.();
    if (models?.length) models[0].setValue(value);
  }, content);
}

// Run all tests in this suite serially so each test can rely on state
// created by the previous one (create → preview → 404 checks → cleanup).
test.describe.configure({ mode: 'serial' });

test.describe('Phase 2 — preview / draft mode', () => {
  let demoTenantId: string;
  let draftPageId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsAdmin(page);
    demoTenantId = await getDemoTenantId(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterAll(async ({ browser }) => {
    // Clean up: delete the draft page created during the tests so subsequent
    // runs start with a clean slate.
    if (!demoTenantId) return;
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await page.goto(`/admin/tenants/${demoTenantId}/pages`);
    const row = page.getByRole('row', { name: new RegExp(DRAFT_PAGE_TITLE) });
    // The row might already be gone if cleanup happened earlier — only delete
    // if the row is still present.
    if ((await row.count()) > 0) {
      page.once('dialog', (dialog) => dialog.accept());
      await row.getByRole('button', { name: 'Delete' }).click();
    }
    await page.close();
  });

  test('1. Preview button generates working preview link', async ({ page, context }) => {
    // ── Step 1: Create a new page for the demo tenant ──────────────────────
    await page.goto(`/admin/tenants/${demoTenantId}/pages`);
    await page.getByRole('link', { name: 'New page' }).click();
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+\/pages\/new/);

    await page.fill('#page-title', DRAFT_PAGE_TITLE);
    await page.fill('#page-slug', DRAFT_PAGE_SLUG);

    await setMonacoContent(
      page,
      JSON.stringify({ type: 'Heading', props: { level: 1, text: DRAFT_PAGE_TITLE } }),
    );

    // Submit the creation form — redirects to the page editor
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+\/pages\/[^/]+$/);

    // Extract the page ID from the editor URL for cleanup in afterAll
    const match = page.url().match(/\/pages\/([^/]+)$/);
    if (!match) throw new Error(`Could not extract page ID from URL: ${page.url()}`);
    draftPageId = match[1];

    // ── Step 2: Unpublish the page so it becomes a draft ───────────────────
    // uncheck() is idempotent — safe to call regardless of initial state.
    await page.locator('#page-published').uncheck();

    await page.getByRole('button', { name: 'Save' }).click();
    const status = page.getByRole('status');
    await expect(status).toBeVisible();
    await expect(status).toContainText('Page saved successfully');

    // Verify the checkbox is now unchecked (page is a draft)
    await expect(page.locator('#page-published')).not.toBeChecked();

    // ── Step 3: Click Preview and assert the preview tab ───────────────────
    // Listen for the popup (new tab) that the Preview button opens before
    // clicking so we don't miss the event.
    const popupPromise = context.waitForEvent('page');
    await page.getByRole('button', { name: 'Preview' }).click();
    const previewPage = await popupPromise;

    // Wait for the browser to follow the 302 redirect from /api/admin/preview
    // to the final tenant preview URL (which includes the ?preview= token).
    await previewPage.waitForURL((url) => url.searchParams.has('preview'), { timeout: 15000 });
    await previewPage.waitForLoadState('domcontentloaded');

    // Assert: "Preview Mode" banner is visible at the top of the page
    await expect(previewPage.getByText('Preview Mode')).toBeVisible();

    // Assert: the draft page content is rendered
    await expect(
      previewPage.getByRole('heading', { name: DRAFT_PAGE_TITLE }),
    ).toBeVisible();

    await previewPage.close();
  });

  test('2. Draft page is not accessible without a preview token', async ({ page }) => {
    // Navigate directly to the draft page's tenant URL with no ?preview= param.
    // The page is unpublished so the tenant route should return 404.
    const response = await page.goto(`${DEMO_TENANT_SITE}/${DRAFT_PAGE_SLUG}`);
    expect(response?.status()).toBe(404);
  });

  test('3. Preview URL with an invalid/expired token returns 404', async ({ page }) => {
    // Use a provably invalid token — three dot-separated segments that will
    // fail JWT signature verification, simulating an expired or tampered token.
    const invalidToken = 'invalid.preview.token';
    const response = await page.goto(
      `${DEMO_TENANT_SITE}/${DRAFT_PAGE_SLUG}?preview=${invalidToken}`,
    );
    expect(response?.status()).toBe(404);
  });
});
