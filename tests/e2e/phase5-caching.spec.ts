import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable must be set to run caching E2E tests.',
  );
}

// Public-facing base URL for the demo tenant.
// Multi-tenant routing requires the hostname prefix "demo." so this URL
// cannot be expressed as a relative path against the Playwright baseURL.
const DEMO_BASE = 'http://demo.localhost:3000';

// Unique slugs/titles to avoid clashing with other E2E suites
const CACHE_BLOG_SLUG = 'e2e-caching-blog-post';
const CACHE_BLOG_TITLE = 'E2E Caching Blog Post';
const CACHE_PAGE_SLUG = 'e2e-caching-revalidation-page';
const CACHE_PAGE_TITLE = 'E2E Caching Page Original';
const CACHE_PAGE_TITLE_UPDATED = 'E2E Caching Page Updated';

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
 * Create a blog post via the admin API and return its ID.
 */
async function createBlogPost(page: Page, tenantId: string): Promise<string> {
  const response = await page.request.post('/api/admin/blog', {
    data: {
      tenantId,
      slug: CACHE_BLOG_SLUG,
      title: CACHE_BLOG_TITLE,
      content: `# ${CACHE_BLOG_TITLE}\n\nContent for caching E2E tests.`,
      author: 'E2E Test Author',
      published: true,
    },
  });
  expect(response.status()).toBe(201);
  const body = await response.json() as { id: string };
  return body.id;
}

/**
 * Delete a blog post via the admin API.
 * Accepts 200/204/404 to be resilient to partial failures.
 */
async function deleteBlogPost(page: Page, postId: string): Promise<void> {
  const response = await page.request.delete(`/api/admin/blog/${postId}`);
  expect([200, 204, 404]).toContain(response.status());
}

/**
 * Create a page via the admin API and return its ID.
 */
async function createPage(page: Page, tenantId: string, title: string): Promise<string> {
  const response = await page.request.post('/api/admin/pages', {
    data: {
      tenantId,
      slug: CACHE_PAGE_SLUG,
      title,
      published: true,
      sortOrder: 99,
      content: { type: 'Heading', props: { level: 1, text: title } },
    },
  });
  expect(response.status()).toBe(201);
  const body = await response.json() as { id: string };
  return body.id;
}

/**
 * Delete a page via the admin API.
 * Accepts 200/204/404 to be resilient to partial failures.
 */
async function deletePage(page: Page, pageId: string): Promise<void> {
  const response = await page.request.delete(`/api/admin/pages/${pageId}`);
  expect([200, 204, 404]).toContain(response.status());
}

// Run all tests serially — beforeAll seeds the content that individual tests depend on.
test.describe.configure({ mode: 'serial' });

test.describe('Phase 5 — caching behavior', () => {
  let demoTenantId: string;
  let blogPostId: string;
  let cachePageId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsAdmin(page);
    demoTenantId = await getDemoTenantId(page);
    [blogPostId, cachePageId] = await Promise.all([
      createBlogPost(page, demoTenantId),
      createPage(page, demoTenantId, CACHE_PAGE_TITLE),
    ]);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!demoTenantId) return;
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await Promise.all([
      blogPostId ? deleteBlogPost(page, blogPostId) : Promise.resolve(),
      cachePageId ? deletePage(page, cachePageId) : Promise.resolve(),
    ]);
    await page.close();
  });

  // ── Test 1 ────────────────────────────────────────────────────────────────
  test('1. Tenant pages return caching headers', async ({ page }) => {
    const response = await page.request.get(`${DEMO_BASE}/`);

    // Assert: status 200
    expect(response.status()).toBe(200);

    // Assert: Cache-Control header is present
    const cacheControl = response.headers()['cache-control'] ?? '';
    expect(cacheControl).toBeTruthy();

    // Assert: contains s-maxage directive (CDN / shared-cache TTL set by ISR)
    expect(cacheControl).toContain('s-maxage');

    // Assert: contains stale-while-revalidate directive (ISR background refresh)
    expect(cacheControl).toContain('stale-while-revalidate');
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────
  test('2. Blog post pages return caching headers', async ({ page }) => {
    const response = await page.request.get(`${DEMO_BASE}/blog/${CACHE_BLOG_SLUG}`);

    // Assert: status 200
    expect(response.status()).toBe(200);

    // Assert: Cache-Control header is present with caching directives
    const cacheControl = response.headers()['cache-control'] ?? '';
    expect(cacheControl).toBeTruthy();
    expect(cacheControl).toMatch(/s-maxage=|max-age=/);
  });

  // ── Test 3 ────────────────────────────────────────────────────────────────
  test('3. Admin revalidation clears cache', async ({ page }) => {
    const pageUrl = `${DEMO_BASE}/${CACHE_PAGE_SLUG}`;

    // Step 1: Fetch tenant page to populate cache and verify initial content
    const initialResponse = await page.request.get(pageUrl);
    expect(initialResponse.status()).toBe(200);
    const initialText = await initialResponse.text();
    expect(initialText).toContain(CACHE_PAGE_TITLE);

    // Step 2: Update page content via admin API (requires authentication)
    await loginAsAdmin(page);
    const updateResponse = await page.request.put(`/api/admin/pages/${cachePageId}`, {
      data: {
        title: CACHE_PAGE_TITLE_UPDATED,
        content: { type: 'Heading', props: { level: 1, text: CACHE_PAGE_TITLE_UPDATED } },
      },
    });
    expect(updateResponse.status()).toBe(200);

    // Step 3: Call POST /api/admin/revalidate with tenant ID to clear cache
    const revalidateResponse = await page.request.post('/api/admin/revalidate', {
      data: { tenantId: demoTenantId },
    });
    expect(revalidateResponse.status()).toBe(200);
    const revalidateBody = await revalidateResponse.json() as { revalidated: boolean; tenantId: string };
    expect(revalidateBody.revalidated).toBe(true);
    expect(revalidateBody.tenantId).toBe(demoTenantId);

    // Step 4: Fetch tenant page again and assert updated content is present (not stale)
    const updatedResponse = await page.request.get(pageUrl);
    expect(updatedResponse.status()).toBe(200);
    const updatedText = await updatedResponse.text();
    expect(updatedText).toContain(CACHE_PAGE_TITLE_UPDATED);
  });
});
