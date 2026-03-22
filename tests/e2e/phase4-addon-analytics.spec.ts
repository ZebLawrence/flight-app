import { test, expect } from '@playwright/test';

const DEMO_URL = 'http://demo.localhost:3000/';
const ADDON_API = 'http://localhost:3000/api/internal/addon-config';

const GA4_TRACKING_ID = 'G-DEMO1234567';
const PLAUSIBLE_DOMAIN = 'demo.localhost';

test.describe('Phase 4 analytics addon', () => {
  // Reset demo tenant to GA4 analytics enabled before each test so tests are isolated.
  test.beforeEach(async ({ request }) => {
    const res = await request.post(ADDON_API, {
      data: {
        tenantSlug: 'demo',
        addonKey: 'analytics',
        config: { provider: 'ga4', trackingId: GA4_TRACKING_ID },
        enabled: true,
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  test('Analytics script injected when addon is enabled (GA4)', async ({ page }) => {
    const response = await page.goto(DEMO_URL);

    expect(response).not.toBeNull();
    expect(response?.status()).toBe(200);

    const html = await page.content();
    expect(html).toContain(GA4_TRACKING_ID);
    expect(html).toContain('gtag');
    expect(html).toContain('googletagmanager.com');
  });

  test('Analytics script absent when addon is disabled', async ({ request, page }) => {
    // Disable the analytics addon for the demo tenant.
    const disableRes = await request.post(ADDON_API, {
      data: {
        tenantSlug: 'demo',
        addonKey: 'analytics',
        config: { provider: 'ga4', trackingId: GA4_TRACKING_ID },
        enabled: false,
      },
    });
    expect(disableRes.ok()).toBeTruthy();

    const response = await page.goto(DEMO_URL);

    expect(response).not.toBeNull();
    expect(response?.status()).toBe(200);

    const html = await page.content();
    expect(html).not.toContain(GA4_TRACKING_ID);
    expect(html).not.toContain('googletagmanager.com');
  });

  test('Switching analytics provider to Plausible updates the script', async ({ request, page }) => {
    // Switch the demo tenant from GA4 to Plausible.
    const switchRes = await request.post(ADDON_API, {
      data: {
        tenantSlug: 'demo',
        addonKey: 'analytics',
        config: { provider: 'plausible', domain: PLAUSIBLE_DOMAIN },
        enabled: true,
      },
    });
    expect(switchRes.ok()).toBeTruthy();

    const response = await page.goto(DEMO_URL);

    expect(response).not.toBeNull();
    expect(response?.status()).toBe(200);

    const html = await page.content();
    // Plausible script must be present.
    expect(html).toContain('plausible.io');
    expect(html).toContain(PLAUSIBLE_DOMAIN);
    // GA4 script must not be present.
    expect(html).not.toContain(GA4_TRACKING_ID);
    expect(html).not.toContain('googletagmanager.com');
  });
});
