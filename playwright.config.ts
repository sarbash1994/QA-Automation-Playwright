import { defineConfig, devices } from '@playwright/test';
import { ENV } from './src/config/env';

/**
 * Two projects:
 *  - "api"  → pure request-context tests (no browser). Fast, deterministic.
 *  - "e2e"  → browser UI journeys (Chromium).
 *
 * The X-Access-Key gate applies to every /api/* call (UI and API alike), so it
 * is injected via `extraHTTPHeaders` at the context level. In the browser this
 * transparently attaches the header to the fetch/XHR calls the app makes,
 * which is exactly what makes the SPA work under automation.
 */
export default defineConfig({
  testDir: './tests',
  /**
   * The application enforces a strict limiter on /api/auth/* (40 requests per
   * 900s). Running serially with a single worker keeps the whole suite within
   * that budget by reusing worker-scoped shared fixtures. The framework itself
   * is parallel-ready (fixtures are worker-scoped) should the limit be relaxed.
   */
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  timeout: 90_000,
  expect: { timeout: 10_000 },

  reporter: process.env.CI
    ? [['html', { open: 'never' }], ['list'], ['github']]
    : [['html', { open: 'never' }], ['list']],

  use: {
    baseURL: ENV.baseURL,
    extraHTTPHeaders: {
      'X-Access-Key': ENV.accessKey,
    },
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },

  projects: [
    {
      name: 'api',
      testDir: './tests/api',
    },
    {
      name: 'e2e',
      testDir: './tests/e2e',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
