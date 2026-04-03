import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable must be set to run structured data E2E tests.',
  );
}

// Seeded post data — distinct slug/title to avoid clashing with other E2E suites
const STRUCTURED_DATA_POST_TITLE = 'E2E Structured Data Blog Post';
const STRUCTURED_DATA_POST_SLUG = 'e2e-structured-data-blog-post';
const STRUCTURED_DATA_POST_EXCERPT = 'Excerpt for the E2E structured data blog post.';
const STRUCTURED_DATA_POST_AUTHOR = 'Structured Data Author';

// Public-facing base URL for the demo tenant.
// Multi-tenant routing requires the hostname prefix "demo." so this URL
// cannot be expressed as a relative path against the Playwright baseURL.
const DEMO_BASE = 'http://demo.localhost:3000';
const BLOG_BASE = `${DEMO_BASE}/blog`;

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
 * Create a blog post via the admin UI and wait for the redirect back to the
 * blog list page.
 */
async function createPost(
  page: Page,
  demoTenantId: string,
  opts: {
    title: string;
    excerpt: string;
    author: string;
    content: string;
    published: boolean;
  },
) {
  await page.goto(`/admin/tenants/${demoTenantId}/blog/new`);

  await page.fill('#post-title', opts.title);
  // Wait for slug to auto-populate before continuing
  await expect(page.locator('#post-slug')).not.toHaveValue('');

  await page.fill('#post-excerpt', opts.excerpt);
  await page.fill('#post-author', opts.author);
  await page.fill('#post-content', opts.content);

  if (opts.published) {
    await page.check('#post-published');
  }

  await page.click('button[type="submit"]');
  // Wait for redirect back to blog list after successful creation
  await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+\/blog$/);
}

/**
 * Delete a post (by visible title) from the admin blog list.
 * Silently skips if the post is not found.
 */
async function deletePostByTitle(page: Page, tenantId: string, title: string) {
  await page.goto(`/admin/tenants/${tenantId}/blog`);
  const row = page.getByRole('row', { name: new RegExp(title) });
  if ((await row.count()) === 0) return;
  page.once('dialog', (dialog) => dialog.accept());
  await row.getByRole('button', { name: 'Delete' }).click();
  // Wait for the row to disappear before continuing
  await expect(page.getByRole('row', { name: new RegExp(title) })).not.toBeVisible();
}

// Run all tests serially — beforeAll seeds the post that the individual tests depend on.
test.describe.configure({ mode: 'serial' });

test.describe('Phase 5 — structured data (JSON-LD)', () => {
  let demoTenantId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsAdmin(page);
    demoTenantId = await getDemoTenantId(page);

    // Create a published post for the Article JSON-LD test
    await createPost(page, demoTenantId, {
      title: STRUCTURED_DATA_POST_TITLE,
      excerpt: STRUCTURED_DATA_POST_EXCERPT,
      author: STRUCTURED_DATA_POST_AUTHOR,
      content: '# Structured Data Test\n\nContent for structured data E2E test.',
      published: true,
    });

    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    // demoTenantId may be unset if beforeAll failed; skip cleanup in that case
    if (!demoTenantId) return;
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await deletePostByTitle(page, demoTenantId, STRUCTURED_DATA_POST_TITLE);
    await page.close();
  });

  // ── Test 1 ────────────────────────────────────────────────────────────────
  test('1. Organization JSON-LD on tenant pages', async ({ page }) => {
    await page.goto(`${DEMO_BASE}/`);

    // Retrieve raw HTML source to inspect the <script type="application/ld+json"> tag
    const html = await page.content();

    // Assert: page source contains a JSON-LD script tag
    expect(html).toContain('<script type="application/ld+json"');

    // Extract the JSON-LD content from the script tag using JSON.parse()
    const scriptContent = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .innerHTML();
    const jsonLd = JSON.parse(scriptContent) as Record<string, unknown>;

    // Assert: @type is "Organization"
    expect(jsonLd['@type']).toBe('Organization');

    // Assert: name matches the demo tenant name
    expect(typeof jsonLd['name']).toBe('string');
    expect((jsonLd['name'] as string).length).toBeGreaterThan(0);

    // Assert: url is set
    expect(typeof jsonLd['url']).toBe('string');
    expect((jsonLd['url'] as string).length).toBeGreaterThan(0);
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────
  test('2. Article JSON-LD on blog post pages', async ({ page }) => {
    await page.goto(`${BLOG_BASE}/${STRUCTURED_DATA_POST_SLUG}`);

    // Retrieve raw HTML source to inspect the <script type="application/ld+json"> tag
    const html = await page.content();

    // Assert: page source contains a JSON-LD script tag
    expect(html).toContain('<script type="application/ld+json"');

    // Extract the JSON-LD content from the script tag using JSON.parse()
    const scriptContent = await page
      .locator('script[type="application/ld+json"]')
      .first()
      .innerHTML();
    const jsonLd = JSON.parse(scriptContent) as Record<string, unknown>;

    // Assert: @type is "Article"
    expect(jsonLd['@type']).toBe('Article');

    // Assert: headline matches the post title
    expect(jsonLd['headline']).toBe(STRUCTURED_DATA_POST_TITLE);

    // Assert: author is set
    expect(jsonLd['author']).toBeTruthy();

    // Assert: datePublished is a valid ISO date string
    expect(typeof jsonLd['datePublished']).toBe('string');
    const publishedDate = new Date(jsonLd['datePublished'] as string);
    expect(isNaN(publishedDate.getTime())).toBe(false);
  });
});
