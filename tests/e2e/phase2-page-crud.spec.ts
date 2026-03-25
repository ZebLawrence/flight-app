import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable must be set to run page CRUD E2E tests.',
  );
}

/** Shared helper: log in via the login form and wait for the dashboard. */
async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD!);
  await page.click('button[type="submit"]');
  // /admin redirects to /admin/tenants on successful login
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

// Run all tests in this suite serially so that each test can rely on
// state created by the previous one (create → edit → verify → delete workflow).
test.describe.configure({ mode: 'serial' });

test.describe('Phase 2 — page CRUD workflow', () => {
  let demoTenantId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsAdmin(page);
    demoTenantId = await getDemoTenantId(page);
    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('1. Pages list shows existing pages', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}/pages`);

    // Assert: the seeded "Hello World" homepage is visible in the list
    await expect(page.getByRole('link', { name: 'Hello World' })).toBeVisible();
  });

  test('2. Create a new page', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}/pages`);

    // Click "New page" button/link
    await page.getByRole('link', { name: 'New page' }).click();
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+\/pages\/new/);

    // Fill in title and slug
    await page.fill('#page-title', 'About Us');
    await expect(page.locator('#page-slug')).toHaveValue('about-us');
    // Override auto-generated slug with the required "about"
    await page.fill('#page-slug', 'about');

    // Enter valid JSON content in the Monaco editor
    await setMonacoContent(
      page,
      JSON.stringify({ type: 'Heading', props: { level: 1, text: 'About Us' } }),
    );

    // Submit the form
    await page.click('button[type="submit"]');

    // Assert: redirect to pages list (or page editor) after creation
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+\/pages\/[^/]+$/);

    // Navigate back to pages list and assert "About Us" appears
    await page.goto(`/admin/tenants/${demoTenantId}/pages`);
    await expect(page.getByRole('link', { name: 'About Us' })).toBeVisible();
  });

  test('3. Edit a page and verify on tenant site', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}/pages`);

    // Navigate to the "About Us" page editor
    await page.getByRole('link', { name: 'About Us' }).click();
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+\/pages\/[^/]+$/);

    // Change heading text in the JSON editor
    await setMonacoContent(
      page,
      JSON.stringify({ type: 'Heading', props: { level: 1, text: 'About Our Company' } }),
    );

    // Click Save and assert success feedback
    await page.getByRole('button', { name: 'Save' }).click();
    const status = page.getByRole('status');
    await expect(status).toBeVisible();
    await expect(status).toContainText('Page saved successfully');

    // Open a new tab and navigate to the tenant page to verify the change
    const context = page.context();
    const tenantPage = await context.newPage();
    await tenantPage.goto('http://demo.localhost:3000/about');

    // Assert: the updated heading is displayed
    await expect(tenantPage.getByRole('heading', { name: 'About Our Company' })).toBeVisible();

    await tenantPage.close();
  });

  test('4. Delete a page', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}/pages`);

    // Assert "About Us" is visible before deleting
    await expect(page.getByRole('link', { name: 'About Us' })).toBeVisible();

    // Locate the row that contains "About Us" and click its Delete button
    const row = page.getByRole('row', { name: /About Us/ });

    // Register a one-time dialog handler before clicking (handles the confirm dialog)
    page.once('dialog', (dialog) => dialog.accept());

    await row.getByRole('button', { name: 'Delete' }).click();

    // Assert: "About Us" is no longer in the list
    await expect(page.getByRole('link', { name: 'About Us' })).not.toBeVisible();

    // Navigate to the tenant site page and assert 404
    const response = await page.goto('http://demo.localhost:3000/about');
    expect(response?.status()).toBe(404);
  });
});
