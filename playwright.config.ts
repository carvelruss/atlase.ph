import { defineConfig, devices } from '@playwright/test';

const PORT = 8788;
const BASE_URL = process.env.E2E_BASE_URL ?? `http://localhost:${PORT}`;

// End-to-end tests run against the full stack (SPA + Pages Functions + local D1)
// served by `wrangler pages dev`. Set E2E_BASE_URL to test a deployed preview instead.
export default defineConfig({
  testDir: './tests/e2e',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: 'html',
  use: {
    baseURL: BASE_URL,
    trace: 'on-first-retry',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        command: 'npm run dev',
        url: BASE_URL,
        reuseExistingServer: !process.env.CI,
        timeout: 120_000,
      },
});
