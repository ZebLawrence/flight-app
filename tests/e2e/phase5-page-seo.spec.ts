import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable must be set to run page SEO E2E tests.',
  );
}

// Seeded page data — distinct slug/title to avoid clashing with other E2E suites
const SEO_PAGE_TITLE = 'E2E SEO Page Test';
const SEO_PAGE_SLUG = 'e2e-seo-page-test';
const SEO_PAGE_META_TITLE = 'E2E SEO Meta Title';
const SEO_PAGE_META_DESCRIPTION = 'E2E SEO page meta description for testing.';
const SEO_PAGE_OG_TITLE = 'E2E SEO OG Title';
const SEO_PAGE_OG_DESCRIPTION = 'E2E SEO OG description for testing.';

// Public-facing base URL for the demo tenant.
// Multi-tenant routing requires the hostname prefix "demo." so this URL
// cannot be expressed as a relative path against the Playwright baseURL.
const DEMO_BASE = 'http://demo.localhost:3000';
const SEO_PAGE_OG_IMAGE = `${DEMO_BASE}/api/og?title=E2E+SEO+Page`;
const SEO_PAGE_URL = `${DEMO_BASE}/${SEO_PAGE_SLUG}`;

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
 * Create a page with full SEO meta via the admin API and return the page ID.
 * The page request context inherits the admin session cookie from the browser.
 */
async function createSeoPage(page: Page, demoTenantId: string): Promise<string> {
  const response = await page.request.post('/api/admin/pages', {
    data: {
      tenantId: demoTenantId,
      slug: SEO_PAGE_SLUG,
      title: SEO_PAGE_TITLE,
      published: true,
      sortOrder: 99,
      content: {
        type: 'Heading',
        props: { level: 1, text: SEO_PAGE_TITLE },
      },
      meta: {
        title: SEO_PAGE_META_TITLE,
        description: SEO_PAGE_META_DESCRIPTION,
        ogTitle: SEO_PAGE_OG_TITLE,
        ogDescription: SEO_PAGE_OG_DESCRIPTION,
        ogImage: SEO_PAGE_OG_IMAGE,
        ogType: 'website',
      },
    },
  });
  expect(response.status()).toBe(201);
  let body: { id: string };
  try {
    body = await response.json() as { id: string };
  } catch {
    throw new Error(`POST /api/admin/pages returned non-JSON response (status ${response.status()})`);
  }
  if (typeof body.id !== 'string' || !body.id) {
    throw new Error(`POST /api/admin/pages returned unexpected body: ${JSON.stringify(body)}`);
  }
  return body.id;
}

/**
 * Delete the SEO test page via the admin API.
 * Accepts 200/204 (success) or 404 (already deleted) to be resilient to
 * partial failures where the page may not have been created.
 */
async function deleteSeoPage(page: Page, pageId: string): Promise<void> {
  const response = await page.request.delete(`/api/admin/pages/${pageId}`);
  expect([200, 204, 404]).toContain(response.status());
}

/**
 * Assert that the current page's og:image meta tag contains the OG image route.
 * The page must already be loaded before calling this helper.
 */
async function assertOgImagePointsToOgRoute(page: Page): Promise<void> {
  const ogImage = page.locator('meta[property="og:image"]');
  const ogImageContent = await ogImage.getAttribute('content');
  expect(ogImageContent).toBeTruthy();
  expect(ogImageContent).toContain('/api/og');
}

// Run all tests serially — beforeAll seeds the page that the individual tests depend on.
test.describe.configure({ mode: 'serial' });

test.describe('Phase 5 — page-level SEO', () => {
  let demoTenantId: string;
  let seoPageId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsAdmin(page);
    demoTenantId = await getDemoTenantId(page);
    seoPageId = await createSeoPage(page, demoTenantId);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!seoPageId) return;
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await deleteSeoPage(page, seoPageId);
    await page.close();
  });

  // ── Test 1 ────────────────────────────────────────────────────────────────
  test('1. Page has correct title tag', async ({ page }) => {
    await page.goto(SEO_PAGE_URL);

    // Assert: <title> contains the meta title (not the page title)
    await expect(page).toHaveTitle(new RegExp(SEO_PAGE_META_TITLE));
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────
  test('2. Page has meta description', async ({ page }) => {
    await page.goto(SEO_PAGE_URL);

    // Assert: <meta name="description"> is present with the correct content
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', SEO_PAGE_META_DESCRIPTION);
  });

  // ── Test 3 ────────────────────────────────────────────────────────────────
  test('3. Page has Open Graph tags', async ({ page }) => {
    await page.goto(SEO_PAGE_URL);

    // Assert: <meta property="og:title"> contains the OG title
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', SEO_PAGE_OG_TITLE);

    // Assert: <meta property="og:description"> contains the OG description
    const ogDescription = page.locator('meta[property="og:description"]');
    await expect(ogDescription).toHaveAttribute('content', SEO_PAGE_OG_DESCRIPTION);

    // Assert: <meta property="og:image"> is set (page has an OG image configured)
    await assertOgImagePointsToOgRoute(page);

    // Assert: <meta property="og:type"> is "website"
    const ogType = page.locator('meta[property="og:type"]');
    await expect(ogType).toHaveAttribute('content', 'website');
  });

  // ── Test 4 ────────────────────────────────────────────────────────────────
  test('4. Page has canonical URL', async ({ page }) => {
    await page.goto(SEO_PAGE_URL);

    // Assert: <link rel="canonical"> is present
    const canonical = page.locator('link[rel="canonical"]');

    // Assert: href contains the tenant domain and page slug
    const canonicalHref = await canonical.getAttribute('href');
    expect(canonicalHref).toBeTruthy();
    expect(canonicalHref).toContain('demo.localhost');
    expect(canonicalHref).toContain(SEO_PAGE_SLUG);
  });

  // ── Test 5 ────────────────────────────────────────────────────────────────
  test('5. Favicon is served per tenant', async ({ page }) => {
    const response = await page.request.get(`${DEMO_BASE}/favicon.ico`);

    // Assert: status 200 (or 302 redirect followed to a 200)
    expect(response.status()).toBe(200);

    // Assert: Content-Type is an image type
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toMatch(/^image\//);

    // Assert: response body is non-empty
    const body = await response.body();
    expect(body.byteLength).toBeGreaterThan(0);
  });

  // ── Test 6 ────────────────────────────────────────────────────────────────
  test('6. OG image is generated per page', async ({ page }) => {
    // Fetch the OG image endpoint directly
    const response = await page.request.get(`${DEMO_BASE}/api/og?title=Hello+World`);

    // Assert: status 200
    expect(response.status()).toBe(200);

    // Assert: Content-Type is image/png
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toContain('image/png');

    // Assert: response body is non-empty
    const body = await response.body();
    expect(body.byteLength).toBeGreaterThan(0);

    // Assert: the page's og:image meta tag points to the OG image route
    await page.goto(SEO_PAGE_URL);
    await assertOgImagePointsToOgRoute(page);
  });
});
