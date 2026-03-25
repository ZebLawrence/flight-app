import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable must be set to run content versioning E2E tests.',
  );
}

const DEMO_TENANT_SITE = 'http://demo.localhost:3000';
const VERSION_PAGE_TITLE = 'Version History Test';
const VERSION_PAGE_SLUG = 'version-history-test';

/** Distinct content for each save so versions are distinguishable. */
const v1Content = { type: 'Heading', props: { level: 1, text: 'Version One Content' } };
const v2Content = { type: 'Heading', props: { level: 1, text: 'Version Two Content' } };
const v3Content = { type: 'Heading', props: { level: 1, text: 'Version Three Content' } };

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
// established in beforeAll (shared page with pre-built version history).
test.describe.configure({ mode: 'serial' });

test.describe('Phase 2 — content versioning', () => {
  let demoTenantId: string;
  let testPageId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsAdmin(page);
    demoTenantId = await getDemoTenantId(page);

    // ── Create a dedicated test page with the initial content (v1) ──────────
    await page.goto(`/admin/tenants/${demoTenantId}/pages`);
    await page.getByRole('link', { name: 'New page' }).click();
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+\/pages\/new/);

    await page.fill('#page-title', VERSION_PAGE_TITLE);
    await page.fill('#page-slug', VERSION_PAGE_SLUG);
    await setMonacoContent(page, JSON.stringify(v1Content));

    await page.click('button[type="submit"]');
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+\/pages\/[^/]+$/);

    const match = page.url().match(/\/pages\/([^/]+)$/);
    if (!match) throw new Error(`Could not extract page ID from URL: ${page.url()}`);
    testPageId = match[1];

    // ── First edit: publish the page and update content to v2 ───────────────
    // This PUT auto-saves a snapshot of v1Content into version history.
    await page.locator('#page-published').check();
    await setMonacoContent(page, JSON.stringify(v2Content));
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toContainText('Page saved successfully');

    // ── Second edit: update content to v3 ───────────────────────────────────
    // This PUT auto-saves a snapshot of v2Content into version history.
    await setMonacoContent(page, JSON.stringify(v3Content));
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page.getByRole('status')).toContainText('Page saved successfully');

    // After beforeAll the page is in this state:
    //   current content : v3Content ("Version Three Content")
    //   version history : [v2Content snapshot (newest), v1Content snapshot]
    //   published       : true

    await page.close();
  });

  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test.afterAll(async ({ browser }) => {
    // Clean up: delete the test page so subsequent runs start with a clean slate.
    if (!demoTenantId) return;
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await page.goto(`/admin/tenants/${demoTenantId}/pages`);
    const row = page.getByRole('row', { name: new RegExp(VERSION_PAGE_TITLE) });
    // Only delete if the row still exists (it may have been removed already).
    if ((await row.count()) > 0) {
      page.once('dialog', (dialog) => dialog.accept());
      await row.getByRole('button', { name: 'Delete' }).click();
    }
    await page.close();
  });

  test('1. Version history shows previous versions', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}/pages/${testPageId}`);

    // Open the version history drawer
    await page.getByRole('button', { name: 'History' }).click();
    const versionDrawer = page.getByRole('dialog', { name: 'Version History' });
    await expect(versionDrawer).toBeVisible();

    // Assert: at least one previous version is listed
    const firstVersion = versionDrawer.locator('li').first();
    await expect(firstVersion).toBeVisible();

    // Assert: the version entry contains a timestamp (digits from toLocaleString)
    await expect(firstVersion).toContainText(/\d/);
  });

  test('2. Preview a previous version', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}/pages/${testPageId}`);

    // Open the version history drawer
    await page.getByRole('button', { name: 'History' }).click();
    const versionDrawer = page.getByRole('dialog', { name: 'Version History' });
    await expect(versionDrawer).toBeVisible();

    // Click Preview on the first (most recent) version — this is the v2Content snapshot
    await versionDrawer.locator('li').first().getByRole('button', { name: 'Preview' }).click();

    // Assert: the version preview banner is visible in the editor area
    await expect(page.getByText('Previewing historical version')).toBeVisible();

    // Assert: the Save button is disabled while a historical version is being previewed
    await expect(page.getByRole('button', { name: 'Save' })).toBeDisabled();
  });

  test('3. Restore a previous version', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}/pages/${testPageId}`);

    // Open the version history drawer
    await page.getByRole('button', { name: 'History' }).click();
    const versionDrawer = page.getByRole('dialog', { name: 'Version History' });
    await expect(versionDrawer).toBeVisible();

    // Record the current number of versions so we can confirm a new one is added
    const versionItems = versionDrawer.locator('li');
    const versionCountBefore = await versionItems.count();

    // Click Restore on the first (most recent) version — restores v2Content
    await versionItems.first().getByRole('button', { name: 'Restore' }).click();

    // Assert: confirmation dialog appears
    const confirmDialog = page.getByRole('dialog', { name: 'Confirm restore' });
    await expect(confirmDialog).toBeVisible();

    // Confirm the restore action
    await confirmDialog.getByRole('button', { name: 'Restore' }).click();

    // Assert: success message confirms the restore completed
    await expect(page.getByRole('status')).toContainText('Version restored successfully');

    // Assert: the editor exits preview mode — Save button is enabled again
    await expect(page.getByRole('button', { name: 'Save' })).toBeEnabled();

    // Assert: a new version entry is created (the pre-restore state is captured)
    // Re-open the drawer to see the updated version list
    await page.getByRole('button', { name: 'History' }).click();
    await expect(versionDrawer).toBeVisible();
    await expect(versionItems).toHaveCount(versionCountBefore + 1);

    // Close the version history drawer before navigating
    await page.getByRole('button', { name: 'Close version history' }).click();

    // Assert: the live tenant site now shows the restored content (v2Content heading)
    const context = page.context();
    const tenantPage = await context.newPage();
    await tenantPage.goto(`${DEMO_TENANT_SITE}/${VERSION_PAGE_SLUG}`);
    await expect(
      tenantPage.getByRole('heading', { name: v2Content.props.text }),
    ).toBeVisible();
    await tenantPage.close();
  });
});
