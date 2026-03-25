import { test, expect, type Page } from '@playwright/test';

const ADMIN_EMAIL = process.env.ADMIN_EMAIL ?? 'admin@example.com';
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;

if (!ADMIN_PASSWORD) {
  throw new Error(
    'ADMIN_PASSWORD environment variable must be set to run blog admin E2E tests.',
  );
}

const MARKDOWN_CONTENT =
  '# Hello\n\nThis is **bold** and a [link](https://example.com).\n\n- Item 1\n- Item 2';

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

// Run all tests serially so each test can rely on state created by the previous
// one (create → edit → verify preview → delete workflow).
test.describe.configure({ mode: 'serial' });

test.describe('Phase 3 — blog admin workflow', () => {
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

  test('1. Blog posts list shows empty state or seeded posts', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}/blog`);

    // Assert: blog list UI is visible
    await expect(page.getByRole('heading', { name: 'Blog Posts' })).toBeVisible();

    // Assert: "New post" button/link is visible
    await expect(page.getByRole('link', { name: 'New post' })).toBeVisible();
  });

  test('2. Create a new blog post', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}/blog`);

    // Click "New post"
    await page.getByRole('link', { name: 'New post' }).click();
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+\/blog\/new/);

    // Fill in title
    await page.fill('#post-title', 'My First Post');

    // Assert: slug auto-populates with "my-first-post"
    await expect(page.locator('#post-slug')).toHaveValue('my-first-post');

    // Fill in excerpt, author, tags
    await page.fill('#post-excerpt', 'An introductory post about our journey.');
    await page.fill('#post-author', 'Jane Doe');
    await page.fill('#post-tags', 'intro, blog');

    // Enter Markdown content
    await page.fill('#post-content', MARKDOWN_CONTENT);

    // Toggle published ON
    await page.check('#post-published');

    // Click "Create post" and submit
    await page.click('button[type="submit"]');

    // Assert: redirected to blog list
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+\/blog$/);

    // Assert: "My First Post" appears in list with "Published" status
    await expect(page.getByText('My First Post')).toBeVisible();
    const row = page.getByRole('row', { name: /My First Post/ });
    await expect(row.getByText('Published')).toBeVisible();
  });

  test('3. Edit a blog post', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}/blog`);

    // Click "My First Post" row to open the editor
    const row = page.getByRole('row', { name: /My First Post/ });
    await row.click();

    // Assert: editor loads with existing content
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+\/blog\/[^/]+$/);
    await expect(page.getByRole('heading', { name: 'Edit post' })).toBeVisible();
    await expect(page.locator('#post-title')).toHaveValue('My First Post');

    // Change title to "My Updated Post" and save
    await page.fill('#post-title', 'My Updated Post');
    await page.click('button[type="submit"]');

    // Assert: success — redirected to blog list and updated title is visible
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+\/blog$/);
    await expect(page.getByText('My Updated Post')).toBeVisible();
  });

  test('4. Live preview shows rendered Markdown', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}/blog`);

    // Open "My Updated Post" editor
    const row = page.getByRole('row', { name: /My Updated Post/ });
    await row.click();
    await expect(page).toHaveURL(/\/admin\/tenants\/[^/]+\/blog\/[^/]+$/);

    // The preview panel is identified by its data-testid attribute
    const previewPanel = page.getByTestId('preview-panel');
    await expect(previewPanel).toBeVisible();

    // Assert: preview contains <h1> with "Hello"
    await expect(previewPanel.locator('h1')).toContainText('Hello');

    // Assert: preview contains <strong>bold</strong>
    await expect(previewPanel.locator('strong')).toBeVisible();

    // Assert: preview contains a <a> link
    await expect(previewPanel.locator('a')).toBeVisible();
  });

  test('5. Delete a blog post', async ({ page }) => {
    await page.goto(`/admin/tenants/${demoTenantId}/blog`);

    // Assert "My Updated Post" is visible before deleting
    await expect(page.getByText('My Updated Post')).toBeVisible();

    // Register a one-time dialog handler before clicking (handles the confirm dialog)
    page.once('dialog', (dialog) => dialog.accept());

    // Click the Delete button in the row
    const row = page.getByRole('row', { name: /My Updated Post/ });
    await row.getByRole('button', { name: 'Delete' }).click();

    // Assert: post removed from list
    await expect(page.getByText('My Updated Post')).not.toBeVisible();
  });
});
