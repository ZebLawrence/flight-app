import path from 'path';
import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable must be set to run media library E2E tests.',
  );
}

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

// Run all tests serially so state flows from upload → copy → delete.
test.describe.configure({ mode: 'serial' });

test.describe('Phase 2 — media library', () => {
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

  test('1. Media library page loads', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}/media`);

    // Assert: page heading is visible
    await expect(page.getByRole('heading', { name: 'Media Library' })).toBeVisible();

    // Assert: upload area is visible (drag-and-drop zone text)
    await expect(page.getByText('Drag and drop files here')).toBeVisible();

    // Assert: browse button (the inline upload trigger) is visible
    await expect(page.getByRole('button', { name: 'browse' })).toBeVisible();
  });

  test('2. Upload an image', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}/media`);

    const fixturePath = path.join(__dirname, '../fixtures/test-image.png');

    // Set the file on the hidden file input directly (bypasses click/dialog)
    await page.locator('input[type="file"]').setInputFiles(fixturePath);

    // Wait for the "Uploading…" indicator to disappear
    await expect(page.getByText('Uploading…')).not.toBeVisible({ timeout: 15_000 });

    // Assert: image thumbnail appears in the media grid
    await expect(page.getByAltText('test-image.png')).toBeVisible();
  });

  test('3. Copy media URL', async ({ page, context }) => {
    // Grant clipboard permissions so navigator.clipboard.readText() works
    await context.grantPermissions(['clipboard-read', 'clipboard-write']);

    await page.goto(`/admin/tenants/${demoTenantId}/media`);

    // Hover over the image to trigger the group-hover overlay
    await page.getByAltText('test-image.png').hover();

    // Click the "Copy URL" button (now visible via group-hover)
    await page.getByTitle('Copy URL').click();

    // Assert: clipboard now contains a URL
    const clipboardText = await page.evaluate(() => navigator.clipboard.readText());
    expect(clipboardText).toMatch(/^https?:\/\//);
  });

  test('4. Delete media', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}/media`);

    // Accept the confirmation dialog before it appears
    page.once('dialog', (dialog) => dialog.accept());

    // Hover over the image to trigger the group-hover overlay, then click "Delete"
    await page.getByAltText('test-image.png').hover();
    await page.getByTitle('Delete').click();

    // Assert: the image is no longer in the grid
    await expect(page.getByAltText('test-image.png')).not.toBeVisible({ timeout: 10_000 });
  });
});
