import { test, expect } from '../../src/fixtures/test-fixtures';
import { ENV } from '../../src/config/env';
import { buildUser, uniqueEmail } from '../../src/utils/data';

test.describe('Auth API @api', () => {
  test('registers a new user (201)', async ({ api }) => {
    const res = await api.register(buildUser());
    expect(res.status()).toBe(201);
    expect((await res.json()).message).toBe('User registered successfully');
  });

  test('rejects duplicate email registration', async ({ api, sharedUser }) => {
    const res = await api.register(buildUser({ email: sharedUser.credentials.email }));
    expect(res.ok()).toBeFalsy();
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('logs in with valid credentials and returns a user token', async ({ api, sharedUser }) => {
    const res = await api.login(sharedUser.credentials.email, sharedUser.credentials.password);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.token).toBeTruthy();
    expect(body.role).toBe('user');
  });

  test('admin login grants access to the admin overview', async ({ adminApi }) => {
    // The adminApi fixture already asserts a successful admin login + admin role.
    // Admins use /api/admin/overview (the user /api/profile is 403 for them).
    const res = await adminApi.adminOverview({ page: 1, limit: 1 });
    expect(res.ok()).toBeTruthy();
    expect((await res.json()).applicationId).toBe(ENV.applicationId);
  });

  test('rejects login with a wrong password (400 Invalid credentials)', async ({ api, sharedUser }) => {
    const res = await api.login(sharedUser.credentials.email, 'definitely-wrong');
    expect(res.status()).toBe(400);
    expect((await res.json()).message).toBe('Invalid credentials');
  });

  test('rejects login for a non-existent user', async ({ api }) => {
    const res = await api.login(uniqueEmail('ghost'), 'whatever123');
    expect(res.status()).toBeGreaterThanOrEqual(400);
  });

  test('logout succeeds for an authenticated user', async ({ sharedUser }) => {
    // JWTs are stateless, so logging the shared user out does not affect later tests.
    const res = await sharedUser.api.logout();
    expect(res.status()).toBe(200);
    expect((await res.json()).message).toMatch(/logout/i);
  });
});
