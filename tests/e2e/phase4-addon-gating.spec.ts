import { test, expect } from '@playwright/test';

const DEMO_URL = 'http://demo.localhost:3000';
const BASE_URL = 'http://localhost:3000';
const ADDON_API = `${BASE_URL}/api/internal/addon-config`;
const SEED_PAGE_API = `${BASE_URL}/api/internal/seed-page`;

const FORMS_SLUG = 'addon-gating-forms';
const GALLERY_SLUG = 'addon-gating-gallery';
const CALENDAR_SLUG = 'addon-gating-calendar';

const FORMS_URL = `${DEMO_URL}/${FORMS_SLUG}`;
const GALLERY_URL = `${DEMO_URL}/${GALLERY_SLUG}`;
const CALENDAR_URL = `${DEMO_URL}/${CALENDAR_SLUG}`;

// ─── Page content definitions ────────────────────────────────────────────────

const formsPageContent = {
  type: 'Section',
  props: {},
  children: [
    { type: 'Heading', props: { level: 1, text: 'Contact Us' } },
    {
      type: 'FormBuilder',
      props: {
        formId: 'contact',
        fields: [
          { name: 'name', label: 'Name', type: 'text', required: true },
          { name: 'email', label: 'Email', type: 'email', required: true },
          { name: 'message', label: 'Message', type: 'textarea', required: true },
        ],
        submitLabel: 'Send Message',
        successMessage: 'Thank you for your message!',
      },
    },
  ],
};

const galleryPageContent = {
  type: 'Section',
  props: {},
  children: [
    { type: 'Heading', props: { level: 1, text: 'Our Gallery' } },
    {
      type: 'Lightbox',
      props: {
        images: [
          { src: 'https://placehold.co/800x600?text=Image+1', alt: 'Image 1' },
          { src: 'https://placehold.co/800x600?text=Image+2', alt: 'Image 2' },
          { src: 'https://placehold.co/800x600?text=Image+3', alt: 'Image 3' },
        ],
      },
    },
  ],
};

const calendarPageContent = {
  type: 'Section',
  props: {},
  children: [
    {
      type: 'CalendarWidget',
      props: {
        title: 'Book an Appointment',
        description: 'Schedule a meeting with us.',
        bookingUrl: 'https://calendly.com/demo',
      },
    },
  ],
};

// ─── Forms addon gating ───────────────────────────────────────────────────────

test.describe('Phase 4 — forms addon gating', () => {
  test.beforeAll(async ({ request }) => {
    // Seed the forms test page.
    const pageRes = await request.post(SEED_PAGE_API, {
      data: {
        tenantSlug: 'demo',
        slug: FORMS_SLUG,
        title: 'Contact Us',
        content: formsPageContent,
        published: true,
      },
    });
    expect(pageRes.ok()).toBeTruthy();
  });

  test.beforeEach(async ({ request }) => {
    // Reset: forms addon enabled with a form definition that the API can validate.
    const res = await request.post(ADDON_API, {
      data: {
        tenantSlug: 'demo',
        addonKey: 'forms',
        config: {
          forms: {
            contact: {
              fields: [
                { name: 'name', required: true },
                { name: 'email', required: true },
                { name: 'message', required: true },
              ],
            },
          },
        },
        enabled: true,
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  // ─── Test 1: Form renders when addon is enabled ───────────────────────────

  test('Form renders when addon is enabled', async ({ page }) => {
    const response = await page.goto(FORMS_URL);

    expect(response).not.toBeNull();
    expect(response?.status()).toBe(200);

    // Heading always visible
    await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible();

    // Form fields are rendered
    await expect(page.getByLabel('Name')).toBeVisible();
    await expect(page.getByLabel('Email')).toBeVisible();
    await expect(page.getByLabel('Message')).toBeVisible();

    // Submit button is visible
    await expect(page.getByRole('button', { name: 'Send Message' })).toBeVisible();
  });

  // ─── Test 2: Form submission works ───────────────────────────────────────

  test('Form submission works', async ({ page }) => {
    await page.goto(FORMS_URL);

    // Fill all required fields
    await page.getByLabel('Name').fill('Jane Doe');
    await page.getByLabel('Email').fill('jane@example.com');
    await page.getByLabel('Message').fill('Hello, I would like more information.');

    // Submit the form
    await page.getByRole('button', { name: 'Send Message' }).click();

    // Success message appears
    await expect(page.getByText('Thank you for your message!')).toBeVisible();

    // No error alert
    await expect(page.locator('[role="alert"]')).not.toBeVisible();
  });

  // ─── Test 3: Form validation rejects empty required fields ───────────────

  test('Form validation rejects empty required fields', async ({ page }) => {
    await page.goto(FORMS_URL);

    // Do NOT fill any fields — click submit immediately
    await page.getByRole('button', { name: 'Send Message' }).click();

    // Success message must not appear
    await expect(page.getByText('Thank you for your message!')).not.toBeVisible();

    // Submit button still visible (form not replaced by success state)
    await expect(page.getByRole('button', { name: 'Send Message' })).toBeVisible();
  });

  // ─── Test 4: Disable addon — component disappears ────────────────────────

  test('Disable addon — form disappears, other components still render', async ({ request, page }) => {
    // Disable the forms addon.
    const disableRes = await request.post(ADDON_API, {
      data: {
        tenantSlug: 'demo',
        addonKey: 'forms',
        config: {},
        enabled: false,
      },
    });
    expect(disableRes.ok()).toBeTruthy();

    await page.goto(FORMS_URL);

    // Form component is NOT rendered
    await expect(page.getByRole('button', { name: 'Send Message' })).not.toBeVisible();
    await expect(page.getByLabel('Name')).not.toBeVisible();

    // Non-addon heading component still renders
    await expect(page.getByRole('heading', { name: 'Contact Us' })).toBeVisible();
  });

  // ─── Test 5: Re-enable addon — component reappears ───────────────────────

  test('Re-enable addon — form reappears', async ({ request, page }) => {
    // First disable
    const disableRes = await request.post(ADDON_API, {
      data: {
        tenantSlug: 'demo',
        addonKey: 'forms',
        config: {},
        enabled: false,
      },
    });
    expect(disableRes.ok()).toBeTruthy();

    // Verify form is gone
    await page.goto(FORMS_URL);
    await expect(page.getByRole('button', { name: 'Send Message' })).not.toBeVisible();

    // Re-enable
    const enableRes = await request.post(ADDON_API, {
      data: {
        tenantSlug: 'demo',
        addonKey: 'forms',
        config: {
          forms: {
            contact: {
              fields: [
                { name: 'name', required: true },
                { name: 'email', required: true },
                { name: 'message', required: true },
              ],
            },
          },
        },
        enabled: true,
      },
    });
    expect(enableRes.ok()).toBeTruthy();

    // Navigate again — form should be back
    await page.goto(FORMS_URL);
    await expect(page.getByRole('button', { name: 'Send Message' })).toBeVisible();
    await expect(page.getByLabel('Name')).toBeVisible();
  });
});

// ─── Gallery addon gating ─────────────────────────────────────────────────────

test.describe('Phase 4 — gallery addon gating', () => {
  test.beforeAll(async ({ request }) => {
    // Seed the gallery test page.
    const pageRes = await request.post(SEED_PAGE_API, {
      data: {
        tenantSlug: 'demo',
        slug: GALLERY_SLUG,
        title: 'Our Gallery',
        content: galleryPageContent,
        published: true,
      },
    });
    expect(pageRes.ok()).toBeTruthy();
  });

  test.beforeEach(async ({ request }) => {
    // Reset: gallery addon enabled.
    const res = await request.post(ADDON_API, {
      data: {
        tenantSlug: 'demo',
        addonKey: 'gallery',
        config: {},
        enabled: true,
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  // ─── Test 6: Gallery addon gating ────────────────────────────────────────

  test('Gallery addon gating — enable, disable, re-enable', async ({ request, page }) => {
    // Gallery is already enabled (by beforeEach). Navigate and verify images visible.
    await page.goto(GALLERY_URL);

    await expect(
      page.getByRole('button', { name: 'Open lightbox for Image 1' }),
    ).toBeVisible();
    await expect(
      page.getByRole('button', { name: 'Open lightbox for Image 2' }),
    ).toBeVisible();

    // Disable gallery
    const disableRes = await request.post(ADDON_API, {
      data: {
        tenantSlug: 'demo',
        addonKey: 'gallery',
        config: {},
        enabled: false,
      },
    });
    expect(disableRes.ok()).toBeTruthy();

    await page.goto(GALLERY_URL);

    // Images gone — lightbox thumbnails not rendered
    await expect(
      page.getByRole('button', { name: 'Open lightbox for Image 1' }),
    ).not.toBeVisible();

    // Re-enable gallery
    const enableRes = await request.post(ADDON_API, {
      data: {
        tenantSlug: 'demo',
        addonKey: 'gallery',
        config: {},
        enabled: true,
      },
    });
    expect(enableRes.ok()).toBeTruthy();

    await page.goto(GALLERY_URL);

    // Images back
    await expect(
      page.getByRole('button', { name: 'Open lightbox for Image 1' }),
    ).toBeVisible();
  });

  // ─── Test 7: Gallery lightbox interaction ────────────────────────────────

  test('Gallery lightbox interaction', async ({ page }) => {
    await page.goto(GALLERY_URL);

    // Lightbox dialog is not visible initially
    const lightbox = page.locator('[role="dialog"][aria-label="Lightbox"]');
    await expect(lightbox).not.toBeVisible();

    // Click the first thumbnail → lightbox opens
    await page.getByRole('button', { name: 'Open lightbox for Image 1' }).click();
    await expect(lightbox).toBeVisible();

    // Full-size image for Image 1 is shown inside the lightbox
    const lightboxImage = lightbox.locator('img');
    await expect(lightboxImage).toHaveAttribute('alt', 'Image 1');

    // Click next → Image 2 is shown
    await page.getByRole('button', { name: 'Next image' }).click();
    await expect(lightboxImage).toHaveAttribute('alt', 'Image 2');

    // Press Escape → lightbox closes
    await page.keyboard.press('Escape');
    await expect(lightbox).not.toBeVisible();
  });
});

// ─── Calendar addon gating ────────────────────────────────────────────────────

test.describe('Phase 4 — calendar addon gating', () => {
  test.beforeAll(async ({ request }) => {
    // Seed the calendar test page.
    const pageRes = await request.post(SEED_PAGE_API, {
      data: {
        tenantSlug: 'demo',
        slug: CALENDAR_SLUG,
        title: 'Book an Appointment',
        content: calendarPageContent,
        published: true,
      },
    });
    expect(pageRes.ok()).toBeTruthy();
  });

  test.beforeEach(async ({ request }) => {
    // Reset: calendar addon enabled.
    const res = await request.post(ADDON_API, {
      data: {
        tenantSlug: 'demo',
        addonKey: 'calendar',
        config: {},
        enabled: true,
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  // ─── Test 8: Calendar addon gating ───────────────────────────────────────

  test('Calendar addon gating — enable, disable, re-enable', async ({ request, page }) => {
    // Calendar is already enabled (by beforeEach). Navigate and verify widget visible.
    await page.goto(CALENDAR_URL);

    // Widget title visible
    await expect(page.getByRole('heading', { name: 'Book an Appointment' })).toBeVisible();

    // Booking iframe is present (booking link)
    await expect(page.locator('iframe[title="Book an Appointment"]')).toBeAttached();

    // Disable calendar
    const disableRes = await request.post(ADDON_API, {
      data: {
        tenantSlug: 'demo',
        addonKey: 'calendar',
        config: {},
        enabled: false,
      },
    });
    expect(disableRes.ok()).toBeTruthy();

    await page.goto(CALENDAR_URL);

    // Widget gone
    await expect(page.getByRole('heading', { name: 'Book an Appointment' })).not.toBeVisible();
    await expect(page.locator('iframe[title="Book an Appointment"]')).not.toBeAttached();

    // Re-enable calendar
    const enableRes = await request.post(ADDON_API, {
      data: {
        tenantSlug: 'demo',
        addonKey: 'calendar',
        config: {},
        enabled: true,
      },
    });
    expect(enableRes.ok()).toBeTruthy();

    await page.goto(CALENDAR_URL);

    // Widget back
    await expect(page.getByRole('heading', { name: 'Book an Appointment' })).toBeVisible();
    await expect(page.locator('iframe[title="Book an Appointment"]')).toBeAttached();
  });
});
