import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable must be set to run blog SEO E2E tests.',
  );
}

// Markdown content for the seeded post
const MARKDOWN_CONTENT =
  '# SEO Test Post\n\nThis is **bold text** and a [link](https://example.com).\n\n- Item 1\n- Item 2';

// Seeded post data — distinct slugs/titles to avoid clashing with other E2E suites
const SEO_POST_TITLE = 'E2E SEO Blog Post';
const SEO_POST_SLUG = 'e2e-seo-blog-post';
const SEO_POST_EXCERPT = 'Excerpt for the E2E SEO blog post.';
const SEO_POST_AUTHOR = 'SEO Author';
const SEO_POST_FEATURED_IMAGE = 'https://placehold.co/800x400';

// Public-facing blog base URL for the demo tenant.
// Multi-tenant routing requires the hostname prefix "demo." so this URL
// cannot be expressed as a relative path against the Playwright baseURL.
const BLOG_BASE = 'http://demo.localhost:3000/blog';

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
    featuredImage?: string;
    published: boolean;
  },
) {
  await page.goto(`/admin/tenants/${demoTenantId}/blog/new`);

  await page.fill('#post-title', opts.title);
  // Wait for slug to auto-populate before continuing
  await expect(page.locator('#post-slug')).not.toHaveValue('');

  await page.fill('#post-excerpt', opts.excerpt);
  await page.fill('#post-author', opts.author);
  if (opts.featuredImage) {
    await page.fill('#post-featured-image', opts.featuredImage);
  }
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

test.describe('Phase 3 — blog SEO metadata', () => {
  let demoTenantId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsAdmin(page);
    demoTenantId = await getDemoTenantId(page);

    // Create a published post with excerpt and featured image for SEO assertions
    await createPost(page, demoTenantId, {
      title: SEO_POST_TITLE,
      excerpt: SEO_POST_EXCERPT,
      author: SEO_POST_AUTHOR,
      content: MARKDOWN_CONTENT,
      featuredImage: SEO_POST_FEATURED_IMAGE,
      published: true,
    });

    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    // demoTenantId may be unset if beforeAll failed; skip cleanup in that case
    if (!demoTenantId) return;
    const page = await browser.newPage();
    await loginAsAdmin(page);
    await deletePostByTitle(page, demoTenantId, SEO_POST_TITLE);
    await page.close();
  });

  // ── Test 1 ────────────────────────────────────────────────────────────────
  test('1. Blog post page has correct meta tags', async ({ page }) => {
    await page.goto(`${BLOG_BASE}/${SEO_POST_SLUG}`);

    // Assert: <title> contains post title
    await expect(page).toHaveTitle(new RegExp(SEO_POST_TITLE));

    // Assert: <meta name="description"> contains post excerpt
    const description = page.locator('meta[name="description"]');
    await expect(description).toHaveAttribute('content', SEO_POST_EXCERPT);

    // Assert: <meta property="og:title"> contains post title
    const ogTitle = page.locator('meta[property="og:title"]');
    await expect(ogTitle).toHaveAttribute('content', SEO_POST_TITLE);

    // Assert: <meta property="og:description"> contains excerpt
    const ogDescription = page.locator('meta[property="og:description"]');
    await expect(ogDescription).toHaveAttribute('content', SEO_POST_EXCERPT);

    // Assert: <meta property="og:type"> is "article"
    const ogType = page.locator('meta[property="og:type"]');
    await expect(ogType).toHaveAttribute('content', 'article');

    // Assert: <meta property="og:image"> is set (post has a featured image)
    const ogImage = page.locator('meta[property="og:image"]');
    const ogImageContent = await ogImage.getAttribute('content');
    expect(ogImageContent).toBeTruthy();
    expect(ogImageContent).toContain(SEO_POST_FEATURED_IMAGE);
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────
  test('2. RSS feed is valid and accessible', async ({ page }) => {
    const rssUrl = `${BLOG_BASE}/rss.xml`;

    // Use page.request.get() to check the Content-Type header
    const response = await page.request.get(rssUrl);

    // Assert: 200 response
    expect(response.status()).toBe(200);

    // Assert: Content-Type is application/xml or application/rss+xml
    const contentType = response.headers()['content-type'] ?? '';
    expect(contentType).toMatch(/application\/(rss\+xml|xml)/);

    // Assert: response body is valid RSS XML
    const body = await response.text();

    // Assert: response body contains <rss root element
    expect(body).toContain('<rss');

    // Assert: response body contains <channel> with <title>
    expect(body).toContain('<channel>');
    expect(body).toContain('<title>');

    // Assert: response body contains at least one <item> (the seeded published post)
    expect(body).toContain('<item>');

    // Assert: each <item> has <title>, <link>, <description>
    // Extract all <item>…</item> blocks and verify each one contains the required child elements.
    const itemMatches = [...body.matchAll(/<item>([\s\S]*?)<\/item>/g)];
    expect(itemMatches.length).toBeGreaterThan(0);
    for (const match of itemMatches) {
      const itemBody = match[1];
      expect(itemBody).toContain('<title>');
      expect(itemBody).toContain('<link>');
      expect(itemBody).toContain('<description>');
    }
  });
});
