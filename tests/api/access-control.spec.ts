import { test, expect } from '../../src/fixtures/test-fixtures';
import { ENV, analyticsBasicAuthHeader } from '../../src/config/env';

/**
 * Cross-cutting authorization rules:
 *  - X-Access-Key gates every /api/* call except POST /api/applications.
 *  - GET /api/analytics/events additionally requires HTTP Basic auth.
 */
test.describe('Access control @api', () => {
  test('protected endpoint without X-Access-Key is rejected (401)', async ({ playwright }) => {
    // newContext inherits config use.extraHTTPHeaders, so blank the key to
    // genuinely represent a request with no access key.
    const noKey = await playwright.request.newContext({
      baseURL: ENV.baseURL,
      extraHTTPHeaders: { 'X-Access-Key': '' },
    });
    const res = await noKey.post('/api/auth/login', {
      data: { email: ENV.adminEmail, password: ENV.adminPassword },
    });
    expect(res.status()).toBe(401);
    await noKey.dispose();
  });

  test('protected endpoint with an invalid X-Access-Key is rejected (401)', async ({ playwright }) => {
    const badKey = await playwright.request.newContext({
      baseURL: ENV.baseURL,
      extraHTTPHeaders: { 'X-Access-Key': 'deadbeef.invalidsecret' },
    });
    const res = await badKey.get('/api/profile');
    expect(res.status()).toBe(401);
    await badKey.dispose();
  });

  test('GET /api/profile without a Bearer token is rejected (401 Access denied)', async ({ api }) => {
    const res = await api.getProfile(); // X-Access-Key present, but no user token
    expect(res.status()).toBe(401);
    expect((await res.json()).message).toBe('Access denied');
  });

  test('analytics events require Basic auth in addition to X-Access-Key (401)', async ({ analytics }) => {
    const res = await analytics.rawEvents(); // X-Access-Key only
    expect(res.status()).toBe(401);
  });

  test('analytics events require X-Access-Key in addition to Basic auth (401)', async ({ playwright }) => {
    const noKey = await playwright.request.newContext({
      baseURL: ENV.baseURL,
      extraHTTPHeaders: { 'X-Access-Key': '' },
    });
    const res = await noKey.get('/api/analytics/events', {
      headers: { Authorization: analyticsBasicAuthHeader() },
    });
    expect(res.status()).toBe(401);
    await noKey.dispose();
  });

  test('analytics events succeed with both schemes', async ({ analytics }) => {
    const res = await analytics.rawEvents({ Authorization: analyticsBasicAuthHeader() });
    expect(res.status()).toBe(200);
    expect(Array.isArray(await res.json())).toBeTruthy();
  });
});
