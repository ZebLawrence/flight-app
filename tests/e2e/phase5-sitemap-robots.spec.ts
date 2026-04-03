import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable must be set to run sitemap/robots E2E tests.',
  );
}

// Unique slugs to avoid clashing with other E2E suites
const PUB_PAGE_SLUG = 'e2e-sitemap-published-page';
const PUB_PAGE_TITLE = 'E2E Sitemap Published Page';
const DRAFT_PAGE_SLUG = 'e2e-sitemap-draft-page';
const DRAFT_PAGE_TITLE = 'E2E Sitemap Draft Page';
const PUB_POST_SLUG = 'e2e-sitemap-published-post';
const PUB_POST_TITLE = 'E2E Sitemap Published Post';
const DRAFT_POST_SLUG = 'e2e-sitemap-draft-post';
const DRAFT_POST_TITLE = 'E2E Sitemap Draft Post';

// Public-facing base URL for the demo tenant.
// Multi-tenant routing requires the hostname prefix "demo." so this URL
// cannot be expressed as a relative path against the Playwright baseURL.
const DEMO_BASE = 'http://demo.localhost:3000';
const SITEMAP_URL = `${DEMO_BASE}/sitemap.xml`;
const ROBOTS_URL = `${DEMO_BASE}/robots.txt`;

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
 * Create a page via the admin API and return its ID.
 */
async function createPage(
  page: Page,
  tenantId: string,
  slug: string,
  title: string,
  published: boolean,
): Promise<string> {
  const response = await page.request.post('/api/admin/pages', {
    data: {
      tenantId,
      slug,
      title,
      published,
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

/**
 * Create a blog post via the admin API and return its ID.
 */
async function createPost(
  page: Page,
  tenantId: string,
  slug: string,
  title: string,
  published: boolean,
): Promise<string> {
  const response = await page.request.post('/api/admin/blog', {
    data: {
      tenantId,
      slug,
      title,
      content: `# ${title}\n\nTest content for sitemap E2E tests.`,
      author: 'E2E Test Author',
      published,
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
async function deletePost(page: Page, postId: string): Promise<void> {
  const response = await page.request.delete(`/api/admin/blog/${postId}`);
  expect([200, 204, 404]).toContain(response.status());
}

// Run all tests serially — beforeAll seeds the content that individual tests depend on.
test.describe.configure({ mode: 'serial' });

test.describe('Phase 5.5.3 — sitemap and robots.txt', () => {
  let demoTenantId: string;
  let pubPageId: string;
  let draftPageId: string;
  let pubPostId: string;
  let draftPostId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsAdmin(page);
    demoTenantId = await getDemoTenantId(page);

    // Create a published page, a draft page, a published post, and a draft post
    [pubPageId, draftPageId, pubPostId, draftPostId] = await Promise.all([
      createPage(page, demoTenantId, PUB_PAGE_SLUG, PUB_PAGE_TITLE, true),
      createPage(page, demoTenantId, DRAFT_PAGE_SLUG, DRAFT_PAGE_TITLE, false),
      createPost(page, demoTenantId, PUB_POST_SLUG, PUB_POST_TITLE, true),
      createPost(page, demoTenantId, DRAFT_POST_SLUG, DRAFT_POST_TITLE, false),
    ]);
    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    if (!demoTenantId) return;
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await Promise.all([
      pubPageId ? deletePage(page, pubPageId) : Promise.resolve(),
      draftPageId ? deletePage(page, draftPageId) : Promise.resolve(),
      pubPostId ? deletePost(page, pubPostId) : Promise.resolve(),
      draftPostId ? deletePost(page, draftPostId) : Promise.resolve(),
    ]);
    await page.close();
  });

  // ── Test 1 ────────────────────────────────────────────────────────────────
  test('1. Sitemap.xml is valid and complete', async ({ page }) => {
    const response = await page.request.get(SITEMAP_URL);

    // Assert: status 200
    expect(response.status()).toBe(200);

    // Assert: Content-Type includes xml
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toContain('xml');

    const body = await response.text();

    // Assert: body contains <urlset (root element of a valid sitemap)
    expect(body).toContain('<urlset');

    // Assert: at least one <url> entry exists (seeded published page + created post)
    const urlMatches = [...body.matchAll(/<url>([\s\S]*?)<\/url>/g)];
    expect(urlMatches.length).toBeGreaterThan(0);

    // Assert: the published page and blog post are present in the sitemap
    expect(body).toContain(`${DEMO_BASE}/${PUB_PAGE_SLUG}`);
    expect(body).toContain(`${DEMO_BASE}/blog/${PUB_POST_SLUG}`);

    // Assert: each <url> has <loc> with full URL and <lastmod> with a valid date
    for (const match of urlMatches) {
      const urlBlock = match[1];

      // <loc> must be present and contain the full tenant base URL
      expect(urlBlock).toContain('<loc>');
      expect(urlBlock).toContain(DEMO_BASE);

      // <lastmod> must be present and parseable as a valid date
      const lastmodMatch = urlBlock.match(/<lastmod>([^<]+)<\/lastmod>/);
      expect(lastmodMatch).not.toBeNull();
      const lastmod = lastmodMatch![1];
      expect(new Date(lastmod).toString()).not.toBe('Invalid Date');
    }
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────
  test('2. Unpublished content is excluded from sitemap', async ({ page }) => {
    const response = await page.request.get(SITEMAP_URL);
    const body = await response.text();

    // Assert: no <url> entry contains the draft page slug
    expect(body).not.toContain(DRAFT_PAGE_SLUG);

    // Assert: no <url> entry contains the draft blog post slug
    expect(body).not.toContain(DRAFT_POST_SLUG);
  });

  // ── Test 3 ────────────────────────────────────────────────────────────────
  test('3. Robots.txt is valid', async ({ page }) => {
    const response = await page.request.get(ROBOTS_URL);

    // Assert: status 200
    expect(response.status()).toBe(200);

    // Assert: Content-Type includes text/plain
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toContain('text/plain');

    const body = await response.text();

    // Assert: contains User-agent: * directive
    expect(body).toContain('User-agent: *');

    // Assert: contains Sitemap: directive pointing to the tenant's sitemap.xml
    expect(body).toContain('Sitemap:');
    expect(body).toContain(`${DEMO_BASE}/sitemap.xml`);

    // Assert: contains Disallow: /admin
    expect(body).toContain('Disallow: /admin');
  });
});
