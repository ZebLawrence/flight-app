import { test, expect } from '@playwright/test';

// Production Docker stack URLs (Caddy listens on port 80).
// These tests must run while `docker compose -f docker-compose.prod.yml up`
// is active and the database has been seeded.
const PROD_BASE = 'http://demo.localhost';
const ADMIN_LOGIN_URL = `${PROD_BASE}/admin/login`;
const HEALTH_URL = `${PROD_BASE}/api/health`;
const SITEMAP_URL = `${PROD_BASE}/sitemap.xml`;

test.describe('Phase 6.4.3 — production Docker smoke tests', () => {
  // ── Test 1 ─────────────────────────────────────────────────────────────────
  test('1. Tenant site renders via production build', async ({ page }) => {
    const response = await page.goto(PROD_BASE);

    // Assert: page responds with HTTP 200
    expect(response).not.toBeNull();
    expect(response?.status()).toBe(200);

    // Assert: seeded heading is visible on the rendered page
    await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible();

    // Assert: HTML source contains SSR content (present in raw server response,
    // not injected later by client-side JavaScript)
    const rawResponse = await page.request.get(PROD_BASE);
    const rawHtml = await rawResponse.text();
    expect(rawHtml).toContain('Hello World');
  });

  // ── Test 2 ─────────────────────────────────────────────────────────────────
  test('2. Admin panel is accessible', async ({ page }) => {
    await page.goto(ADMIN_LOGIN_URL);

    // Assert: login form fields are visible
    await expect(page.locator('#email')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(page.getByRole('button', { name: /sign in|log in|login/i })).toBeVisible();
  });

  // ── Test 3 ─────────────────────────────────────────────────────────────────
  test('3. Health endpoint responds', async ({ request }) => {
    const response = await request.get(HEALTH_URL);

    // Assert: response status is 200
    expect(response.status()).toBe(200);

    // Assert: response body contains { status: 'ok' }
    const body = await response.json() as { status: string };
    expect(body).toMatchObject({ status: 'ok' });
  });

  // ── Test 4 ─────────────────────────────────────────────────────────────────
  test('4. Sitemap is accessible', async ({ request }) => {
    const response = await request.get(SITEMAP_URL);

    // Assert: response status is 200
    expect(response.status()).toBe(200);

    // Assert: body contains the XML sitemap root element
    const body = await response.text();
    expect(body).toContain('<urlset');

    // Assert: at least one <url> entry exists
    const urlMatches = [...body.matchAll(/<url>([\s\S]*?)<\/url>/g)];
    expect(urlMatches.length).toBeGreaterThan(0);
  });
});
