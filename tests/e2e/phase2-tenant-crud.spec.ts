import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable must be set to run tenant CRUD E2E tests.',
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

// Run all tests in this suite serially so that each test can rely on
// state created by the previous one (create → edit → delete workflow).
test.describe.configure({ mode: 'serial' });

test.describe('Phase 2 — tenant CRUD workflow', () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test('1. Dashboard lists existing tenants', async ({ page }) => {
    await page.goto('/admin/tenants');

    // Assert: seeded "Demo Business" tenant is visible with its name and slug
    await expect(page.getByRole('cell', { name: 'Demo Business' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'demo' })).toBeVisible();
  });

  test('2. Create a new tenant', async ({ page }) => {
    await page.goto('/admin/tenants');

    // Click "Create tenant" link/button → navigate to new tenant form
    await page.getByRole('link', { name: 'Create tenant' }).click();
    await expect(page).toHaveURL(/\/admin\/tenants\/new/);

    // Fill in name: "Test Business"
    await page.fill('#name', 'Test Business');

    // Assert: slug auto-populates with "test-business"
    await expect(page.locator('#slug')).toHaveValue('test-business');

    // Click submit
    await page.click('button[type="submit"]');

    // Assert: redirect to tenant detail page
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+$/);

    // Navigate back to dashboard
    await page.goto('/admin/tenants');

    // Assert: "Test Business" appears in the tenant list
    await expect(page.getByRole('cell', { name: 'Test Business' })).toBeVisible();
  });

  test('3. Edit an existing tenant', async ({ page }) => {
    await page.goto('/admin/tenants');

    // Click "View / Edit" for the "Test Business" row
    const row = page.getByRole('row', { name: /Test Business/ });
    await row.getByRole('link', { name: 'View / Edit' }).click();

    // Assert: on the tenant detail page
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+$/);

    // Change name to "Updated Business"
    await page.fill('#name', 'Updated Business');

    // Click Save
    await page.getByRole('button', { name: 'Save changes' }).click();

    // Assert: success feedback shown
    await expect(page.getByRole('status')).toBeVisible();
    await expect(page.getByRole('status')).toContainText('updated successfully');

    // Navigate back to dashboard
    await page.goto('/admin/tenants');

    // Assert: "Updated Business" appears in the list
    await expect(page.getByRole('cell', { name: 'Updated Business' })).toBeVisible();
  });

  test('4. Delete a tenant', async ({ page }) => {
    await page.goto('/admin/tenants');

    // Click "View / Edit" for the "Updated Business" row
    const row = page.getByRole('row', { name: /Updated Business/ });
    await row.getByRole('link', { name: 'View / Edit' }).click();

    // Assert: on the tenant detail page
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+$/);

    // Register a one-time dialog handler before clicking (handles the confirm dialog)
    page.once('dialog', (dialog) => dialog.accept());

    // Click delete — the confirm dialog will be auto-accepted
    await page.getByRole('button', { name: 'Delete tenant' }).click();

    // Assert: redirect to tenant list after deletion
    await expect(page).toHaveURL(/\/admin\/tenants$/);

    // Assert: "Updated Business" is no longer in the list
    await expect(page.getByRole('cell', { name: 'Updated Business' })).not.toBeVisible();
  });
});
