import { test, expect } from '@playwright/test';

test.describe('Phase 0 tenant page rendering', () => {
  test('Valid tenant homepage renders SSR content', async ({ page }) => {
    const response = await page.goto('http://demo.localhost:3000/');

    expect(response).not.toBeNull();
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { name: 'Hello World' })).toBeVisible();
    await expect(page.getByText('Welcome to demo business')).toBeVisible();

    const html = await page.content();
    expect(html).toContain('Hello World');
  });

  test('Unknown tenant returns 404 with not-found page', async ({ page }) => {
    const response = await page.goto('http://nonexistent.localhost:3000/');

    expect(response).not.toBeNull();
    expect(response?.status()).toBe(404);

    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await expect(page.getByText('Hello World')).not.toBeVisible();
  });

  test('Unknown page slug returns 404 with not-found page', async ({ page }) => {
    const response = await page.goto('http://demo.localhost:3000/does-not-exist');

    expect(response).not.toBeNull();
    expect(response?.status()).toBe(404);

    await expect(page.getByRole('heading', { name: 'Page not found' })).toBeVisible();
    await expect(page.getByRole('link', { name: 'Go to homepage' })).toBeVisible();
  });

  test('Bare localhost resolves to internal test tenant', async ({ page }) => {
    const response = await page.goto('http://localhost:3000/');

    expect(response).not.toBeNull();
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { name: 'Internal Test Tenant' })).toBeVisible();
    await expect(page.getByText('Welcome to internal test tenant')).toBeVisible();
  });

  test('127.0.0.1 resolves to internal test tenant', async ({ page }) => {
    const response = await page.goto('http://127.0.0.1:3000/');

    expect(response).not.toBeNull();
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { name: 'Internal Test Tenant' })).toBeVisible();
    await expect(page.getByText('Welcome to internal test tenant')).toBeVisible();
  });

  test('internal.localhost resolves to internal test tenant', async ({ page }) => {
    const response = await page.goto('http://internal.localhost:3000/');

    expect(response).not.toBeNull();
    expect(response?.status()).toBe(200);

    await expect(page.getByRole('heading', { name: 'Internal Test Tenant' })).toBeVisible();
    await expect(page.getByText('Welcome to internal test tenant')).toBeVisible();
  });
});
