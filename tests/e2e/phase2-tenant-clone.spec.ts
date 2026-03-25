import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable must be set to run tenant cloning E2E tests.',
  );
}

const SOURCE_TENANT_NAME = 'Demo Business';
const CLONE_NAME = 'Cloned Business';
const CLONE_SLUG = 'cloned-business';
const CLONE_SITE_URL = `http://${CLONE_SLUG}.localhost:3000`;

/** A distinctive primary colour applied to the demo tenant before cloning. */
const PRIMARY_COLOR = '#4F46E5';

const FROM_TEMPLATE_NAME = 'Restaurant Clone';
const FROM_TEMPLATE_SLUG = 'restaurant-clone';
/** Expected primary colour of the "Starter - Restaurant" template (from the seed). */
const RESTAURANT_PRIMARY_COLOR = '#C0392B';

/** Convert a 6-digit hex colour to the CSS rgb() string browsers use. */
function hexToRgb(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgb(${r}, ${g}, ${b})`;
}

/** Log in via the admin login form and wait for the tenant dashboard. */
async function loginAsAdmin(page: Page) {
  await page.goto('/admin/login');
  await page.fill('#email', ADMIN_EMAIL);
  await page.fill('#password', ADMIN_PASSWORD!);
  await page.click('button[type="submit"]');
  await expect(page).toHaveURL(/\/admin\/tenants/);
}

// All tests in this suite share state (IDs, page counts) so they must be serial.
test.describe.configure({ mode: 'serial' });

test.describe('Phase 2 — tenant cloning', () => {
  /** ID of the demo tenant used as the clone source. */
  let sourceTenantId: string;
  /** ID of the clone created in test 1. */
  let clonedTenantId: string;
  /** ID of the tenant created from a template in test 4. */
  let fromTemplateTenantId: string;
  /** Page count of the source tenant, captured in test 2. */
  let sourcePageCount: number;

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsAdmin(page);

    // Delete the cloned tenant
    if (clonedTenantId) {
      await page.goto(`/admin/tenants/${clonedTenantId}`);
      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('button', { name: 'Delete tenant' }).click();
      await expect(page).toHaveURL(/\/admin\/tenants$/);
    }

    // Delete the tenant created from the restaurant template
    if (fromTemplateTenantId) {
      await page.goto(`/admin/tenants/${fromTemplateTenantId}`);
      page.once('dialog', (dialog) => dialog.accept());
      await page.getByRole('button', { name: 'Delete tenant' }).click();
      await expect(page).toHaveURL(/\/admin\/tenants$/);
    }

    // Restore the demo tenant's theme to its original empty state
    if (sourceTenantId) {
      await page.request.put(`/api/admin/tenants/${sourceTenantId}`, {
        data: { theme: {} },
      });
    }

    await page.close();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 1 — Clone a tenant
  // ──────────────────────────────────────────────────────────────────────────
  test('1. Clone a tenant', async ({ page }) => {
    // Navigate to the demo tenant detail page
    await page.goto('/admin/tenants');
    const sourceRow = page.getByRole('row', { name: new RegExp(SOURCE_TENANT_NAME) });
    await sourceRow.getByRole('link', { name: 'View / Edit' }).click();
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+$/);

    // Capture the source tenant ID from the URL
    const sourceUrl = page.url();
    const sourceIdMatch = sourceUrl.match(/\/admin\/tenants\/([^/]+)$/);
    if (!sourceIdMatch) throw new Error(`Could not extract tenant ID from URL: ${sourceUrl}`);
    sourceTenantId = sourceIdMatch[1];

    // Set a known primary colour on the source tenant so the clone assertion is meaningful
    const primaryInput = page.locator('#color-primary');
    await primaryInput.evaluate((el: HTMLInputElement, color: string) => {
      el.value = color;
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, PRIMARY_COLOR);
    await page.getByRole('button', { name: 'Save Theme' }).click();
    await expect(page.getByRole('status')).toContainText('Theme saved successfully');

    // Open the clone dialog
    await page.getByRole('button', { name: 'Clone' }).click();
    await expect(page.getByRole('dialog')).toBeVisible();

    // Fill in the clone details
    await page.fill('#clone-name', CLONE_NAME);
    // Assert: slug is auto-generated from the name
    await expect(page.locator('#clone-slug')).toHaveValue(CLONE_SLUG);

    // Submit the clone form
    await page.getByRole('dialog').getByRole('button', { name: 'Clone' }).click();

    // Assert: redirected to the new tenant detail page
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+$/);
    const clonedUrl = page.url();
    const clonedIdMatch = clonedUrl.match(/\/admin\/tenants\/([^/]+)$/);
    if (!clonedIdMatch) throw new Error(`Could not extract cloned tenant ID from URL: ${clonedUrl}`);
    clonedTenantId = clonedIdMatch[1];

    // Sanity: the clone must have a different ID than the source
    expect(clonedTenantId).not.toBe(sourceTenantId);

    // Assert: the cloned tenant's theme matches the source (same primary colour)
    const clonedPrimary = await page.locator('#color-primary').inputValue();
    expect(clonedPrimary.toLowerCase()).toBe(PRIMARY_COLOR.toLowerCase());
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 2 — Cloned tenant has independent pages
  // ──────────────────────────────────────────────────────────────────────────
  test('2. Cloned tenant has independent pages', async ({ page }) => {
    // Fetch the source tenant's pages via the API
    const sourceRes = await page.request.get(`/api/admin/pages?tenantId=${sourceTenantId}`);
    expect(sourceRes.ok()).toBe(true);
    const sourceData = await sourceRes.json();
    sourcePageCount = (sourceData.data as Array<unknown>).length;

    // Navigate to the cloned tenant's pages list
    await page.goto(`/admin/tenants/${clonedTenantId}/pages`);

    // Assert: the clone has the same number of pages as the source
    const pageRows = page.locator('table tbody tr');
    await expect(pageRows).toHaveCount(sourcePageCount);

    // Fetch the cloned pages to pick the first one
    const clonedRes = await page.request.get(`/api/admin/pages?tenantId=${clonedTenantId}`);
    expect(clonedRes.ok()).toBe(true);
    const clonedData = await clonedRes.json();
    const firstClonedPage = (clonedData.data as Array<{ id: string; title: string; slug: string }>)[0];
    const originalTitle = firstClonedPage.title;
    const editedTitle = `${originalTitle} — edited`;

    // Edit the first cloned page title via the API (simulates a real content edit)
    const updateRes = await page.request.put(`/api/admin/pages/${firstClonedPage.id}`, {
      data: { title: editedTitle },
    });
    expect(updateRes.ok()).toBe(true);

    // Navigate to the source tenant's pages list and verify the source is unchanged
    await page.goto(`/admin/tenants/${sourceTenantId}/pages`);

    // The source page with the original title must still appear
    await expect(page.getByRole('link', { name: originalTitle })).toBeVisible();
    // The edited title must NOT appear on the source (independence check)
    await expect(page.getByRole('link', { name: editedTitle })).not.toBeVisible();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 3 — Cloned tenant site renders correctly
  // ──────────────────────────────────────────────────────────────────────────
  test('3. Cloned tenant site renders correctly', async ({ page, context }) => {
    // Fetch the source homepage to know its expected heading text
    const sourceRes = await page.request.get(`/api/admin/pages?tenantId=${sourceTenantId}`);
    const sourceData = await sourceRes.json();
    const homepage = (sourceData.data as Array<{ slug: string; content: { props?: { text?: string } } }>).find(
      (p) => p.slug === '',
    );
    // Fall back to any heading text we can extract, or use the known seed value
    const expectedHeading = homepage?.content?.props?.text ?? 'Hello World';

    // Open the cloned tenant site in a fresh browser page
    const clonedSite = await context.newPage();
    await clonedSite.goto(`${CLONE_SITE_URL}/`);

    // Assert: the page renders the same homepage content as the source
    await expect(clonedSite.getByRole('heading', { name: expectedHeading })).toBeVisible();

    // Assert: the --color-primary CSS variable matches the colour set before cloning
    const cssPrimary = await clonedSite.evaluate(() =>
      getComputedStyle(document.documentElement).getPropertyValue('--color-primary').trim(),
    );
    const hexMatch = cssPrimary.toLowerCase() === PRIMARY_COLOR.toLowerCase();
    const rgbMatch = cssPrimary.replace(/\s/g, '') === hexToRgb(PRIMARY_COLOR).replace(/\s/g, '');
    expect(hexMatch || rgbMatch).toBe(true);

    await clonedSite.close();
  });

  // ──────────────────────────────────────────────────────────────────────────
  // Test 4 — Start from template
  // ──────────────────────────────────────────────────────────────────────────
  test('4. Start from template', async ({ page }) => {
    // Navigate to the create tenant page
    await page.goto('/admin/tenants/new');

    // Assert: the template picker shows the seeded starter templates
    await expect(page.getByRole('button', { name: /Restaurant/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Agency/ })).toBeVisible();
    await expect(page.getByRole('button', { name: /Portfolio/ })).toBeVisible();

    // Select the "Restaurant" template
    await page.getByRole('button', { name: /Restaurant/ }).click();

    // Assert: the button is now in the selected / pressed state
    await expect(
      page.getByRole('button', { name: /Restaurant/, pressed: true }),
    ).toBeVisible();

    // Assert: confirmation message is shown
    await expect(
      page.getByText('The new tenant will be cloned from this template'),
    ).toBeVisible();

    // Fill in the new tenant details
    await page.fill('#name', FROM_TEMPLATE_NAME);
    // Assert: slug auto-populates from the name
    await expect(page.locator('#slug')).toHaveValue(FROM_TEMPLATE_SLUG);

    // Submit the form
    await page.click('button[type="submit"]');

    // Assert: redirected to the new tenant detail page
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+$/);
    const url = page.url();
    const idMatch = url.match(/\/admin\/tenants\/([^/]+)$/);
    if (!idMatch) throw new Error(`Could not extract from-template tenant ID from URL: ${url}`);
    fromTemplateTenantId = idMatch[1];

    // Assert: the new tenant's pages were cloned from the restaurant template
    // (Home, Menu, Contact = at least 3 pages)
    const pagesRes = await page.request.get(`/api/admin/pages?tenantId=${fromTemplateTenantId}`);
    expect(pagesRes.ok()).toBe(true);
    const pagesData = await pagesRes.json();
    expect((pagesData.data as Array<unknown>).length).toBeGreaterThanOrEqual(3);

    // Assert: the theme carries the restaurant template's primary colour (#C0392B)
    const primaryInput = await page.locator('#color-primary').inputValue();
    expect(primaryInput.toLowerCase()).toBe(RESTAURANT_PRIMARY_COLOR.toLowerCase());
  });
});
