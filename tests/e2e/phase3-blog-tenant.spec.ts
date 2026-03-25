import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable must be set to run blog tenant E2E tests.',
  );
}

// Markdown content with elements required by acceptance criteria:
// <h1> from "# …", <strong> from "**…**", <a> from "[…](…)", <ul>/<li> from "- …"
const MARKDOWN_CONTENT =
  '# Hello World\n\nThis is **bold text** and a [link](https://example.com).\n\n- Item 1\n- Item 2';

// Known titles and slugs for seeded posts
const POST1_TITLE = 'E2E Tenant Blog First Post';
const POST1_SLUG = 'e2e-tenant-blog-first-post';
const POST1_EXCERPT = 'Excerpt for the first E2E tenant blog post.';
const POST1_AUTHOR = 'E2E Author';
const POST1_TAGS = 'e2e, testing';
// A valid placeholder image URL for the featured image test
const POST1_FEATURED_IMAGE = 'https://placehold.co/800x400';

const POST2_TITLE = 'E2E Tenant Blog Second Post';
const POST2_SLUG = 'e2e-tenant-blog-second-post';
const POST2_EXCERPT = 'Excerpt for the second E2E tenant blog post.';

const DRAFT_TITLE = 'E2E Tenant Blog Draft Post';

// Public-facing blog base URL for the demo tenant.
// Multi-tenant routing requires the hostname prefix "demo." so this URL
// cannot be expressed as a relative path against the Playwright baseURL.
// The same pattern is used in phase0-tenant-rendering.spec.ts.
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
    tags?: string;
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
  if (opts.tags) {
    await page.fill('#post-tags', opts.tags);
  }
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

// Run all tests serially — beforeAll seeds posts that the individual tests depend on.
test.describe.configure({ mode: 'serial' });

test.describe('Phase 3 — tenant-facing blog pages', () => {
  let demoTenantId: string;

  test.beforeAll(async ({ browser }) => {
    const page = await browser.newPage();
    await loginAsAdmin(page);
    demoTenantId = await getDemoTenantId(page);

    // Create the first published post (created earlier → older publishedAt)
    await createPost(page, demoTenantId, {
      title: POST1_TITLE,
      excerpt: POST1_EXCERPT,
      author: POST1_AUTHOR,
      content: MARKDOWN_CONTENT,
      tags: POST1_TAGS,
      featuredImage: POST1_FEATURED_IMAGE,
      published: true,
    });

    // Create the second published post (created later → newer publishedAt)
    await createPost(page, demoTenantId, {
      title: POST2_TITLE,
      excerpt: POST2_EXCERPT,
      author: POST1_AUTHOR,
      content: MARKDOWN_CONTENT,
      published: true,
    });

    // Create a draft post — must NOT appear on the public listing
    await createPost(page, demoTenantId, {
      title: DRAFT_TITLE,
      excerpt: 'This draft should not be visible to tenants.',
      author: POST1_AUTHOR,
      content: 'Draft content — not published.',
      published: false,
    });

    await page.close();
  });

  test.afterAll(async ({ browser }) => {
    // demoTenantId may be unset if beforeAll failed; skip cleanup in that case
    if (!demoTenantId) return;
    const page = await browser.newPage();
    await loginAsAdmin(page);

    for (const title of [POST1_TITLE, POST2_TITLE, DRAFT_TITLE]) {
      await deletePostByTitle(page, demoTenantId, title);
    }

    await page.close();
  });

  // ── Test 1 ────────────────────────────────────────────────────────────────
  test('1. Blog listing page renders published posts', async ({ page }) => {
    const response = await page.goto(BLOG_BASE);

    // Assert: 200 response
    expect(response?.status()).toBe(200);

    // Assert: published post titles are visible
    await expect(page.getByRole('heading', { name: POST1_TITLE })).toBeVisible();
    await expect(page.getByRole('heading', { name: POST2_TITLE })).toBeVisible();

    // Assert: excerpts are visible
    await expect(page.getByText(POST1_EXCERPT)).toBeVisible();
    await expect(page.getByText(POST2_EXCERPT)).toBeVisible();

    // Assert: at least one date (<time> element) is visible
    await expect(page.locator('time').first()).toBeVisible();

    // Assert: draft post NOT visible
    await expect(page.getByRole('heading', { name: DRAFT_TITLE })).not.toBeVisible();

    // Assert: posts ordered newest first — Second Post (created later) precedes First Post.
    // The blog listing page renders each post title as an <h2> (see
    // src/app/(tenant)/blog/page.tsx).  We collect all <h2> text contents and
    // compare the indices of the two seeded posts.
    const headings = page.locator('h2');
    const headingTexts = await headings.allTextContents();
    const firstIdx = headingTexts.findIndex((t) => t.includes(POST1_TITLE));
    const secondIdx = headingTexts.findIndex((t) => t.includes(POST2_TITLE));
    expect(secondIdx).toBeGreaterThanOrEqual(0);
    expect(firstIdx).toBeGreaterThanOrEqual(0);
    expect(secondIdx).toBeLessThan(firstIdx);

    // Assert: each published post has a link to its detail page
    await expect(page.getByRole('link', { name: new RegExp(POST1_TITLE) })).toBeVisible();
    await expect(page.getByRole('link', { name: new RegExp(POST2_TITLE) })).toBeVisible();
  });

  // ── Test 2 ────────────────────────────────────────────────────────────────
  test('2. Blog listing links navigate to detail pages', async ({ page }) => {
    await page.goto(BLOG_BASE);

    // Click the link for the second (newest) post
    await page.getByRole('link', { name: new RegExp(POST2_TITLE) }).click();

    // Assert: URL matches /blog/{slug}
    await expect(page).toHaveURL(new RegExp(`/blog/${POST2_SLUG}`));

    // Assert: detail page content is visible
    await expect(page.getByRole('heading', { name: POST2_TITLE, level: 1 })).toBeVisible();
  });

  // ── Test 3 ────────────────────────────────────────────────────────────────
  test('3. Blog post detail page renders Markdown correctly', async ({ page }) => {
    await page.goto(`${BLOG_BASE}/${POST1_SLUG}`);

    // Assert: post title visible as the page heading
    await expect(page.getByRole('heading', { name: POST1_TITLE, level: 1 })).toBeVisible();

    // Assert: author name visible
    await expect(page.getByText(POST1_AUTHOR)).toBeVisible();

    // Assert: published date visible
    await expect(page.locator('time')).toBeVisible();

    // Assert: tags visible
    await expect(page.getByText('e2e')).toBeVisible();
    await expect(page.getByText('testing')).toBeVisible();

    // Assert: Markdown rendered as HTML — check actual DOM elements inside .prose
    const prose = page.locator('.prose');
    await expect(prose.locator('h1')).toContainText('Hello World');
    await expect(prose.locator('strong')).toBeVisible();
    await expect(prose.locator('a')).toBeVisible();
    await expect(prose.locator('ul')).toBeVisible();
    await expect(prose.locator('li').first()).toBeVisible();

    // Assert: featured image renders (POST1 has a featured image URL set)
    await expect(page.locator('img[alt]').first()).toBeVisible();
  });

  // ── Test 4 ────────────────────────────────────────────────────────────────
  test('4. Blog post detail page is SSR', async ({ page }) => {
    await page.goto(`${BLOG_BASE}/${POST1_SLUG}`);

    // Retrieve raw HTML source via page.content() (the SSR output)
    const html = await page.content();

    // Assert: HTML source contains the post title text
    expect(html).toContain(POST1_TITLE);

    // Assert: HTML source contains rendered Markdown elements
    expect(html).toContain('<strong>');
    expect(html).toContain('<a ');
  });

  // ── Test 5 ────────────────────────────────────────────────────────────────
  test('5. Non-existent blog post returns 404', async ({ page }) => {
    const response = await page.goto(`${BLOG_BASE}/does-not-exist`);

    // Next.js notFound() typically returns a 404 status
    expect(response?.status()).toBe(404);
  });
});
