import { test, expect, type Page } from '@playwright/test';

const BASE_URL = 'http://localhost:3000';
const ADDON_API = `${BASE_URL}/api/internal/addon-config`;

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable must be set to run addon admin E2E tests.',
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

// Run all tests serially so state is predictable across the suite.
test.describe.configure({ mode: 'serial' });

test.describe('Phase 4 — addon admin management UI', () => {
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

  // ─── Test 1: Addon manager lists all available addons ──────────────────────

  test('1. Addon manager lists all available addons with toggles', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}/addons`);

    // Page heading
    await expect(page.getByRole('heading', { name: 'Addon Manager' })).toBeVisible();

    // All four addons must appear as labelled toggle switches
    await expect(page.getByRole('switch', { name: 'Toggle Forms' })).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Toggle Gallery' })).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Toggle Calendar' })).toBeVisible();
    await expect(page.getByRole('switch', { name: 'Toggle Analytics' })).toBeVisible();
  });

  // ─── Test 2: Toggle addon on and off with persistence ──────────────────────

  test('2. Toggle forms addon on and off with persistence', async ({ request, page }) => {
    // Reset: forms addon enabled before the test.
    const resetRes = await request.post(ADDON_API, {
      data: { tenantSlug: 'demo', addonKey: 'forms', config: {}, enabled: true },
    });
    expect(resetRes.ok()).toBeTruthy();

    await page.goto(`/admin/tenants/${demoTenantId}/addons`);

    const formsToggle = page.getByRole('switch', { name: 'Toggle Forms' });

    // Assert: forms addon starts enabled (toggle ON)
    await expect(formsToggle).toHaveAttribute('aria-checked', 'true');

    // Click toggle → OFF state reflected immediately
    await formsToggle.click();
    await expect(formsToggle).toHaveAttribute('aria-checked', 'false');

    // Refresh → still OFF (state persisted to the database)
    await page.reload();
    await expect(page.getByRole('switch', { name: 'Toggle Forms' })).toHaveAttribute(
      'aria-checked',
      'false',
    );

    // Click toggle → ON again
    await page.getByRole('switch', { name: 'Toggle Forms' }).click();
    await expect(page.getByRole('switch', { name: 'Toggle Forms' })).toHaveAttribute(
      'aria-checked',
      'true',
    );
  });

  // ─── Test 3: Addon config form saves and persists values ───────────────────

  test('3. Analytics addon config form saves and persists values', async ({
    request,
    page,
  }) => {
    // Reset: analytics addon with an empty tracking ID so the test controls the value.
    const resetRes = await request.post(ADDON_API, {
      data: {
        tenantSlug: 'demo',
        addonKey: 'analytics',
        config: { provider: 'ga4', trackingId: '' },
        enabled: true,
      },
    });
    expect(resetRes.ok()).toBeTruthy();

    await page.goto(`/admin/tenants/${demoTenantId}/addons`);

    // Provider dropdown and tracking ID field must both be visible
    const providerSelect = page.getByLabel('Provider');
    const trackingIdInput = page.getByLabel('Tracking Id');

    await expect(providerSelect).toBeVisible();
    await expect(trackingIdInput).toBeVisible();

    // Fill in a new tracking ID and select a provider
    await trackingIdInput.fill('G-TEST9876543');
    await providerSelect.selectOption('ga4');

    // Save the configuration
    await page.getByRole('button', { name: 'Save configuration' }).click();

    // Success banner appears
    await expect(page.getByText('Configuration saved')).toBeVisible();

    // Refresh → both config values are still present (persisted)
    await page.reload();

    await expect(page.getByLabel('Tracking Id')).toHaveValue('G-TEST9876543');
    await expect(page.getByLabel('Provider')).toHaveValue('ga4');
  });
});
