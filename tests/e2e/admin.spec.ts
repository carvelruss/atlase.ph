import { test, expect } from '@playwright/test';
import { ensureAdmin } from './helpers';

test.describe('Admin', () => {
  test('unauthenticated users are redirected away from the admin dashboard', async ({ page }) => {
    await page.goto('/admin');
    await expect(page).toHaveURL(/\/admin\/(login|setup)/);
  });

  test('the admin API rejects unauthenticated requests', async ({ page }) => {
    const res = await page.request.get('/api/admin/products');
    expect(res.status()).toBe(401);
  });

  test('an admin can sign in and see the dashboard', async ({ page }) => {
    await ensureAdmin(page);
    await expect(page.getByRole('heading', { name: /business overview/i })).toBeVisible();
  });

  test('an admin can create a product that appears on the storefront', async ({ page }) => {
    await ensureAdmin(page);
    await page.goto('/admin/products/new');

    const name = `E2E Widget ${Date.now()}`;
    await page.getByLabel('Product name').fill(name);
    // Set a price.
    await page.getByLabel('Price').first().fill('123.00');
    // Set status to Active.
    await page.getByRole('combobox').filter({ hasText: /draft|active|archived/i }).first().selectOption('active');
    await page.getByRole('button', { name: /save product/i }).click();
    await expect(page.getByText(/product (created|saved)/i)).toBeVisible();

    // It should be searchable in the storefront.
    await page.goto(`/search?q=${encodeURIComponent('E2E Widget')}`);
    await expect(page.getByText(name)).toBeVisible({ timeout: 10_000 });
  });
});
