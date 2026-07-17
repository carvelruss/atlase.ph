import { type Page, expect } from '@playwright/test';

export const ADMIN = { email: 'e2e-owner@atlase.ph', password: 'e2e-supersecret-123' };

/**
 * Ensure an admin session exists, then land on the dashboard. Works whether the
 * store is freshly seeded (first-run setup) or already has an administrator.
 */
export async function ensureAdmin(page: Page): Promise<void> {
  const status = await page.request.get('/api/auth/admin/session');
  const body = await status.json();
  if (body?.data?.setupRequired) {
    await page.request.post('/api/auth/admin/setup', {
      data: { name: 'E2E Owner', email: ADMIN.email, password: ADMIN.password },
    });
  }
  await page.goto('/admin/login');
  // If already authenticated the guard redirects to /admin.
  if (page.url().includes('/admin/login')) {
    await page.getByLabel('Email').fill(ADMIN.email);
    await page.getByLabel('Password').fill(ADMIN.password);
    await page.getByRole('button', { name: /sign in/i }).click();
  }
  await expect(page).toHaveURL(/\/admin(\/)?$/);
}
