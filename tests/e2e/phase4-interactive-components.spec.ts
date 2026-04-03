import { test, expect } from '@playwright/test';

const DEMO_INTERACTIVE_URL = 'http://demo.localhost:3000/interactive-components';
const SEED_PAGE_API = 'http://localhost:3000/api/internal/seed-page';

const PAGE_SLUG = 'interactive-components';
const PAGE_TITLE = 'Interactive Components Demo';

const pageContent = {
  type: 'Section',
  props: {},
  children: [
    {
      type: 'Accordion',
      props: {
        allowMultiple: false,
        items: [
          { title: 'Accordion Item 1', content: 'Content for accordion item 1' },
          { title: 'Accordion Item 2', content: 'Content for accordion item 2' },
          { title: 'Accordion Item 3', content: 'Content for accordion item 3' },
        ],
      },
    },
    {
      type: 'Tabs',
      props: {
        defaultTab: 0,
        tabs: [
          { label: 'Tab One', content: 'Tab one content' },
          { label: 'Tab Two', content: 'Tab two content' },
        ],
      },
    },
    {
      type: 'Carousel',
      props: {
        autoplay: false,
        interval: 3000,
        slides: [
          { image: 'https://placehold.co/800x400?text=Slide+1', alt: 'Slide 1' },
          { image: 'https://placehold.co/800x400?text=Slide+2', alt: 'Slide 2' },
        ],
      },
    },
    {
      type: 'Modal',
      props: {
        trigger: { label: 'Open Modal' },
      },
      children: [
        { type: 'Heading', props: { level: 2, text: 'Modal Title' } },
        { type: 'Text', props: { content: 'Modal body content.' } },
      ],
    },
  ],
};

test.describe('Phase 4 — interactive components', () => {
  // Upsert the demo page containing all four interactive components before any test runs.
  test.beforeAll(async ({ request }) => {
    const res = await request.post(SEED_PAGE_API, {
      data: {
        tenantSlug: 'demo',
        slug: PAGE_SLUG,
        title: PAGE_TITLE,
        content: pageContent,
        published: true,
      },
    });
    expect(res.ok()).toBeTruthy();
  });

  // ─── 1. Accordion ────────────────────────────────────────────────────────────

  test('Accordion — SSR and interaction', async ({ page }) => {
    await page.goto(DEMO_INTERACTIVE_URL);

    // All item titles visible (buttons are rendered on SSR)
    await expect(page.getByRole('button', { name: 'Accordion Item 1' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accordion Item 2' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Accordion Item 3' })).toBeVisible();

    // Content is collapsed initially
    await expect(page.getByText('Content for accordion item 1')).not.toBeVisible();

    // Click first title → content becomes visible
    await page.getByRole('button', { name: 'Accordion Item 1' }).click();
    await expect(page.getByText('Content for accordion item 1')).toBeVisible();

    // allowMultiple=false: clicking second title collapses the first
    await page.getByRole('button', { name: 'Accordion Item 2' }).click();
    await expect(page.getByText('Content for accordion item 2')).toBeVisible();
    await expect(page.getByText('Content for accordion item 1')).not.toBeVisible();
  });

  // ─── 2. Tabs ─────────────────────────────────────────────────────────────────

  test('Tabs — SSR and interaction', async ({ page }) => {
    await page.goto(DEMO_INTERACTIVE_URL);

    // All tab labels visible
    await expect(page.getByRole('tab', { name: 'Tab One' })).toBeVisible();
    await expect(page.getByRole('tab', { name: 'Tab Two' })).toBeVisible();

    // First tab content visible; second tab content hidden
    await expect(page.getByText('Tab one content')).toBeVisible();
    await expect(page.getByText('Tab two content')).not.toBeVisible();

    // Click second tab → second content visible, first hidden
    await page.getByRole('tab', { name: 'Tab Two' }).click();
    await expect(page.getByText('Tab two content')).toBeVisible();
    await expect(page.getByText('Tab one content')).not.toBeVisible();
  });

  // ─── 3. Carousel ─────────────────────────────────────────────────────────────

  test('Carousel — SSR and interaction', async ({ page }) => {
    await page.goto(DEMO_INTERACTIVE_URL);

    // Carousel renders only the active slide's <img>, so non-active slides are absent from the DOM.
    // First slide visible; second slide not in DOM yet
    await expect(page.locator('img[alt="Slide 1"]')).toBeVisible();
    await expect(page.locator('img[alt="Slide 2"]')).toBeHidden();

    // Click "next" → second slide rendered and visible, first slide removed from DOM
    await page.getByRole('button', { name: 'Next slide' }).click();
    await expect(page.locator('img[alt="Slide 2"]')).toBeVisible();
    await expect(page.locator('img[alt="Slide 1"]')).toBeHidden();

    // Click "prev" → first slide visible again
    await page.getByRole('button', { name: 'Previous slide' }).click();
    await expect(page.locator('img[alt="Slide 1"]')).toBeVisible();
  });

  // ─── 4. Modal ────────────────────────────────────────────────────────────────

  test('Modal — SSR and interaction', async ({ page }) => {
    await page.goto(DEMO_INTERACTIVE_URL);

    // Trigger button visible; dialog overlay hidden
    await expect(page.getByRole('button', { name: 'Open Modal' })).toBeVisible();
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Click trigger → overlay appears with modal content
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();
    await expect(page.getByText('Modal Title')).toBeVisible();

    // Press Escape → modal closes
    await page.keyboard.press('Escape');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();

    // Click trigger again → modal opens
    await page.getByRole('button', { name: 'Open Modal' }).click();
    await expect(page.locator('[role="dialog"]')).toBeVisible();

    // Click the overlay backdrop to close.
    // dispatchEvent fires the click handler directly on the dialog element,
    // bypassing the inner content div's stopPropagation so the modal closes.
    await page.locator('[role="dialog"]').dispatchEvent('click');
    await expect(page.locator('[role="dialog"]')).not.toBeVisible();
  });

  // ─── 5. SSR verification ─────────────────────────────────────────────────────

  test('SSR verification — raw HTML contains component content', async ({ request }) => {
    const response = await request.get(DEMO_INTERACTIVE_URL);
    expect(response.ok()).toBeTruthy();
    const html = await response.text();

    // Accordion item titles present in server-rendered HTML
    expect(html).toContain('Accordion Item 1');
    expect(html).toContain('Accordion Item 2');

    // First tab content present in server-rendered HTML
    expect(html).toContain('Tab one content');

    // First slide image src present in server-rendered HTML
    expect(html).toContain('Slide+1');

    // Modal trigger button label present in server-rendered HTML
    expect(html).toContain('Open Modal');
  });
});
