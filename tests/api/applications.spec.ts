import { test, expect } from '../../src/fixtures/test-fixtures';
import { ENV } from '../../src/config/env';
import { uniqueName } from '../../src/utils/data';

/**
 * POST /api/applications is the only public endpoint — it works WITHOUT an
 * X-Access-Key and returns the bootstrap credentials documented in the task.
 *
 * It is protected by a very strict limiter (8 requests / hour) and each success
 * provisions a real admin account, so this suite is OPT-IN: run it with
 * RUN_APPLICATION_TESTS=1 only when you specifically want to exercise it.
 */
const run = process.env.RUN_APPLICATION_TESTS === '1';

test.describe('Applications (bootstrap) API @api', () => {
  test.skip(!run, 'Opt-in: set RUN_APPLICATION_TESTS=1 (endpoint allows only 8 requests/hour).');

  test('issues an access key and admin credentials without an X-Access-Key', async ({ playwright }) => {
    const noKey = await playwright.request.newContext({
      baseURL: ENV.baseURL,
      extraHTTPHeaders: { 'X-Access-Key': '' },
    });
    const res = await noKey.post('/api/applications', { data: { fullName: uniqueName('Applicant') } });
    expect(res.ok()).toBeTruthy();

    const body = await res.json();
    expect(body.accessKey).toMatch(/^[a-f0-9]+\.[a-f0-9]+$/i); // "<identifier>.<secret>"
    expect(body.adminEmail).toContain('@');
    expect(body.adminPassword).toBeTruthy();

    await noKey.dispose();
  });

  test('rejects an application without a full name', async ({ playwright }) => {
    const noKey = await playwright.request.newContext({
      baseURL: ENV.baseURL,
      extraHTTPHeaders: { 'X-Access-Key': '' },
    });
    const res = await noKey.post('/api/applications', { data: { fullName: '' } });
    expect(res.status()).toBeGreaterThanOrEqual(400);
    await noKey.dispose();
  });
});
