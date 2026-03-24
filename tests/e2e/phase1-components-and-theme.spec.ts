import { test, expect } from '@playwright/test';

const DEMO_URL = 'http://demo.localhost:3000/';
const NOT_FOUND_URL = 'http://demo.localhost:3000/nonexistent-page';

// Phase 1 seeded theme values (from src/lib/db/seeds/phase-1.ts)
const THEME_PRIMARY = '#2563EB';
const THEME_SECONDARY = '#7C3AED';

test.describe('Phase 1 — component rendering and theming', () => {
  test('All layout components render', async ({ page }) => {
    await page.goto(DEMO_URL);

    // Section wrapper element
    await expect(page.locator('section').first()).toBeVisible();

    // Container with max-width styling
    const hasContainer = await page.evaluate(() =>
      Array.from(document.querySelectorAll('div')).some(
        (el) => (el as HTMLElement).style.maxWidth !== '',
      ),
    );
    expect(hasContainer).toBe(true);

    // Grid with child elements in columns
    const hasGrid = await page.evaluate(() =>
      Array.from(document.querySelectorAll('div')).some(
        (el) => (el as HTMLElement).style.display === 'grid',
      ),
    );
    expect(hasGrid).toBe(true);

    // Row with flex layout
    const hasRow = await page.evaluate(() =>
      Array.from(document.querySelectorAll('div')).some(
        (el) =>
          (el as HTMLElement).style.display === 'flex' &&
          (el as HTMLElement).style.flexDirection === 'row',
      ),
    );
    expect(hasRow).toBe(true);

    // Column element inside a Row (flex-grow set by numeric span)
    const hasColumn = await page.evaluate(() =>
      Array.from(document.querySelectorAll('div')).some(
        (el) => (el as HTMLElement).style.flexGrow !== '',
      ),
    );
    expect(hasColumn).toBe(true);

    // Spacer (empty div with explicit height)
    const hasSpacer = await page.evaluate(() =>
      Array.from(document.querySelectorAll('div')).some(
        (el) =>
          (el as HTMLElement).style.height !== '' &&
          el.children.length === 0 &&
          (el.textContent ?? '').trim() === '',
      ),
    );
    expect(hasSpacer).toBe(true);
  });

  test('All content components render', async ({ page }) => {
    await page.goto(DEMO_URL);

    // Heading element with expected text
    await expect(
      page.getByRole('heading', { name: 'Welcome to Demo Business' }),
    ).toBeVisible();

    // Text/paragraph element with expected text
    await expect(
      page.locator('p').filter({ hasText: 'all-in-one platform' }).first(),
    ).toBeVisible();

    // Image element with src and alt attributes (Card uses a standard <img>)
    const cardImg = page.locator('img[alt="Lightning Fast"]');
    await expect(cardImg).toBeVisible();
    expect(await cardImg.getAttribute('src')).toBeTruthy();

    // Button <a> element with href and visible label
    const button = page.locator('a').filter({ hasText: 'Get Started' }).first();
    await expect(button).toBeVisible();
    expect(await button.getAttribute('href')).toBeTruthy();

    // Link element with href and text
    const learnMoreLink = page
      .locator('a')
      .filter({ hasText: 'Learn more' })
      .first();
    await expect(learnMoreLink).toBeVisible();
    expect(await learnMoreLink.getAttribute('href')).toBeTruthy();

    // Icon (SVG element rendered by the Icon component)
    await expect(page.locator('svg').first()).toBeVisible();

    // List with <li> items
    await expect(page.locator('ul li').first()).toBeVisible();

    // Card wrapper with title
    await expect(
      page.getByRole('heading', { name: 'Lightning Fast' }),
    ).toBeVisible();

    // <header> with logo image and nav links
    const header = page.locator('header');
    await expect(header).toBeVisible();
    await expect(header.locator('img[alt="Logo"]')).toBeVisible();
    await expect(header.locator('nav a').first()).toBeVisible();

    // <nav> with links to pages
    const nav = page.locator('nav').first();
    await expect(nav).toBeVisible();
    await expect(nav.locator('a').first()).toBeVisible();

    // <footer> with copyright and links
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
    await expect(
      footer.locator('p').filter({ hasText: '© 2024 Demo Business' }),
    ).toBeVisible();
    await expect(footer.locator('a').first()).toBeVisible();
  });

  test('Theme CSS variables are applied', async ({ page }) => {
    await page.goto(DEMO_URL);

    const cssVars = await page.evaluate(() => {
      const style = getComputedStyle(document.documentElement);
      return {
        colorPrimary: style.getPropertyValue('--color-primary').trim(),
        colorSecondary: style.getPropertyValue('--color-secondary').trim(),
        colorAccent: style.getPropertyValue('--color-accent').trim(),
        colorBackground: style.getPropertyValue('--color-background').trim(),
        colorText: style.getPropertyValue('--color-text').trim(),
        fontHeading: style.getPropertyValue('--font-heading').trim(),
        fontBody: style.getPropertyValue('--font-body').trim(),
      };
    });

    expect(cssVars.colorPrimary).toBe(THEME_PRIMARY);
    expect(cssVars.colorSecondary).toBe(THEME_SECONDARY);
    expect(cssVars.colorAccent).not.toBe('');
    expect(cssVars.colorBackground).not.toBe('');
    expect(cssVars.colorText).not.toBe('');
    expect(cssVars.fontHeading).not.toBe('');
    expect(cssVars.fontBody).not.toBe('');
  });

  test('Theme colors visually applied to components', async ({ page }) => {
    await page.goto(DEMO_URL);

    // Primary button background-color resolves to --color-primary (#2563EB = rgb(37, 99, 235))
    const primaryButton = page.locator('a').filter({ hasText: 'Get Started' }).first();
    await expect(primaryButton).toBeVisible();
    const buttonBg = await primaryButton.evaluate((el) =>
      getComputedStyle(el).backgroundColor,
    );
    expect(buttonBg).toBe('rgb(37, 99, 235)');

    // Heading color resolves to --color-text (#111827 = rgb(17, 24, 39))
    const heading = page.getByRole('heading', { name: 'Welcome to Demo Business' });
    await expect(heading).toBeVisible();
    const headingColor = await heading.evaluate((el) =>
      getComputedStyle(el).color,
    );
    expect(headingColor).toBe('rgb(17, 24, 39)');
  });

  test('SSR delivers full HTML', async ({ page }) => {
    await page.goto(DEMO_URL);

    const html = await page.content();

    // All visible text content must be present in the server-rendered HTML
    expect(html).toContain('Welcome to Demo Business');
    expect(html).toContain('Lightning Fast');
    expect(html).toContain('Fully Customisable');
    expect(html).toContain('About Us');
    expect(html).toContain('Our Services');
    expect(html).toContain('© 2024 Demo Business');
  });

  test('Themed 404 page renders with tenant branding', async ({ page }) => {
    const response = await page.goto(NOT_FOUND_URL);

    expect(response).not.toBeNull();
    expect(response?.status()).toBe(404);

    // Tenant logo displayed
    await expect(page.locator('img[alt="Demo Business"]')).toBeVisible();

    // "Page not found" heading
    await expect(
      page.getByRole('heading', { name: 'Page not found' }),
    ).toBeVisible();

    // Link to homepage present
    const homeLink = page.getByRole('link', { name: 'Go to homepage' });
    await expect(homeLink).toBeVisible();
    expect(await homeLink.getAttribute('href')).toBe('/');

    // Theme CSS variables applied
    const primaryColor = await page.evaluate(() =>
      getComputedStyle(document.documentElement)
        .getPropertyValue('--color-primary')
        .trim(),
    );
    expect(primaryColor).toBe(THEME_PRIMARY);
  });
});
