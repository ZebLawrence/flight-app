import { test, expect } from '@playwright/test';

test('home page loads', async ({ page }) => {
  const response = await page.goto('http://localhost:3000/');
  expect(response?.status()).toBe(200);
  await expect(page.getByRole('heading', { name: 'Internal Test Tenant' })).toBeVisible();
});
