import { test, expect } from '@playwright/test';

// Requires a migrated + seeded local database (npm run db:migrate:local && db:seed:local).
test.describe('Storefront: browse → cart → COD checkout', () => {
  test('a guest can add a product to the cart and complete a COD order', async ({ page }) => {
    await page.goto('/shop');
    await expect(page.getByRole('heading', { name: 'Shop' })).toBeVisible();

    // Open the first product.
    await page.locator('a[href^="/products/"]').first().click();
    await expect(page).toHaveURL(/\/products\//);

    // Add to cart and go to the cart.
    await page.getByRole('button', { name: 'Add to cart' }).click();
    await page.goto('/cart');
    await expect(page.getByRole('heading', { name: 'Your cart' })).toBeVisible();

    // Proceed to checkout and fill the form.
    await page.getByRole('button', { name: /proceed to checkout/i }).click();
    await expect(page).toHaveURL(/\/checkout$/);

    await page.getByLabel('Email').fill('e2e-buyer@example.com');
    await page.getByLabel('Phone').fill('+63 917 000 1111');
    await page.getByLabel('First name').fill('Test');
    await page.getByLabel('Last name').fill('Buyer');
    await page.getByLabel('Address', { exact: true }).fill('1 Test Street');
    await page.getByLabel('City').fill('Makati');

    // COD is selected by default; accept terms and place the order.
    await page.getByLabel(/agree to the terms/i).check();
    await page.getByRole('button', { name: /place order/i }).click();

    // Confirmation.
    await expect(page).toHaveURL(/\/checkout\/success$/);
    await expect(page.getByRole('heading', { name: /thank you/i })).toBeVisible();
  });

  test('an unknown product slug shows a not-found state', async ({ page }) => {
    await page.goto('/products/this-does-not-exist');
    await expect(page.getByText(/product not found/i)).toBeVisible();
  });
});
