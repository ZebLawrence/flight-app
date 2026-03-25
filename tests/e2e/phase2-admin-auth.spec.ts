import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable must be set to run admin auth E2E tests.',
  );
}

/** Shared helper: log in via the login form and wait for the dashboard. */
async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  // /admin redirects to /admin/tenants on successful login
  await expect(page).toHaveURL(/\/admin\/tenants/);
}

test.describe('Phase 2 — admin auth flow', () => {
  test('Unauthenticated access to /admin redirects to login', async ({ page }) => {
    await page.goto('/admin');

    // Should redirect to the login page
    await expect(page).toHaveURL(/\/admin\/login/);

    // Login form fields must be visible
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
  });

  test('Login with invalid credentials shows error', async ({ page }) => {
    await page.goto('/admin/login');

    await page.fill('#email', 'wrong@example.com');
    await page.fill('#password', 'wrongpassword');
    await page.click('button[type="submit"]');

    // Error alert must appear with an "Invalid credentials" message
    await expect(page.getByRole('alert')).toBeVisible();
    await expect(page.getByRole('alert')).toContainText('Invalid credentials');

    // URL must remain on the login page
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('Login with valid credentials redirects to dashboard', async ({ page }) => {
    await page.goto('/admin/login');

    await page.fill('#email', ADMIN_EMAIL);
    await page.fill('#password', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Should land on the admin dashboard (which redirects to /admin/tenants)
    await expect(page).toHaveURL(/\/admin\/tenants/);

    // Sidebar navigation must be visible
    await expect(page.locator('aside')).toBeVisible();
    await expect(page.getByRole('link', { name: 'Tenants' })).toBeVisible();

    // Tenants page heading or empty-state must be present
    await expect(page.getByRole('heading', { name: 'Tenants' })).toBeVisible();
  });

  test('Logout clears session', async ({ page }) => {
    // Log in first
    await loginAsAdmin(page);

    // Click the Logout button in the sidebar
    await page.getByRole('button', { name: 'Logout' }).click();

    // Should redirect to the login page after logout
    await expect(page).toHaveURL(/\/admin\/login/);

    // Navigating directly to /admin must redirect back to login (session gone)
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/login/);
  });
});
