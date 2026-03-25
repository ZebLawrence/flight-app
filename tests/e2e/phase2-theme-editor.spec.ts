import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const DEMO_SITE_URL = process.env.DEMO_SITE_URL ?? 'http://demo.localhost:3000';

if (!ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable must be set to run theme editor E2E tests.',
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

// Run all tests in this suite serially so state changes are predictable.
test.describe.configure({ mode: 'serial' });

test.describe('Phase 2 — theme editor', () => {
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

  test('1. Theme editor displays current values', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}`);

    // Assert: theme editor section is visible
    await expect(page.getByRole('heading', { name: 'Theme' })).toBeVisible();

    // Assert: primary color picker shows the seeded primary color value (#2563EB)
    const primaryInput = page.locator('#color-primary');
    await expect(primaryInput).toBeVisible();
    await expect(primaryInput).toHaveValue('#2563eb');
  });

  test('2. Change theme and verify on tenant site', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}`);

    // Change primary color to #ff0000 via the color input
    const primaryInput = page.locator('#color-primary');
    await primaryInput.evaluate((el: HTMLInputElement) => {
      el.value = '#ff0000';
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    });

    // Click "Save Theme" button
    await page.getByRole('button', { name: 'Save Theme' }).click();

    // Assert: success feedback shown
    const status = page.getByRole('status');
    await expect(status).toBeVisible();
    await expect(status).toContainText('Theme saved successfully');

    // Open the demo tenant site in a new tab and verify the CSS variable
    const context = page.context();
    const tenantPage = await context.newPage();
    await tenantPage.goto(`${DEMO_SITE_URL}/`);

    // Use page.evaluate() to read the CSS custom property value
    const primaryColor = await tenantPage.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
    );

    // Assert: CSS variable matches the new color (#ff0000 or its rgb equivalent)
    // CSS custom properties are stored as raw text tokens, so the value is typically
    // returned as hex. Accept both hex and rgb formats for robustness.
    const hexMatch = primaryColor.toLowerCase() === '#ff0000';
    const rgbMatch = primaryColor.replace(/\s/g, '') === 'rgb(255,0,0)';
    expect(hexMatch || rgbMatch).toBe(true);

    await tenantPage.close();
  });
});
